"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug_ctrl = exports.wrapFnWithDebugger = exports.DebuggerStopException = void 0;

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

  adjustSize(canvas, x, y) {
    return [this._wrapped._wrapped.adjustSize(canvas, x, y), 10]
  }

  render(canvas) {
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

  adjustSize(canvas, x, y) {
    this.x = x
    this.y = y
    let y_start = y
    this.width = 0
    this._wrapped._fns.map(f => {
      let [w, h] = f.adjustSize(canvas, x, y_start)
      y_start += h
      if (w > this.width) this.width = w
    })
    this.height = y_start
    return [this.width, this.height]
  }

  render(canvas) {
    this._wrapped._fns.map(f => {
      f.render(canvas)
    })

    canvas.beginPath()
    canvas.moveTo(this.x + 5, this.y)
    canvas.lineTo(this.x, this.y)
    canvas.lineTo(this.x, this.y + this.height)
    canvas.lineTo(this.x + 5, this.y + this.height)
    canvas.stroke()

    canvas.beginPath()
    canvas.moveTo(this.x + this.width - 5, this.y)
    canvas.lineTo(this.x + this.width, this.y)
    canvas.lineTo(this.x + this.width, this.y + this.height)
    canvas.lineTo(this.x + this.width - 5, this.y + this.height)
    canvas.stroke()
  }
/*
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
*/
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

    adjustSize(canvas, x, y) {
      this.x = x
      this.y = y
      console.log(canvas.font)
      const val = this._wrapped.toString()
      const metrix = canvas.measureText(this._wrapped.toString())
      this.width = metrix.width + 8
      this.height = 10
      return [this.width, this.height]
    }

  render(canvas) {
    canvas.strokeRect(this.x, this.y, this.width, this.height)
    canvas.fillText(this._wrapped.toString(), this.x, this.y + 10)
  }
}

FnDebuggerMap['ExecutableFn'] = WrapperDebugger
FnDebuggerMap['ConstFn'] = ConstDebugger
FnDebuggerMap['TupleFn'] = TupleDebugger
