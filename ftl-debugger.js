"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug_ctrl = exports.wrapFnWithDebugger = exports.DebuggerStopException = void 0;

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
    this.ui.innerHTML = `<button id="debug.continue">▶️</button><button id="debug.stop">⏹️</button>`
    this.elements = {}
    this.focusable = []
    this.play_btn = this.ui.querySelector('#debug\\.continue')
    this.stop_btn = this.ui.querySelector('#debug\\.stop')
    this.play_btn.addEventListener('click', () => { this.ui.dispatchEvent(new Event('play')) })
    this.stop_btn.addEventListener('click', () => {this.ui.dispatchEvent(new Event('stop'))})
  }

  show() {
    this.ui.style.display = 'block'
    this.play_btn.focus()
    return new Promise(resolve => {
      this.ui.addEventListener('stop', () => {
        resolve(false)
      }, { once: true })
      this.ui.addEventListener('play', () => {
        resolve(true)
      }, { once: true })
    })
  }

  hide() {
    this.ui.style.display = 'none'
  }
}


exports.debug_ctrl = new DebugControl()

class DebuggerFn extends ftl.WrapperFn {

  constructor(fn) {
    super(fn)
  }

  adjustSize(canvas, x, y, options) {
    return [this._wrapped._wrapped.adjustSize(canvas, x, y, options), 10]
  }

  adjustLocation(canvas, x, y, options) {

  }

  render(canvas, options) {
    return this._wrapped._wrapped.render(canvas)
  }

  showInput(val) {
    console.log(val)
  }

  showOutput(val) {
    console.log(val)
  }

  async apply(input, context) {
    this.showInput(input)
    let r = await exports.debug_ctrl.show()
    if (r === false) {
      throw new exports.DebuggerStopException()
    }

    const res = await super.apply(input, context)
    this.showOutput(res)
    return res
  }
}

class WrapperDebugger extends DebuggerFn {
    constructor(fn) {
        super(fn)
        fn._wrapped = exports.wrapFnWithDebugger(fn._wrapped)
    }
}

class TupleDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
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
    this.height = y_start - y - options.margin
    return [this.width, this.height]
  }

  render(canvas, options) {
    this._wrapped._fns.map(f => {
      f.render(canvas)
    })

    drawSquereBrakets(canvas, this.x, this.y, this.width, this.height, options)
  }
}

class PipeDebugger extends DebuggerFn {
  constructor(fn) {
    super(fn)
    fn._fns = fn._fns.map(f => exports.wrapFnWithDebugger(f))
  }

  adjustSize(canvas, x, y, options) {
    let margins = options.margin * 2
    this.x = x
    this.y = y
    let x_start = x
    this.hight = 0
    this._wrapped._fns.map(f => {
      let [w, h] = f.adjustSize(canvas, x_start, y, options)
      x_start += w + 40
      if (h > this.hight) this.hight = h
    })
    this.width += x_start - x - 40
    this.height +=  options.margin * 2
    return [this.width, this.height]
  }

  render(canvas, options) {

    let last = this._wrapped._fns[0]
    last.render(canvas)
    for (var i = 1; i < this._wrapped._fns.length; i++) {
      canvas.fillText('\u2192', last.x + last.width, last.y + (last.hight + options.text_height) / 2)
      this._wrapped._fns[0].render(canvas, options)
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
    return new wrap(fn)
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
    canvas.fillText(this._wrapped.toString(), this.x, this.y + 10)
  }
}

FnDebuggerMap['ExecutableFn'] = WrapperDebugger
FnDebuggerMap['ConstFn'] = ConstDebugger
FnDebuggerMap['TupleFn'] = TupleDebugger
FnDebuggerMap['PipeFn'] = PipeDebugger

