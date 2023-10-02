"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug_ctrl = exports.wrapFnWithDebugger = exports.DebuggerStopException = exports.setCanvas = void 0;

let canvas
let debugCanvas
let debugStage = ''

function setCanvas(val) {
  canvas = val
}

function setDebugCanvas(val) {
  debugCanvas = val
}

exports.setCanvas = setCanvas
exports.setDebugCanvas = setDebugCanvas

const DebugState = {
  Continue: 'Continue',
  Paused: 'Pause',
  StepInto: 'Step Into',
  StepOut: 'Step Out',
  StepOver: 'Step Over',
  Stop: 'Stop'
}

function drawSquereBrakets(x, y, width, height, options) {
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

function drawRect(fn, color) {
  const style = canvas.strokeStyle
  canvas.strokeStyle = color
  strokeRect(fn.x, fn.y, fn.width, fn.height)
  canvas.strokeStyle = style
}

function strokeRect(x, y, w, h) {
  canvas.strokeRect(x, y, w, h)
}

function strokeDebugRect(x, y, w, h, color, lineWidth=1) {
  debugCanvas.save()
  debugCanvas.strokeStyle = color
  debugCanvas.lineWidth = lineWidth
  debugCanvas.strokeRect(x, y, w, h)
  debugCanvas.restore()
}

function clearDebugRect(x, y, w, h, lineWidth=1) {
  debugCanvas.clearRect(x - lineWidth, y - lineWidth, w + 2 * lineWidth, h + 2 * lineWidth)
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

    this.ui.innerHTML =
`<button id="debug.continue" title='${DebugState.Continue}'>⏩</button>
<button id="debug.pause" title='${DebugState.Pause}' style='display:hidden'>⏸️</button>
<button id="debug.stepover" title='${DebugState.StepOver}'>▶️</button>
<button id="debug.stepinto" title='${DebugState.StepInto}'>🔽</button>
<button id="debug.stepout" title='${DebugState.StepOut}' disabled>🔼</button>
<button id="debug.stop" title='${DebugState.Stop}'>⏹️</button>`

    this.elements = {}
    this.focusable = []
    this.continue_btn = this.ui.querySelector('#debug\\.continue')
    this.pause_btn = this.ui.querySelector('#debug\\.pause')
    this.stepover_btn = this.ui.querySelector('#debug\\.stepover')
    this.stepinto_btn = this.ui.querySelector('#debug\\.stepinto')
    this.stepout_btn = this.ui.querySelector('#debug\\.stepout')
    this.stop_btn = this.ui.querySelector('#debug\\.stop')
    this.ui.addEventListener('click', (e) => {
      if (e.target.nodeName != 'BUTTON')
        return
      this.enableAllButtons(false)
      this.clickedButton = e.target
      if (this.clickedButton == this.continue_btn) {
        this.clickedButton.style.display = 'none'
        this.pause_btn.style.display = 'inline'
        this.enableAllButtons(false)
        this.pause_btn.style.display = 'inline'
        this.pause_btn.enabled = true
      } else if (this.clickedButton == this.pause_btn) {
        this.clickedButton.style.display = 'none'
        this.continue_btn.style.display = 'inline'
      }
      debugStage = this.clickedButton.title
      this.ui.dispatchEvent(new Event('debug'))
    })
  }

  // Enable or disable all but stop buttons.
  enableAllButtons(enabled) {
    var disabled = !enabled
    for (let btn of this.ui.children) {
      if (btn.id != 'debug.stop' && btn.disabled == enabled)
        btn.disabled = disabled
    }
  }

  reset() {
    debugStage = ''
    this.continue_btn.style.display = 'inline'
    this.pause_btn.style.display = 'none'
  }

  show(pause) {
    if (debugStage == DebugState.Continue) {
      this.reset()
    }

    if (debugStage == DebugState.Stop) {
      return new Promise(resolve => setTimeout(() => {
        resolve('Stop')
      }, 1))
    } else {
      this.enableAllButtons(true)
      return new Promise(resolve => {
        this.ui.addEventListener('debug', () => {
          resolve(debugStage)
        }, { once: true })
      })
    }
  }
}

exports.debug_ctrl = new DebugControl()

/**
 * This is the root of all debugging wrapper for an Fn.
 *
 * In descendent classes, any wrapped fns are all referenced as contained.
 */
class DebuggerFn extends ftl.ProxyFn {

  constructor(fn) {
    super(fn)
    this.options = {
      show_input: false,
      show_output: true
    }
    this.isBreakpoint = false
    this.debugPause = true
  }

  paintBreakPoint() {
    if (this.isBreakpoint)
      strokeDebugRect(this.x, this.y, this.width, this.height, '#357EC7', 3)
  }

  setBreakpoint() {
    this.isBreakpoint = !this.isBreakpoint
    if (this.isBreakpoint)
      this.paintBreakPoint()
    else
      clearDebugRect(this.x, this.y, this.width, this.height, 3)
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
    return [this.width, this.height] = this.proxied._wrapped.adjustSize(canvas, x, y, options)
  }

  adjustLocation(deltaX, deltaY, options) {
    this.x += deltaX
    this.y += deltaY
    if (this.proxied && this.proxied._wrapped)
      this.proxied._wrapped.adjustLocation(deltaX, deltaY, options)
  }

  render(canvas, options) {
    this.proxied._wrapped.render(canvas, options)
  }

  // Find the Fn that is clicked.
  selectFn(x, y) {
    if (x >= this.x && x <= this.x + this.width
       && y >= this.y && y <= this.y + this.height) {
      var selected
      if (this.contained) {
        if (Array.isArray(this.contained)) {
          for (var item of this.contained) {
            selected = item.selectFn(x, y)
            if (selected)
              break
          }
        } else {
          selected = this.contained.selectFn(x, y)
        }
      }
      return selected || this
    }
    else
      return null
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

  showDebugRect() {
    strokeDebugRect(this.x, this.y, this.width, this.height, 'red')
  }

  eraseDebugRect() {
    clearDebugRect(this.x, this.y, this.width, this.height)
    this.paintBreakPoint()
  }

  async apply(input, context) {
    let debugPause = debugStage != DebugState.Continue && this.debugPause || this.isBreakpoint
    if (this.options.show_input)
      this.showInput(input, this.x, this.y)
    var drawDebugIndicator = debugPause && !(this instanceof PauseNoShowDebugger)

    if (drawDebugIndicator) {
      this.showDebugRect()
    }

    if (debugPause) {
      let r = await exports.debug_ctrl.show()
      if (r === DebugState.Stop) {
        throw new exports.DebuggerStopException()
      }
    }

    const res = await super.apply(input, context)
    if (drawDebugIndicator) {
      this.eraseDebugRect()
    }

    if (this.options.show_output)
      this.showOutput(res, this.x + this.width, this.y)
    return res
  }
}

class WrapperDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    this.options.show_output = false
    this.debugPause = false
    this.contained = fn._wrapped = exports.wrapFnWithDebugger(fn._wrapped)
  }
}

class ArrayInitializerDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    this.options.show_output = false
    this.contained = fn._values = fn._values.map(f => exports.wrapFnWithDebugger(f))
  }

  adjustSize(canvas, x, y, options) {
    this.x = x
    this.y = y
    let [w, h] = [0, 0]
    w += canvas.measureText('[').width
    for (let i = 0; i < this.proxied._values.length; i++) {
      if (i > 0) {
        w += canvas.measureText(', ').width
      }
      let v = this.proxied._values[i]
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
    for (let v of this.proxied._values) {
      v.adjustLocation(deltaX, deltaY, options)
    }
  }

  render(canvas, options) {
    canvas.fillText('[', this.x, this.y + options.text_height)
    let last_p
    for (let i = 0; i < this.proxied._values.length; i++) {
      if (i > 0) {
        canvas.fillText(', ', last_p.x + last_p.width, last_p.y + options.text_height)
      }
      last_p = this.proxied._values[i]
      last_p.render(canvas, options)
    }
    canvas.fillText(']', last_p.x + last_p.width, last_p.y + options.text_height)
  }
}

class TupleDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    this.options.show_output = false
    this.contained = fn._fns = fn._fns.map(f => exports.wrapFnWithDebugger(f))
    this.debugPause = false
  }

  adjustSize(canvas, x, y, options) {
    let margins = options.margin * 2
    this.x = x
    this.y = y
    let y_start = y + options.margin
    this.width = 0
    this.contained.map(f => {
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
    this.proxied._fns.forEach(elm => {
      elm.adjustLocation(deltaX, deltaY, options)
    })
  }

  render(canvas, options) {
    this.proxied._fns.map(f => {
      f.render(canvas, options)
    })
    // strokeRect(this.x, this.y, this.width, this.height)
    drawSquereBrakets(this.x, this.y, this.width, this.height, options)
  }
}

class PipeDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    this.options.show_output = false
    this.contained = fn._fns = fn._fns.map(f => exports.wrapFnWithDebugger(f))
    this.debugPause = false
  }

  adjustSize(canvas, x, y, options) {
    let margins = options.margin * 2
    this.x = x
    this.y = y
    let x_start = x
    this.width = this.height = 0
    this.contained.map(f => {
      let [w, h] = f.adjustSize(canvas, x_start, y, options)
      x_start += w + 30
      this.height = Math.max(h, this.height)
    })
    this.width += x_start - x - 30
    this.height += margins
    return [this.width, this.height]
  }

  adjustLocation(deltaX, deltaY, options) {
    this.proxied._fns.forEach(elm => {
      let delta_y = (this.height - elm.height)/2 - options.margin
      elm.adjustLocation(deltaX, deltaY + delta_y, options)
    })
  }

  render(canvas, options) {

    let last = this.proxied._fns[0]
    last.render(canvas, options)
    for (var i = 1; i < this.proxied._fns.length; i++) {
      canvas.font = options.large_font
      canvas.fillText('\u2192', last.x + last.width, last.y + (last.height + options.text_height) / 2)
      canvas.font = options.font
      last = this.proxied._fns[i]
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

    this.contained = fn.f = exports.wrapFnWithDebugger(fn.f)
    fn.params = fn.params.map(f => exports.wrapFnWithDebugger(f))
  }

  adjustSize(canvas, x, y, options) {
    this.x = x
    this.y = y
    let [w, h] = this._proxied.f.adjustSize(canvas, x, y, options)
    w += canvas.measureText('(').width
    for (let i = 0; i < this._proxied.params.length; i++) {
      if (i > 0) {
        w += canvas.measureText(', ').width
      }
      let p = this._proxied.params[i]
      let [sw, sh] = p.adjustSize(canvas, x + w, y, options)
      w += sw
      h = Math.max(h, sh)
    }
    w += canvas.measureText(')').width

    // adjust f's y
    this._proxied.f.y += (h - this._proxied.f.height) / 2
    return [this.width, this.height] = [w, h]
  }

  adjustLocation(deltaX, deltaY, options) {
    this.x += deltaX
    this.y += deltaY
    this._proxied.f.adjustLocation(deltaX, deltaY, options)
    for (let p of this._proxied.params) {
      p.adjustLocation(deltaX, deltaY, options)
    }
  }

  render(canvas, options) {
    this._proxied.f.render(canvas, options)
    canvas.fillText('(', this._proxied.f.x + this._proxied.f.width, this._proxied.f.y + options.text_height)
    let last_p
    for (let i = 0; i < this._proxied.params.length; i++) {
      if (i > 0) {
        canvas.fillText(', ', last_p.x + last_p.width, last_p.y + options.text_height)
      }
      last_p = this._proxied.params[i]
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
    const metrix = canvas.measureText(this.proxied.toString())

    this.x = x
    this.y = y
    this.width = metrix.width + margins
    this.height = options.text_height + margins
    return [this.width, this.height]
  }

  render(canvas, options) {
    //strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this.proxied.toString(), this.x + options.margin, this.y + options.text_height + options.margin)
  }
}

class DebugPauseDebugger extends WrapperDebugger {
  constructor(fn) {
    super(fn)
    this.debugPause = true
  }
}

class PauseNoShowDebugger extends WrapperDebugger {
  constructor(fn) {
    super(fn)
    this.debugPause = true
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
    const metrix = canvas.measureText(this.proxied._name)

    this.x = x
    this.y = y
    this.width = metrix.width + margins
    this.height = options.text_height + margins
    return [this.width, this.height]
  }

  render(canvas, options) {
    strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this.proxied._name, this.x + options.margin, this.y + options.text_height + options.margin)
  }
}

class RefDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    this.options.show_output = true
  }

  adjustSize(canvas, x, y, options) {
    const margins = options.margin * 2
    const metrix = canvas.measureText(this.proxied.name)

    this.x = x
    this.y = y
    this.width = metrix.width + margins
    this.height = options.text_height + margins
    return [this.width, this.height]
  }

  render(canvas, options) {
    strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this.proxied.name, this.x + options.margin, this.y + options.text_height + options.margin)
  }
}

class NamedExprDebugger extends WrapperDebugger {
  constructor(fn) {
    super(fn)
  }

  get name() { return this._proxied.name }

  hasRef() {
    return this.proxied.hasRef()
  }

  adjustSize(canvas, x, y, options) {
    this.x = x
    this.y = y
    const metrix = canvas.measureText(this.proxied.name + ': ')
    let [w, h] = this.proxied.wrapped.adjustSize(canvas, x + metrix.width, y, options)
    this.width = w + metrix.width
    this.height = h
    return [this.width, this.height]
  }

  render(canvas, options) {
    canvas.fillText(this.proxied.name + ': ', this.x, this.y + options.text_height + options.margin)
    this.proxied.wrapped.render(canvas, options)
  }
}

class TurnaryOpDebugger extends FunctionDebugger {
  constructor(fn) {
    super(fn)
  }

  adjustSize(canvas, x, y, options) {
    const margins = options.margin * 2
    const metrix = canvas.measureText(this.proxied._name)

    this.x = x
    this.y = y
    this.width = metrix.width + margins
    this.height = options.text_height + margins
    return [this.width, this.height]
  }

  render(canvas, options) {
    strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this.proxied._name, this.x + options.margin, this.y + options.text_height + options.margin)
  }
}

FnDebuggerMap['ArrayInitializerFn'] = ArrayInitializerDebugger
FnDebuggerMap['ConstFn'] = ConstDebugger
FnDebuggerMap['ExecutableFn'] = PauseNoShowDebugger
FnDebuggerMap['ExprRefFn'] = ExprRefDebugger
FnDebuggerMap['FunctionFn'] = FunctionDebugger
FnDebuggerMap['NamedExprFn'] = NamedExprDebugger
FnDebuggerMap['NativeFunctionFn'] = FunctionDebugger
FnDebuggerMap['NativeFunctionFn.? :'] = TurnaryOpDebugger
FnDebuggerMap['PipeFn'] = PipeDebugger
FnDebuggerMap['RefFn'] = RefDebugger
FnDebuggerMap['TupleFn'] = TupleDebugger
FnDebuggerMap['CallExprFn']= CallExprDebugger
