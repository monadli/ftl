"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug_ctrl = exports.wrapFnWithDebugger = void 0;
// from https://css-tricks.com/replace-javascript-dialogs-html-dialog-element/
/**
 * Dialog module.
 * @module dialog.js
 * @version 1.0.0
 * @summary 02-01-2022
 * @author Mads Stoumann
 * @description Custom versions of `alert`, `confirm` and `prompt`, using `<dialog>`
 */
/*
class Dialog {
    constructor(settings = {}) {
      this.settings = Object.assign(
      {
        accept: '▶️',
        bodyClass: 'dialog-open',
        cancel: '⏹️',
        dialogClass: '',
        message: '',
        soundAccept: '',
        soundOpen: '',
        template: '' },
  
      settings);
  
      this.init();
    }
  
    collectFormData(formData) {
      const object = {};
      formData.forEach((value, key) => {
        if (!Reflect.has(object, key)) {
          object[key] = value;
          return;
        }
        if (!Array.isArray(object[key])) {
          object[key] = [object[key]];
        }
        object[key].push(value);
      });
      return object;
    }
  
    getFocusable() {
      return [...this.dialog.querySelectorAll('button,[href],select,textarea,input:not([type="hidden"]),[tabindex]:not([tabindex="-1"])')];
    }
  
    init() {
      this.dialogSupported = typeof HTMLDialogElement === 'function';
      this.dialog = document.createElement('div');
      this.dialog.role = 'dialog';
      this.dialog.dataset.component = 'no-dialog'//this.dialogSupported ? 'dialog' : 'no-dialog';
      this.dialog.innerHTML = `
      <form method="dialog" data-ref="form">
        <!--fieldset data-ref="fieldset" role="document">
          <legend data-ref="message" id="${Math.round(Date.now()).toString(36)}"></legend>
          <div data-ref="template"></div>
        </fieldset-->
        <menu>
          <button${this.dialogSupported ? '' : ` type="button"`} data-ref="cancel" value="⏹️"></button>
          <button${this.dialogSupported ? '' : ` type="button"`} data-ref="accept" value="▶️"></button>
        </menu>
        <audio data-ref="soundAccept"></audio>
        <audio data-ref="soundOpen"></audio>
      </form>`;
  
      this.elements = {};
      this.focusable = [];
      this.dialog.querySelectorAll('[data-ref]').forEach(el => this.elements[el.dataset.ref] = el);
      //this.dialog.setAttribute('aria-labelledby', this.elements.message.id);
      this.elements.cancel.addEventListener('click', () => {this.dialog.dispatchEvent(new Event('cancel'));});
      this.dialog.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          if (!this.dialogSupported) e.preventDefault();
          this.elements.accept.dispatchEvent(new Event('click'));
        }
        if (e.key === 'Escape') this.dialog.dispatchEvent(new Event('cancel'));
        if (e.key === 'Tab') {
          e.preventDefault();
          const len = this.focusable.length - 1;
          let index = this.focusable.indexOf(e.target);
          index = e.shiftKey ? index - 1 : index + 1;
          if (index < 0) index = len;
          if (index > len) index = 0;
          this.focusable[index].focus();
        }
      });
      this.toggle();
    }
  
    open(settings = {}) {
      const dialog = Object.assign({}, this.settings, settings);
      this.dialog.className = dialog.dialogClass || '';
      this.elements.accept.innerText = dialog.accept;
      this.elements.cancel.innerText = dialog.cancel;
      this.elements.cancel.hidden = dialog.cancel === '';
//      this.elements.message.innerText = dialog.message;
//      this.elements.soundAccept.src = dialog.soundAccept || '';
//      this.elements.soundOpen.src = dialog.soundOpen || '';
      this.elements.target = dialog.target || '';
//      this.elements.template.innerHTML = dialog.template || '';
  
      this.focusable = this.getFocusable();
     // this.hasFormData = this.elements.fieldset.elements.length > 0;
    
      this.toggle(true);
  
      if (this.hasFormData) {
        this.focusable[0].focus();
        this.focusable[0].select();
      } else
      {
        this.elements.accept.focus();
      }
    }
  
    toggle(open = false) {
        if (this.dialogSupported && open) this.dialog.style.display = 'block'; //show();

        else this.dialog.style.display = 'none'
      if (!this.dialogSupported) {
        document.body.classList.toggle(this.settings.bodyClass, open);
        this.dialog.hidden = !open;
        if (this.elements.target && !open) {
          this.elements.target.focus();
        }
      }
    }
  
    waitForUser() {
      return new Promise(resolve => {
        this.dialog.addEventListener('cancel', () => {
          this.toggle();
          resolve(false);
        }, { once: true });
        this.elements.accept.addEventListener('click', () => {
          let value = this.hasFormData ? this.collectFormData(new FormData(this.elements.form)) : true;
          this.toggle();
          resolve(value);
        }, { once: true });
      });
    }
  
    alert(message, config = { target: event.target }) {
      const settings = Object.assign({}, config, { cancel: '', message, template: '' });
      this.open(settings);
      return this.waitForUser();
    }
  
    confirm(message, config = { target: event.target }) {
      const settings = Object.assign({}, config, { message, template: '' });
      this.open(settings);
      return this.waitForUser();
    }
  
    prompt(message, value, config = { target: event.target }) {
      const template = `<label aria-label="${message}"><input type="text" name="prompt" value="${value}"></label>`;
      const settings = Object.assign({}, config, { message, template });
      this.open(settings);
      return this.waitForUser();
    }
}
*/
class DebugControl {
    constructor() {
        this.ui = document.createElement('div');
        this.ui.innerHTML = `
          <button id="debug.continue">▶️</button>
          <button id="debug.stop">⏹️</button>`

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
          this.hide()
          resolve(false)
        }, { once: true })
        this.ui.addEventListener('play', () => {
          this.hide()
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
        if (this._wrapped._wrapped instanceof DebuggerFn) {
            return this._wrapped._wrapped.adjustSize(canvas, x, y)
        }
    }

  render(canvas) {
    if (this._wrapped._wrapped instanceof DebuggerFn) {
      return this._wrapped._wrapped.render(canvas)
  }
    }

    displayInput(val) {

    }

    apply(input, context) {
        debug_context.setInput(input)
        const res = super.apply(input, context)
        debug_context.setOutput(res)
        if (this.debug_context.paused) {
            return
        }
        await this.debug_context.pause()
        return res
    }
}

class WrapperDebugger extends DebuggerFn {
    constructor(fn) {
        super(fn)
        fn._wrapped = exports.wrapFnWithDebugger(fn._wrapped)
    }
}

const FnDebuggerMap = {
    'ExecutableFn': WrapperDebugger,
    'ConstFn': exports.ConstDebugger
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


exports.ConstDebugger = class extends DebuggerFn {
    constructor(fn) {
        super(fn)
    }

    adjustSize(canvas, x, y) {
      this.x = x
      this.y = y
      console.log(canvas.getContext('2d').font)
        const val = this._wrapped.toString()
        const metrix = canvas.getContext('2d').measureText(this._wrapped.toString())
      this.width = metrix.width + 8
      this.height = 10
        return this.width
    }

  render(canvas) {
    const ctx = canvas.getContext('2d')
      ctx.strokeRect(this.x, this.y, this.width, this.height)
      
        ctx.fillText(this._wrapped.toString(), this.x, this.y + 10)
    }
}

FnDebuggerMap['ExecutableFn'] = WrapperDebugger
FnDebuggerMap['ConstFn'] = exports.ConstDebugger


/**
 * Base for all function to be shown in debugger.
 *
 * It contains x, y, w(idth), and h(eight).
 */
class DebugBase {

    adjustSize() {

    }

    render(canvas) {
        canvas.strokeRect(this.x, this.y, this.w, this.h)
    }

    /**
     * @param {any} val
     */
    setInput(val) {
        
    }

    setOutput(val) {

    }
}

class TupleFnDebugContext extends DebugBase {

    render(canvas) {
        canvas.strokeRect(this.x, this.y, this.w, this.h)
    }

}
