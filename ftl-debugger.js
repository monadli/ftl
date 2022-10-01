"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug_ctrl = exports.wrapFnWithDebugger = exports.DebuggerStopException = exports.setCanvas = void 0;

let canvas

function setCanvas(val) {
  canvas = val
}
exports.setCanvas = setCanvas

function drawSquereBrakets(canvas, x, y, width, height, options) {
  canvas.beginPath()
  canvas.moveTo(x + 6, y)
  canvas.lineTo(x, y)
  canvas.lineTo(x, y + height)
  canvas.lineTo(x + 6, y + height)
  canvas.stroke()

  canvas.beginPath()
  canvas.moveTo(x + width - 6, y)
  canvas.lineTo(x + width, y)
  canvas.lineTo(x + width, y + height)
  canvas.lineTo(x + width - 6, y + height)
  canvas.stroke()
}

exports.DebuggerStopException = class DebuggerStopException extends Error {
  constructor() {
    super()
  }
}

/**
 * This is the debug control ui with stop/continue buttons.
 */
class DebugControl {
  constructor() {
    this.ui = document.createElement('div');
    this.ui.innerHTML = `<button id="debug.continue" title='Continue'>⏩</button><button id="debug.stepover" title='Step Over'>▶️</button><button id="debug.stepinto" title='Step Into'>🔽</button><button id="debug.stepout" title='Step Out' disabled>🔼</button><button id="debug.stop" title='Stop'>⏹️</button>`
    this.elements = {}
    this.focusable = []
    this.continue_btn = this.ui.querySelector('#debug\\.continue')
    this.stepover_btn = this.ui.querySelector('#debug\\.stepover')
    this.stepinto_btn = this.ui.querySelector('#debug\\.stepinto')
    this.stepout_btn = this.ui.querySelector('#debug\\.stepout')
    this.stop_btn = this.ui.querySelector('#debug\\.stop')
    this.clickedButton = this.stepover_btn

    this.continue_btn.addEventListener('click', () => {
      if (this.continue_btn.title == 'Continue') {
        this.continue_btn.innerHTML = '⏸️'
        this.continue_btn.title = 'Pause'
      } else {
        this.continue_btn.innerHTML = '⏩'
        this.continue_btn.title = 'Continue'
      }
    })

    this.ui.addEventListener('click', (e) => {
      this.enableAllButtons(false)
      this.clickedButton = e.target
      this.ui.dispatchEvent(new Event('debug'))
    })
  }

  enableAllButtons(enabled) {
    var disabled = !enabled
    if (this.continue_btn.disabled == enabled)
      this.continue_btn.disabled = disabled
    if (this.stepover_btn.disabled == enabled)
      this.stepover_btn.disabled = disabled
    if (this.stepinto_btn.disabled == enabled)
      this.stepinto_btn.disabled = disabled
    if (this.stepout_btn.disabled == enabled)
      this.stepout_btn.disabled = disabled
    if (this.stop_btn.disabled == enabled)
      this.stop_btn.disabled = disabled
  }

  show() {
    if (this.clickedButton.title == 'Stop') {
      return new Promise(resolve => setTimeout(() => resolve('Stop'), 1))
    } else if (this.clickedButton.title == 'Pause') {
      this.stop_btn.disabled = false
      this.continue_btn.disabled = false
      return new Promise(resolve => setTimeout(() => resolve('Continue'), 5000))
    } else {
      this.enableAllButtons(true)
      return new Promise(resolve => {
        this.ui.addEventListener('debug', () => {
          resolve(this.clickedButton.title)
        }, { once: true })
      })
    }
  }
}

exports.debug_ctrl = new DebugControl()

class DebuggerFn extends ftl.WrapperFn {

  constructor(fn) {
    super(fn)
    this.options = {
      show_input: false,
      show_output: true
    }
  }

  /**
   * Adjust size based on provided canvas context,
   * x and y, and options.
   *
   * returns adjusted width and height.
   */
  adjustSize(canvas, x, y, options) {
    this.x = x
    this.y = y
    return [this.width, this.height] = this._wrapped._wrapped.adjustSize(canvas, x, y, options)
  }

  adjustLocation(deltaX, deltaY, options) {
    this.x += deltaX
    this.y += deltaY
    if (this._wrapped && this._wrapped._wrapped)
      this._wrapped._wrapped.adjustLocation(deltaX, deltaY, options)
  }

  render(canvas, options) {
    this._wrapped._wrapped.render(canvas, options)
  }

  showInput(val, x, y) {
    if (val != undefined) {
      val = val == null ? 'null' : val.toString()
      let metrix = canvas.measureText(val)
      let style = canvas.fillStyle
      canvas.fillStyle = 'red'
      canvas.fillText(val, x - metrix.width, y)
      canvas.fillStyle = style
    }
  }

  showOutput(val, x, y) {
    if (val != undefined) {
      if (typeof val == 'number') {
        val = Math.round(val * 100) / 100
      }
      val = val == null ? 'null' : val.toString()
      let metrix = canvas.measureText(val)
      let style = canvas.fillStyle
      canvas.fillStyle = 'red'
      canvas.fillText(val, x, y)
      canvas.fillStyle = style
    }
  }

  async apply(input, context) {
    if (this.options.show_input)
      this.showInput(input, this.x, this.y)
    let r = await exports.debug_ctrl.show()
    if (r === 'Stop') {
      throw new exports.DebuggerStopException()
    }

    const res = await super.apply(input, context)
    if (this.options.show_output)
      this.showOutput(res, this.x + this.width, this.y)
    return res
  }
}

class WrapperDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    this.options.show_output = false
    fn._wrapped = exports.wrapFnWithDebugger(fn._wrapped)
  }
}

class ArrayInitializerDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    fn._values = fn._values.map(f => exports.wrapFnWithDebugger(f))
  }

  adjustSize(canvas, x, y, options) {
    this.x = x
    this.y = y
    let [w, h] = [0, 0]
    w += canvas.measureText('[').width
    for (let i = 0; i < this._wrapped._values.length; i++) {
      if (i > 0) {
        w += canvas.measureText(', ').width
      }
      let v = this._wrapped._values[i]
      let [sw, sh] = v.adjustSize(canvas, x + w, y, options)
      w += sw
      h = Math.max(h, sh)
    }
    w += canvas.measureText(']').width
    return [this.width, this.height] = [w, h]
  }

  adjustLocation(deltaX, deltaY, options) {
    this.x += deltaX
    this.y += deltaY
    for (let v of this._wrapped._values) {
      v.adjustLocation(deltaX, deltaY, options)
    }
  }

  render(canvas, options) {
    canvas.fillText('[', this.x, this.y + options.text_height)
    let last_p
    for (let i = 0; i < this._wrapped._values.length; i++) {
      if (i > 0) {
        canvas.fillText(', ', last_p.x + last_p.width, last_p.y + options.text_height)
      }
      last_p = this._wrapped._values[i]
      last_p.render(canvas, options)
    }
    canvas.fillText(']', last_p.x + last_p.width, last_p.y + options.text_height)
  }
}

class TupleDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    this.options.show_output = false
    fn._fns = fn._fns.map(f => exports.wrapFnWithDebugger(f))
  }

  adjustSize(canvas, x, y, options) {
    let margins = options.margin * 2
    this.x = x
    this.y = y
    let y_start = y + options.margin
    this.width = 0
    this._wrapped._fns.map(f => {
      let [w, h] = f.adjustSize(canvas, x + options.margin, y_start, options)
      y_start += h + options.margin
      if (w > this.width) this.width = w
    })
    this.width += margins
    this.height = y_start - y
    return [this.width, this.height]
  }


  adjustLocation(deltaX, deltaY, options) {
    this.x += deltaX
    this.y += deltaY
    this._wrapped._fns.forEach(elm => {
      elm.adjustLocation(deltaX, deltaY, options)
    })
  }

  render(canvas, options) {
    this._wrapped._fns.map(f => {
      f.render(canvas, options)
    })
    canvas.strokeRect(this.x, this.y, this.width, this.height)
    drawSquereBrakets(canvas, this.x, this.y, this.width, this.height, options)
  }
}

class PipeDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    this.options.show_output = false
    fn._fns = fn._fns.map(f => exports.wrapFnWithDebugger(f))
  }

  adjustSize(canvas, x, y, options) {
    let margins = options.margin * 2
    this.x = x
    this.y = y
    let x_start = x
    this.width = this.height = 0
    this._wrapped._fns.map(f => {
      let [w, h] = f.adjustSize(canvas, x_start, y, options)
      x_start += w + 30
      this.height = Math.max(h, this.height)
    })
    this.width += x_start - x - 30
    this.height += margins
    return [this.width, this.height]
  }

  adjustLocation(deltaX, deltaY, options) {
    this._wrapped._fns.forEach(elm => {
      let delta_y = (this.height - elm.height)/2 - options.margin
      elm.adjustLocation(deltaX, deltaY + delta_y, options)
    })
  }

  render(canvas, options) {

    let last = this._wrapped._fns[0]
    last.render(canvas, options)
    for (var i = 1; i < this._wrapped._fns.length; i++) {
      canvas.font = options.large_font
      canvas.fillText('\u2192', last.x + last.width, last.y + (last.height + options.text_height) / 2)
      canvas.font = options.font
      last = this._wrapped._fns[i]
      last.render(canvas, options)
    }
  }
}

const FnDebuggerMap = {
}

function addFnDebugger(name, dbg) {
    FnDebuggerMap[name] = dbg
}

function getFnDebugger(name) {
    return FnDebuggerMap[name]
}

exports.wrapFnWithDebugger = function(fn) {
    let wrap = getFnDebugger(fn.typeName)
    if (!wrap)
      throw new Error(`No debugger found for "${fn.typeName}"!`)
    return new wrap(fn)
}

class CallExprDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)

    fn.f = exports.wrapFnWithDebugger(fn.f)
    fn.params = fn.params.map(f => exports.wrapFnWithDebugger(f))
  }

  adjustSize(canvas, x, y, options) {
    this.x = x
    this.y = y
    let [w, h] = this._wrapped.f.adjustSize(canvas, x, y, options)
    w += canvas.measureText('(').width
    for (let i = 0; i < this._wrapped.params.length; i++) {
      if (i > 0) {
        w += canvas.measureText(', ').width
      }
      let p = this._wrapped.params[i]
      let [sw, sh] = p.adjustSize(canvas, x + w, y, options)
      w += sw
      h = Math.max(h, sh)
    }
    w += canvas.measureText(')').width
    return [this.width, this.height] = [w, h]
  }

  adjustLocation(deltaX, deltaY, options) {
    this.x += deltaX
    this.y += deltaY
    this._wrapped.f.adjustLocation(deltaX, deltaY, options)
    for (let p of this._wrapped.params) {
      p.adjustLocation(deltaX, deltaY, options)
    }
  }

  render(canvas, options) {
    this._wrapped.f.render(canvas, options)
    canvas.fillText('(', this._wrapped.f.x + this._wrapped.f.width, this._wrapped.f.y + options.text_height)
    let last_p
    for (let i = 0; i < this._wrapped.params.length; i++) {
      if (i > 0) {
        canvas.fillText(', ', last_p.x + last_p.width, last_p.y + options.text_height)
      }
      last_p = this._wrapped.params[i]
      last_p.render(canvas, options)
    }
    canvas.fillText(')', last_p.x + last_p.width, last_p.y + options.text_height)
  }

}

class ConstDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
  }

  adjustSize(canvas, x, y, options) {
    const margins = options.margin * 2
    const metrix = canvas.measureText(this._wrapped.toString())

    this.x = x
    this.y = y
    this.width = metrix.width + margins
    this.height = options.text_height + margins
    return [this.width, this.height]
  }

  render(canvas, options) {
    canvas.strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this._wrapped.toString(), this.x + options.margin, this.y + options.text_height + options.margin)
  }
}

class ExprRefDebugger extends WrapperDebugger {
  constructor(fn) {
    super(fn)
  }
}

class FunctionDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
  }

  adjustSize(canvas, x, y, options) {
    const margins = options.margin * 2
    const metrix = canvas.measureText(this._wrapped._name)

    this.x = x
    this.y = y
    this.width = metrix.width + margins
    this.height = options.text_height + margins
    return [this.width, this.height]
  }

  render(canvas, options) {
    canvas.strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this._wrapped._name, this.x + options.margin, this.y + options.text_height + options.margin)
  }
}

class RefDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
  }

  adjustSize(canvas, x, y, options) {
    const margins = options.margin * 2
    const metrix = canvas.measureText(this._wrapped.name)

    this.x = x
    this.y = y
    this.width = metrix.width + margins
    this.height = options.text_height + margins
    return [this.width, this.height]
  }

  render(canvas, options) {
    canvas.strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this._wrapped.name, this.x + options.margin, this.y + options.text_height + options.margin)
  }
}

class NamedExprDebugger extends WrapperDebugger {
  constructor(fn) {
    super(fn)
  }

  adjustSize(canvas, x, y, options) {
    this.x = x
    this.y = y
    const metrix = canvas.measureText(this._wrapped.name + ': ')
    let [w, h] = this._wrapped._wrapped.adjustSize(canvas, x + metrix.width, y, options)
    this.width = w + metrix.width
    this.height = h
    return [this.width, this.height]
  }

  render(canvas, options) {
    canvas.fillText(this._wrapped.name + ': ', this.x, this.y + options.text_height + options.margin)
    this._wrapped._wrapped.render(canvas, options)
  }
}

class TurnaryOpDebugger extends FunctionDebugger {
  constructor(fn) {
    super(fn)
  }

  adjustSize(canvas, x, y, options) {
    const margins = options.margin * 2
    const metrix = canvas.measureText(this._wrapped._name)

    this.x = x
    this.y = y
    this.width = metrix.width + margins
    this.height = options.text_height + margins
    return [this.width, this.height]
  }

  render(canvas, options) {
    canvas.strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this._wrapped._name, this.x + options.margin, this.y + options.text_height + options.margin)
  }
}

FnDebuggerMap['ArrayInitializerFn'] = ArrayInitializerDebugger
FnDebuggerMap['ConstFn'] = ConstDebugger
FnDebuggerMap['ExecutableFn'] = WrapperDebugger
FnDebuggerMap['ExprRefFn'] = ExprRefDebugger
FnDebuggerMap['FunctionFn'] = FunctionDebugger
FnDebuggerMap['NamedExprFn'] = NamedExprDebugger
FnDebuggerMap['NativeFunctionFn'] = FunctionDebugger
FnDebuggerMap['NativeFunctionFn.? :'] = TurnaryOpDebugger
FnDebuggerMap['PipeFn'] = PipeDebugger
FnDebuggerMap['RefFn'] = RefDebugger
FnDebuggerMap['TupleFn'] = TupleDebugger
FnDebuggerMap['CallExprFn']= CallExprDebugger
