// ftl core functions and classes.

const version = '0.0.1'

// tuple element selector patter, such as _0, _1, etc.
const TupleSelectorPattern = /_\d+$/

// special selector for the whole input
const InputSelectorPattern = '_'

/**
 * All runtime modules in one ftl runtime.
 */
let modules = new Map<string, Module>()

/**
 * Returns the module with name.
 *
 * @param name module name
 */
export function getModule(name: string) {
  return modules.get(name)
}

/**
 * Adds a module into ftl runtime.
 *
 * If a module with the same name is already there, will replace.
 *
 * Since the module name is file path + name relative to startup program,
 * modules with the same name are mostly the same.
 *
 * @param module module to be added
 */
export function addModule(module: Module) {
  modules.set(module.name, module)
}

/**
 * Internal function that returns string presentation of any value.
 *
 * @param value value of any type including tuple
 */
function toString(value: any) {
  if (Array.isArray(value) || typeof value == 'string')
    return JSON.stringify(value)
  else
    return value.toString()
}

/**
 * Utility class.
 */
export class FnUtil {

  /**
   * Test if an element is undefined or null.
   */
  static isNone(elm: any) {
    return elm === undefined || elm === null
  }
}

/**
 * Error for failure of function construction.
 */
class FnConstructionError extends Error {
  constructor(...params: any[]) {
    super(...params)
    if (this.stack) {
      var start = this.stack.indexOf(' at new ') + 8
      this.message = this.stack.substring(start, this.stack.indexOf(' ', start)) + ': ' + this.message
    }
  }
}

/**
 * Error for runtime.
 */
class FtlRuntimeError extends Error {
  constructor(...params: any[]) {
    super(...params)
  }
}

class FunctionParameterDeficiencyError extends FtlRuntimeError {
  constructor(...params: any[]) {
    super(...params)
  }
}

/**
 * A module holds a list of defined identifiers that can be seen from the outside,
 * except the ones starting with '_' which are private to the module.
 *
 * Any imported identifies are private to the module and will not be exported again.
 *
 * A module has an optional name which has to be unique to the whole runtime. 
 */
export class Module {

  private _name: string
  private _functions: Record<string, FunctionBaseFn>
  private _imports: Record<string, FunctionBaseFn>
  private _executables: ExecutableFn[]

  /**
   * Creates a module with name, such as 'ftl.lang'
   */
  constructor(name: string) {
    this._name = name
    this._functions = {}
    this._imports = {}
    this._executables = []
  }

  /**
   * Returns module name.
   */
  get name() { return this._name }

  /**
   * Add a function from other module via import.
   *
   * @param name 
   * @param f 
   */
  addImport(name: string, f: FunctionBaseFn) {
    if (!f)
      throw new FnConstructionError(`Function/operator ${name} cannot be found!`)

    if (this._imports[name])
      console.warn(`import ${name} exists! Overriding.`)

    this._imports[name] = f
  }

  /**
   * Add a function declared in the module.
   *
   * Can add a function holder and replace with real function later on.
   * This is useful for definition of recursive function.
   *
   * Cannot define two functions with same name in a module.
   *
   * @param f function with unique name to module
   */
  addFn(f: FunctionBaseFn|FunctionHolder) {
    if (this._functions[f.name]) {
      let nf = this._functions[f.name]
      if (nf instanceof FunctionHolder)
        nf.wrapped = f
      else
        throw new FnConstructionError(`${f.name} exists and can not be declared again!`)
    }

    this._functions[f.name] = f as FunctionBaseFn
  }

  /**
   * Returns exportable module defined function.
   * 
   * This is used to find exportable name excluding imported names
   * (imported names can not be re-exported).
   */
  getExportableFn(name: string) {
    return this._functions[name]
  }

  /**
   * Tells if module contains a module defined function
   * or imported function with the name.
   */
  hasFn(name: string) {
    return this.getAvailableFn(name) != null
  }

  /**
   * Returns either module defined or imported function.
   */
  getAvailableFn(name: string) {
    return this._functions[name] || this._imports[name]
  }

  /**
   * Adds an executable.
   *
   * @param exec
   */
  addExecutable(exec: ExecutableFn) {
    this._executables.push(exec)
  }

  /**
   * Returns all module level function names.
   */
  get functionNames() { return Object.keys(this._functions) }

  /**
   * Returns all module level executables.
   */
  get executables() { return this._executables[Symbol.iterator]() }

  get executableCount() { return this._executables.length }

  /**
   * Executes all executables and returns results in an array.
   */
  async apply(): Promise<unknown[]> {
    var ret:unknown[] = []
    for (let exec of this.executables) {
      try {
        let res = await exec.apply()
        ret.push(res && (Array.isArray(res) && JSON.stringify(res) || res) || null)
      } catch (e) {
        ret.push(e)
      }
    }
    return ret
  }
}

/**
 * This class is the key data structure carrying computation results
 * from one tuple function to next via -> operator.
 *
 * The elements are with fixed sequence. They can be accessed as an array.
 *
 * An element of the tuple can either have an explicit name or implicit
 * name with form defined in TupleSelectorPattern. When an element has
 * explicit name, it is accessible via either the explicit name or
 * implicit name.
 *
 * For example:
 *   (1, a:2, 3) implies (_0:1, _1:2, _2:3) where the second element
 * not only has explicit name "a", but also has implicit name "_1".
 *
 * The way the elements are accessed via either explicit or implicit names
 * makes a tuple like a map as well.
 */
export class Tuple {

  // map for both implicit and explicit names
  private _names: Map<string, number>
  private _values: unknown[]

  constructor() {
    this._names = new Map()
    this._values = []
  }

  hasNames() {
    return this._names.size > this._values.length
  }

  /**
   * Creates a tuple from key/value pair.
   * @param name name of the value
   * @param value value of any type
   */
  static fromNameValue(name: string, value: unknown) {
    return new Tuple().addNameValue(name, value)
  }

  /**
   * Creates a tuple from a value only.
   *
   * The only value is accessible with name "_0".
   * @param key
   * @param value
   */
  static fromValue(value: any) {
    var t = new Tuple()
    t.addValue(value)
    return t
  }

  /**
   * Creates a tuple from a series of values.
   * @param values
   */
  static fromValues(... values: any[]) {
    var t = new Tuple()
    if (values == null)
      return t

    values.forEach(elm => t.addValue(elm))

    return t
  }

  get size() { return this._values.length }

  /**
   * Add a non-named value.
   */
  addValue(value: any) {
    this.addNameValue(null, value)
    return this
  }

  addNameValue(name: string|null, value: any) {
    if (name && this._names.has(name)) {
      throw new FtlRuntimeError("Tuple.addKeyValue(.): key " + name + " already exists!")
    }

    let seq = this.size
    this._names.set(`_${seq}`, seq)
    if (name) {
      this._names.set(name, seq)
      this._values.push(value instanceof Tuple && value.size == 1 && !value.hasNames() ? value.getIndex(0) : value)
    }

    // flat single element tuple
    else if (value instanceof Tuple && value.size == 1) {
      if (value._names.size == 1) {
        this.addValue(value._values[0])
      } else {
        var k = value._names.keys()
        k.next()
        this.addNameValue(k.next().value, value._values[0])
      }
    }

    else {
      this._values.push(value)
    }

    return this
  }

  /**
   * Invokes callback(key, value) for each pair of (key, value) in this tuple.
   */
  forEach(callback: Function) {
    this._names.forEach((value, key, map) => {
      callback(key, this._values[value])
    })
  }

  /**
   * Appends all element from another tuple. It will keep names of the elements if any. 
   */
  appendAll(tuple: Tuple | unknown) {
    if (tuple instanceof Tuple) {
      let value_map = new Map<number, string>()
      tuple._names.forEach((value, key, map) => {
        value_map.set(value, key)
      })
      value_map.forEach((value, key) => {
        if (value.startsWith('_') && !isNaN(parseInt(value.substring(1))))
          this.addValue(tuple._values[key])
        else
          this.addNameValue(value, tuple._values[key])
      })
    }
    else if (tuple != null)
      this.addValue(tuple)

    return this
  }

  /**
   * Returns named element value.
   * 
   * If name does not exist, return undefined, not null, for semantics of not found.
   * @param name
   */
  get(name: string) {
    let index = this._names.get(name)
    return index === undefined ? undefined : this._values[index]
  }

  /**
   * Returns element at index.
   *
   * If index is beyond size, undefined is returned.
   */
  getIndex(index: number) {
    return this._values[index]
  }

  /**
   * Tells if this tuple contains tail function.
   */
  hasTail(): boolean {
    return this._values.find(elm => TailFn.isTail(elm)) !== undefined
  }

  /**
   * Checks if any element or nested element is a function.
   */
  hasFn():boolean {
    return this._values.find(elm => elm instanceof Fn) !== undefined
  }

  /**
   * Returns a shallow copy of value list.
   */
  toList() {
    return [... this._values]
  }

  /**
   * Converts a tuple into a tuple fn.
   */
  toTupleFn():Fn {
    var converted:any[] = []
    let name_map = new Map<number, string>()
    this._names.forEach((name, seq, map) => {
      name_map.set(name, seq)
    })
    name_map.forEach((name, seq) => {
      var val = this._values[seq]
      if (val instanceof Tuple) {
        val = val.toTupleFn()
      } else if (!(val instanceof Fn)) {
        val = new ConstFn(val)
      }

      // if name is significant
      if (!name.startsWith('_') || isNaN(parseInt(name.substring(1)))) {
        if (isTailFn(val))
          val.name = name
        else
          val = new NamedExprFn(name, val)
      }
      converted.push(val)
    })

    return new TupleFn(... converted)
  }

  /**
   * Checkes equality of each value in both tuples sequentially.
   */
  equals(o: any) {
    function arrayIdentical(a:any, b:any) {
      if (!Array.isArray(a) || !Array.isArray(b))
        return false
      var i = a.length
      if (i != b.length) return false
      while (i--) {
          if (a[i] != b[i]) return false
      }
      return true
    }

    if (!(o instanceof Tuple))
      return false

    if (o.size != this.size)
      return false

    for (var i = 0; i < this.size; i++) {
      var ith = this.getIndex(i)
      var oth = o.getIndex(i)

      if (ith != oth && !arrayIdentical(ith, oth) && (!(ith instanceof Tuple) || !ith.equals(oth)))
        return false
    }
    return true
  }

  /**
   * Returns string presentation of a tuple.
   */
  toString() {
    if (this._values.length == 0)
      return '<>'

    var buf: any[] = []
    var curr_idx = 0
    var curr:string|null = null
    this._names.forEach((value, key, map) => {
      if (value != curr_idx) {
        buf.push(curr)
        curr_idx = value
      }

      curr = toString(this._values[value])
      if (!key.startsWith('_'))
        curr = `${key}:${curr}`
    })
    buf.push(curr)
    return `<${buf.join(', ')}>`
  }
}

function isConstFn(val: any): val is ConstFn {
  return val instanceof ConstFn || val instanceof ProxyFn && val.wrapped instanceof ConstFn
}

function isFunctionInterfaceFn(val: any): val is FunctionInterfaceFn {
  return val instanceof FunctionInterfaceFn || val instanceof ProxyFn && val.wrapped instanceof FunctionInterfaceFn
}

function isNamedExprFn(val: any): val is NamedExprFn {
  return val instanceof NamedExprFn || val instanceof ProxyFn && val.wrapped instanceof NamedExprFn
}

function isOpPipeFn(val: any): val is OpPipeFn {
  return val instanceof OpPipeFn || val instanceof ProxyFn && val.wrapped instanceof OpPipeFn
}

function isPipeFn(val: any): val is PipeFn {
  return val instanceof PipeFn || val instanceof ProxyFn && val.wrapped instanceof PipeFn
}

function isRefFn(val: any): val is RefFn {
  return val instanceof RefFn || val instanceof ProxyFn && val.wrapped instanceof RefFn
}

function isTailFn(val: any): val is TailFn {
  return val instanceof TailFn || val instanceof ProxyFn && val.wrapped instanceof TailFn
}

function isTupleFn(val: any): val is TupleFn {
  return val instanceof TupleFn || val instanceof ProxyFn && val.wrapped instanceof TupleFn
}

function isVarFn(val: any): val is VarFn {
  return val instanceof VarFn || val instanceof ProxyFn && val.wrapped instanceof VarFn
}

/**
 * Base class for a function in ftl.
 */
export abstract class Fn {

  /**
   * returns name of class that represent the function.
   */
  get typeName() { return this.constructor.name }

  /**
   * Applies function with optional input and context.
   */
  async apply(input?: any, context?: any): Promise<Tuple | any> {
    return new Tuple()
  }

  async applyAndResolve(input?: any, context?: any) {
    let ret = await this.apply(input, context)

    // an executable may wrap a tail that needs to be executed
    while (TailFn.isTail(ret)) {
      ret = await ret.apply(null)
    }

    if (ret instanceof Fn) {
      ret = ret.apply(input, context)
    }
    return ret
  }
}

/**
 * Any function type that has an immutable name.
 */
abstract class NamedFn extends Fn {
  private _name: string

  constructor(name: string) {
    super()
    this._name = name
  }

  get name() { return this._name }
}

/**
 * This abstract class is used to define a function composed of child functions.
 *
 * properties:
 * fns: array of child functions
 */
abstract class ComposedFn extends Fn {

  protected _fns: Fn[]

  constructor(... fns: Fn[]) {
    super()
    this._fns = fns
  }

  get fns() { return this._fns[Symbol.iterator]() }
  get size() { return this._fns.length }
  get first() { return this.size > 0 && this._fns[0] || undefined }

  getFnAt(index: number) { return this._fns[index] }

  replaceAt(index: number, fn: Fn) {
    this._fns[index] = fn
  }

  filter(predicate: (fn: Fn) => boolean) {
    return this._fns.filter(predicate)
  }

  find(predicate: (fn: Fn) => boolean) {
    return this._fns.find(predicate)
  }

  map(mapper: (input:any, index: number) => any) {
    return this._fns.map(mapper)
  }
}

/**
 * Abstract class wrapping a function and expose as a function with
 * the same signature of input and output.
 */
export abstract class WrapperFn extends Fn {

  protected _wrapped: Fn

  constructor(wrapped: Fn) {
    super()
    this._wrapped = wrapped
  }

  get wrapped() { return this._wrapped }

  isConst() {
    return isConstFn(this._wrapped)
  }

  async apply(input: any, context?: any) {
    return await this._wrapped.apply(input, context)
  }

  toString() {
    return this._wrapped.toString()
  }
}

/**
 * Constant function, which wraps a value as constant and returns it for any input.
 * 
 * Note that the value can be a function as well, but will not be computed
 * in the context of this class.
 *
 * Properties:
 *   non-null value
 */
export class ConstFn extends Fn {

  _value: any

  constructor(value:unknown) {
    super()
    this._value = value
  }

  get valueType() { return typeof this._value }
  get value() { return this._value }

  async apply(input: any) {
    return Array.isArray(this._value) ? Array.from(this._value) : this._value
  }

  toString() {
    return toString(this._value)
  }
}

/**
 * Immutable value with a name.
 *
 * This represents "const" declaration.
 */
class ImmutableValFn extends ConstFn {

  _name: string

  constructor(name: string, value: any) {
    super(value)
    this._name = name
  }
}

/**
 * Variable function.
 */
class VarFn extends ImmutableValFn {
  _val: any

  constructor(name: string, value: any) {
    super(name, value)
  }

  // sets value
  set value(value: any) {
    if (value == undefined)
      throw new FtlRuntimeError("value to VarFn can not be undefined!")
    this._val = value
  }
}

/**
 * Class as base for all types of defintion of functions.
 */
export abstract class FunctionBaseFn extends NamedFn {
  protected _body: Fn
  protected _params: TupleFn
  protected _isPipeOp: boolean

  constructor(name: string, params: TupleFn, body: any) {
    let is_pipe_op = false
    if (name.endsWith('->')) {
      name = name.substring(0, name.length - 2)
      is_pipe_op = true
    }
    super(name)
    this._params = params
    this._body = body
    this._isPipeOp = is_pipe_op
  }

  get params() {
    return this._params
  }

  get isPipeOp() {
    return this._isPipeOp
  }

  async apply(input: any, context: any) {
    return await this._body.apply(input, context)
  }
}

/**
 * Class that wraps native javascript function in form of:
 *
 * fn name(params) {
 *   // javascript body
 * }
 */
export class NativeFunctionFn extends FunctionBaseFn {

  static NativeScriptFn = class extends Fn {
    private _jsfunc: Function
    constructor(jsfunc: Function) {
      super()
      this._jsfunc = jsfunc
    }

    async apply(input: any) {
      let args = (input instanceof Tuple) && input.toList() || [input]
      return this._jsfunc.apply(null, args)
    }
  }

  /**
   * Constructs a function implemented in native javascript.
   *
   * @param name - string function name
   * @param params - parameter list in TupleFn
   * @param jsfunc - javascript function with parameter declaration and body.
   */
  constructor(name: string, params: TupleFn, jsfunc: Function) {
    super(name, params, new NativeFunctionFn.NativeScriptFn(jsfunc))
  }

  async apply(input: any, context?:any) {
    if (FnUtil.isNone(input) && this.params.size > 0)
      throw new FunctionParameterDeficiencyError("Input to native function " + this.name + " does not match!")
    return await this._body.apply(await this.params.apply(input))
  }

  toString() {
    return this.name
  }
}

/**
 * Function function.
 */
export class FunctionFn extends FunctionBaseFn {
  static FunctionBodyFn = class extends WrapperFn {
    constructor(expr: any) {
      super(expr)
    }

    async apply(input: string, context?: any) {
      let res:Fn|Tuple = await super.apply(input, context)
      var i = 0
      while (isTailFn(res)) {
        i++
        if (i == 10000)
          break
        if (context == this) {
          return res
        }

        res = res.hasTail() ? await res.ResolveNextTail(this) : await res.apply(null, this)
      }

      // result may have been wrapped into ConstFn during tail computation
      return isConstFn(res) ? res.apply(null) : res
    }
  }

  constructor(name: string, params: TupleFn, expr: any) {
    super(name, params, new FunctionFn.FunctionBodyFn(expr))
  }
}

/**
 * This class represent functional argument in a function parameter or operand declaration.
 *
 * The purpose of function interface is to wrap an expression that is executed only when it is needed.
 *
 * For example, the y() below:
 *   fn x || y()
 *
 * We know that in this operator || which represents logic "or", if x is true, y is not needed.
 * In oher words, y is invoked only when x is false.
 *
 * Optionally, y or any operand can be noted with "$" such as "y$". This tells the system that it is a
 * tail that can be returned to the calling stack of the operator, and it can be invoked there.
 * The purpose of tail notation is to reduce the depth of stacks.
 *
 * properties:
 *   name
 *   params
 *   seq
 */
export class FunctionInterfaceFn extends NamedFn {
  private params: any

  private _seq: number
  _tail = false

  constructor(name: string, params: any[], seq = 0) {
    super(name)
    this.params = params
    this._seq = seq
  }

  get seq() { return this._seq }
  set seq(val: number) { this._seq = val }

  isTail() { return this._tail }

  setAsTail() { this._tail = true }

  get paramSize() { return this.params.length }

  async apply(input: any) {

    let f = input.getIndex(this._seq)
    if (typeof f == 'function' && (f.name == 'bound applyInNativeContext' || f.name == 'bound tailWrapper')) {
      return f
    }

    // For tail, simply return a TailFn wrapping the action function f
    // for delayed computation, specifically delay the computation
    // when returned to calling stack to reduce stack depth.
    if (this.isTail()) {
      let tail = new TailFn(f)
      return tail.tailWrapper.bind(tail)
    }

    // Otherwise, bind as a regular javascript function which can be either called
    // in a native function wrapped in NativeFunctionFn or ftl function wrapped in
    // FunctionFn
    else {
      let closure = new ClosureFunction(input instanceof Tuple ? f : input, this.params)
      return closure.applyInNativeContext.bind(closure)
    }
  }
}

/**
 * Stateful intermediate function storing function and parameters as closure.
 */
class ClosureFunction {
  f: Fn
  closureParams: any

  constructor(f: any, closureParams: any) {
    this.f = f
    this.closureParams = closureParams
  }

  /**
   * Unwraps f and closureParams into array.
   * @returns array with f and closureParams
   */
   unwrap() {
    return [this.f, this.closureParams]
  }

  /**
   * Converts arguments, whcih applies to a javascript function that wraps an ftl function,
   * into a TupleFn, thus it can be applied to the wrapped ftl function.
   *
   * @param params ftl function parameters
   * @param args arguments to the wrapper js function
   * @returns a Tuple that can be applied to the ftl function
   */
  jsArgsToTuple(params: TupleFn, args: any) {
    var ret = new Tuple()
    for (var i = 0; i < params.size; i++)
      ret.addNameValue((params.getFnAt(i) as any).name, args[i])
    return ret
  }

  /**
   * This is a function which is wrapped into native javascript context
   * and exexuted there.
   */
  applyInNativeContext(input: any) {
    var len = arguments.length
    if (len == 0)
      return this.f.apply(this.closureParams.apply())

    var tpl = new Tuple()

    // has parameters
    // no named parameters

    var start = 0
    if (isRefFn(this.closureParams)) {
      if (this.closureParams.isRefType()) {
      } else
        tpl.addNameValue(this.closureParams.name, input)
      start = 1
    } else if (isTupleFn(this.closureParams)) {
      tpl = this.jsArgsToTuple(this.closureParams, arguments)
      start = this.closureParams.size
    }

    // call expr where params is array of TupleFn
    else if (Array.isArray(this.closureParams) && isTupleFn(this.closureParams[0])) {
      tpl = this.jsArgsToTuple(this.closureParams[0], arguments)
      start = this.closureParams[0].size
    }

    return this.f.apply(tpl)
  }

  async apply(input: any, context?: any) {
    var tuple = new Tuple()

    // append partial parameters first as closure
    // for correctly resolve positional reference
    // such as _0, _1, etc.
    tuple.appendAll(this.closureParams)
    tuple.appendAll(input)
    return await this.f.apply(tuple, context)
  }
}

/**
 * Named expression.
 *
 * This is used to represent an element in a TupleFn.
 */
export class NamedExprFn extends WrapperFn {
  private _name: string

  constructor(name: string, elm: any) {
    super(elm)
    this._name = name
  }

  get name() { return this._name }

  hasRef() {
    return isRefFn(this._wrapped)
  }
}

/**
 * Tuple function containing a list of named or non-named fns.
 *
 * TupleFn is the most important function which represent a tuple in form of function,
 * or functional tuple.
 *
 * The result of its computation is an implicit tuple.
 *
 * For example,
 *   (1, true, 'test') in ftl represent such a tuple function with each element as ConstFn
 * containing values of 1, true, and 'test', respectively, and the result of its
 * computation is a tuple of the same size with the values in it.
 *
 * In other words, elements of a TupleFn are functions, and elements of a Tuple are values.
 *
 * If desired, the value from computation of a TupleFn can be a function as well.
 *
 * Any tail element or any tuple containing tail element will be wrapped into another tail
 * and return to the top level such as FunctionFn or ExecutableFn to compute. The purpose
 * of doing this is to greatly reduce stack depth.
 */
export class TupleFn extends ComposedFn {

  constructor(... fns: any[]) {
    super(... fns)
  }

  /**
   * Tells if this TupleFn contains a NamedExprFn element.
   */
  hasName(name: string) {
    return this.getNamedFn(name) != null
  }

  /**
   * Returns element with the name.
   */
  getNamedFn(name: string) {
    return this.find((fn: any) => isNamedExprFn(fn) && fn.name == name)
  }

  async apply(input: any, context?: any): Promise<Tuple | any> {
    var tuple = new Tuple()
    var len = this.size
    if (len == 0)
      return tuple

    for (var i = 0; i < len; i++) {
      var fn = this._fns[i]

      var res = await fn.apply(input, context)
      if (isNamedExprFn(fn) || isTailFn(fn)) {
        tuple.addNameValue(fn.name, res)
      }
      else
        tuple.addValue(res)
    }

    return tuple.size == 1 && !tuple.hasNames() ? tuple.getIndex(0) : tuple
  }
}

/**
 * This represents chains of tuples in form of:
 * (t1) -> (t2) ... -> (tn)
 */
export class PipeFn extends ComposedFn {
  constructor(... tuples: any[]) {
    super(... tuples)
  }

  async apply(tuple: any, context: any) {
    var res = await (this._fns[0] as Fn).apply(tuple, context)

    // if name is unresolved
    if (res === this._fns[0])
      return this

    for (var i = 1; i < this._fns.length; i++) {
      if (isTailFn(res))
        return new TailFn(new PipeFn(res, ... this._fns.slice(i)))
      else if (res instanceof Tuple && res.hasTail())
        return new TailFn(new PipeFn(res.toTupleFn(), ... this._fns.slice(i)))

      // still has unresolved ref
      else if (res instanceof Tuple && res.hasFn() && !OpPipeFn.isOpPipe(this._fns[i]))
        return new PipeFn(...[res.toTupleFn()].concat(this._fns.slice(i)))

      res = await this._fns[i].apply(res, context)
    }

    return res
  }

  toString() {
    return 'lambda expression'
  }
}

export class OpPipeFn extends ComposedFn {
  constructor(... tuples: any[]) {
    super(... tuples)
    if (tuples.length != 2) {
      throw new FtlRuntimeError(`OpPipeFn has ${tuples.length} elements!`)
    }
  }

  static isOpPipe(fn: Fn): boolean {
    if (isOpPipeFn(fn))
      return true
      else if (isPipeFn(fn) || isTupleFn(fn))
      return OpPipeFn.isOpPipe((fn as any)._fns[0])
    else
      return false
  }

  async apply(input: any, context: any) {

    async function resolve_refs(input: any, first_tuple_elm: any, op2: any): Promise<Fn | undefined> {
      if (!input)
        return op2
        if (isRefFn(op2)) {
          if (op2.isTupleSelector() || !(input instanceof Tuple) || isTupleFn(first_tuple_elm) && first_tuple_elm.hasName(op2.name))
            return op2
        else {
          let r = await op2.apply(input)
          return FnUtil.isNone(r) && op2 || (r instanceof Fn && r || new ConstFn(r))
        }
      } else if (isTupleFn(op2)) {
        let fns = (op2 as any)._fns
        for (var i = 0; i < fns.length; i++) {
          let f = fns[i]
          var converted = await resolve_refs(input, first_tuple_elm, f)
          if (converted != f) {
            fns[i] = converted
          }
        }
        return op2
      } else if (isPipeFn(op2)) { 
        await resolve_refs(input, first_tuple_elm, (op2 as any)._fns[0])
        return op2
      } else
        return op2
    }

    let first_tuple_elm = (this._fns[0] as TupleFn).getFnAt(0)
    var res = await first_tuple_elm.apply(input, context)

    // if name is unresolved
    if (res === first_tuple_elm)
      return this

    if (isTailFn(res)) {
        return new TailFn(new PipeFn(res, this._fns[1]))
    } else if (res instanceof Tuple && res.hasTail()) {
      return new TailFn(new PipeFn(res.toTupleFn(), this._fns[1]))
    }

    // still has unresolved ref
    else if (res instanceof Tuple && res.getIndex(0) instanceof Fn) {
      return new PipeFn(...[res.toTupleFn()].concat(this._fns[1]))
    }

    let combined = new Tuple()
    combined.addValue(res)
    let op2 = await resolve_refs(input, first_tuple_elm, (this._fns[0] as TupleFn).getFnAt(1))
    combined.addValue(op2)
    return await this._fns[1].apply(combined, context)
  }

  toString() {
    return 'lambda expression'
  }
}

/**
 * Fn capturing any reference, which is either a function
 * or an element from previous tuple.
 */
export class RefFn extends Fn {
  name: string
  params: any
  module: Module
  unresolved: boolean

  constructor(name: string, module: Module) {
    super()
    this.name = name
    this.module = module
    this.unresolved = false
  }

  isRefType() {
    return false
  }

  /**
   * Tells if this reference is a tuple selector such as '_0', '_1', etc.
   */
  isTupleSelector() {
    return this.name.match(TupleSelectorPattern) != null
  }

  static isInputSelector(name: string) {
    return name.match(TupleSelectorPattern) || InputSelectorPattern == name
  }

  async apply(input: any, context?: any) {
    var e:unknown | Fn

    if (this.name == InputSelectorPattern) {
      return input
    }

    // find name from scoped tuple first
    if (input && input instanceof Tuple)
      e = input.get(this.name)

    if (e !== undefined) {
      if (this.params != null) {
        if (typeof (e) == 'function') {
          var args = []
          if (isRefFn(this.params))
            args.push(input.get(this.params.name))
          else if (this.params instanceof Fn) {
            args = await this.params.apply(input)
            args = args instanceof Tuple ? args.toList() : [args]
          }
          else for (var i = 0; i < this.params.size; i++)
            args.push(input.get(this.params[i].name))
          return e.apply(null, args)
        }

        // e not a function but an Fn
        else {
          var tpl = this.params.apply(input)
          if (isRefFn(this.params))
            tpl = Tuple.fromNameValue(this.params.name, tpl)
          else if (!(tpl instanceof Tuple))
            tpl = Tuple.fromValue(tpl)
          return (e as Fn).apply(tpl)
        }
      }
      return e
    }

    if (this.name == '_0' && input && !(input instanceof Tuple))
      return input

    // can not find ref, return itself
    var f
    if (this.module) {
      f = this.module.getAvailableFn(this.name)
    }

    if (f) {
      return await f.apply(input, context)
    }

    return this
  }
}

/**
 * This class represents a function being constructed.
 * 
 * It is transient. Once construction is fnished, it will be defererenced.
 */
export class FunctionHolder extends FunctionBaseFn {

  constructor(name:string, params: any) {
    super(name, params, null)
  }

  set wrapped(f: FunctionBaseFn) {
    this._body = f
  }
}

/**
 * This function selects tuple element with 0 based sequence number.
 * 
 * For example:
 *   (1, 2, 3) -> (_2, _3) results in (2, 3)
 */
export class TupleSelectorFn extends Fn {

  private _seq: number

  constructor(seq: number) {
    if (seq < 0)
      throw new FnConstructionError('seq is smaller than 0!')

    super()
    this._seq = seq
  }

  async apply(input: any) {
    if (FnUtil.isNone(input))
      return this

    if (input instanceof Tuple)
      return input.getIndex(this._seq)

    if (this._seq == 0)
      return input

    return null
  }
}

/**
 * This function is used as function parameter that may have default value.
 * selects tuple element with 0 based sequence number.
 * 
 * For example:
 *   fn foo(a, b, c:1)
 */
export class SeqSelectorOrDefault extends TupleSelectorFn {

  private _defaultValue: unknown

  constructor(seq: any, defaultFn: Fn) {
    var default_val = defaultFn.apply()
    if (default_val instanceof Fn)
      throw new FnConstructionError('defaultFn is not a constant or constant expresion!')

    super(seq)
    this._defaultValue = default_val
  }

  get defaultValue() { return this._defaultValue }

  async apply(input: any) {
    var sv = await super.apply(input)
    if (sv !== undefined && sv != null && sv != this)
      return sv
    return this._defaultValue
  }
}

/**
* This fn wraps an expression with calling parameters.
* @deprecated
*/
export class ExprFn extends WrapperFn {
  private _paramTuples: Fn[]

  constructor(f: any, ... paramtuples: Fn[]) {
    super(f)
    this._paramTuples = paramtuples
  }

  async apply(input: any, context?:any) {
    var ret = await super.apply(input)
    for (var i = 0; i < this._paramTuples.length; i++)
      ret = await ret.toTupleFn().apply(this._paramTuples[i].apply(input, context))
    return ret instanceof Tuple && ret.size == 1 ? ret.get('_0') : ret
  }

  toString() {
    return 'expression'
  }
}

/**
 * CallExprFn captures call expressions such as sin(3.14).
 *
 * A call expression may represent a full or partial function call,
 * or a lambda expression invocation with named references.   
 */
export class CallExprFn extends Fn {
  f: Fn
  name: string
  params: Fn[]

  constructor(name: string, f: any, params: Fn[]) {
    super()
    this.f = f
    this.name = name
    this.params = params
  }

  async apply(input: any, context?:any) {
    var f = !this.f ? input.get(this.name) : this.f
    if (!(f instanceof Fn))
      throw new FtlRuntimeError(this.name + " is not a functional expression. Can not be invoked as " + this.name + "(...)")

    if (isRefFn(f))
      f = await f.apply(input)

    let intermediate = await this.params[0].apply(input)
    let ret
    if (typeof f == 'function') {
      if (intermediate instanceof Tuple) {
        ret = f(... intermediate.toList())
      } else {
        ret = f(intermediate)
      }
    } else {
      ret = await f.apply(intermediate)
    }
    for (var i = 1; i < this.params.length; i++)
      return await ret.apply(await this.params[i].apply(input))
    return ret
  }
}

/**
 * This is a functional tuple reference, which returns a function.
 *
 * It is used as argument passing to a function parameter which is functional.
 *
 * For example:
 *
 *   fn list => mapper(item) {...}
 *   [1, 2, 3] => (item + 2)
 *
 * Here (item + 2) is actually equivalent to
 *   fn mapper(item) -> (item + 2)
 *
 * When (item + 2) is passed to the argument mapper(item), it automatically reassembles it as a full function as:
 *   fn mapper(item) -> (item + 2)
 *
 * The executable may also be written as:
 *   [1, 2, 3] => ($(i) - > i + 2)
 * where $(i) - > i + 2 is an explicit lambda with any identity as the functional parameter item.
 */
export class ExprRefFn extends WrapperFn {
  fnl: any
  closure: any

  constructor(fnl: any, expr: any) {
    if (!(isFunctionInterfaceFn(fnl)))
      throw new FtlRuntimeError("functional is not instanceof FunctionInterfaceFn")

    super(expr)
    this.fnl = fnl
  }

  async apply(input: any) {
    return new ClosureFunction(this._wrapped, input)
  }
}

/**
 * This class holds information about tail and provides executeRecursive() to resolve tail.
 *
 * It is stateful. It will never be used in statement/function construction but only used
 * for transient execution.
 *
 * When being executed, a tail is picked and executed. If it results in another or more tails,
 * these tails will not be recursively executed right away. Instead they are added into the tail list
 * and the whole tail will be return back, from where executeRecursive() is executed again to
 * pick the next tail to execute. This process is repeated until all tails are resolved.
 */
class TailFn extends WrapperFn {
  closure: any
  _tails = new Array<TupleFn>()
  name:string|null = null

  constructor(fn: any, closure?: any) {
    super(fn)
    this.closure = closure

    if (isPipeFn(fn)) {
      var first = fn.first
      if (TailFn.isTail(first)) {
        fn.replaceAt(0, (first as TailFn)._wrapped)
      } else if (isTupleFn(first)) {
        this.addTail(first)
      }
    }
  }

  /**
   * This function is used in native javascript that return the tail function
   * into calling stack frame. In other words, the actual computation does not
   * happen at the place it should be, but will happen in higher stack frame
   * for the purpose of reducing stack depth.
   */
  tailWrapper() {
    return this
  }

  addTail(tail:TupleFn) {
    if (tail.find(elm => TailFn.isTail(elm)) !== undefined) {
      this._tails.unshift(tail)
    }
    else {
      tail.filter(elm => isTupleFn(elm)).forEach(elm => {
        this.addTail(elm as TupleFn)
      })
    }
  }

  addAllTails(tail:TailFn) {
    var t
    while (t = tail.nextTail()) {
      this.addTail(t)
    }
  }

  hasTail() {
    return this._tails.length > 0
  }

  nextTail():TupleFn|undefined {
    return this._tails.pop()
  }

  /**
   * Tells if elm is a TailFn
   * @param elm element to be tested
   */
  static isTail(elm:any) {
    return isTailFn(elm)
  }

  async ResolveNextTail(context: any) {
    var tail = this.nextTail()
    if (!tail) {
      return this
    }

    var i = 0
    for (let elm of tail.fns) {
      if (TailFn.isTail(elm)) {
        let inner_tail:TailFn = elm as TailFn
        var next = await elm.apply(null, context)
        if (TailFn.isTail(next)) {
          this.addAllTails(next)

          tail.replaceAt(i, inner_tail.name ? new NamedExprFn(inner_tail.name, next.wrapped) : next.wrapped)
        }

        // end of recursive
        else {
          tail.replaceAt(i, inner_tail.name ? new NamedExprFn(inner_tail.name, next instanceof Fn ? next : new ConstFn(next)) : next)
        }
      }
      i++
    }
    return this
  }

  async apply(input: any, context?: any) {
    var res = await this._wrapped.apply(this.closure, context)
    if (isTailFn(res)) return res
    else if (res instanceof Tuple && res.hasTail()) return new TailFn(res.toTupleFn())
    return new ConstFn(res)
  }
}

/**
 * This fn captures array initializer such as [1, 2, 3].
 */
export class ArrayInitializerFn extends Fn {
  private _values:any[]

  constructor(... values:any[]) {
    super()
    this._values = values
  }

  get size() { return this._values.length }
  get first() { return this.size > 0 && this._values[0] }

  async apply(input: any, context: any) {
    var ret: any[] = []
    for (let v of this._values) {
      let val = await v.apply(input, context)
      if (Array.isArray(val)) {
        ret.splice(ret.length, 0, ... val)
      } else {
        ret.push(await v.apply(input, context))
      }
    }
    return ret
  }
}

/**
 * Array initializer with values of start, end, and interval such as:
 *
 *   [1:2:8]
 *
 * where start = 1, end = 9, and interval = 2.
 */
export class ArrayInitializerWithRangeFn extends Fn {
  private _startValue: Fn
  private _endValue: Fn
  private _interval: Fn

  constructor(startValue: Fn, endValue: Fn, interval: Fn) {
    super()
    this._startValue = startValue
    this._endValue = endValue
    this._interval = interval
  }

  get startValue() { return this._startValue }
  get endValue() { return this._endValue }
  get interval() { return this._interval }

  async apply(input: any, context: any) {
    let start = await this._startValue.apply(input, context)
    let interval = await this._interval.apply(input, context)
    let end = await this._endValue.apply(input, context)
    let len = Math.floor((end + interval - start) / interval)
    var array = new Array(len)
    var val = start
    for (var i = 0; i < len; i++) {
      array[i] = val
      val += interval
    }
    return array
  }
}

/**
 * Array element selector.
 *
 * For example:
 *   [1, 2, 3] -> _[2] yields 3.
 * @parameter name - name of a list
 * @parameter index - index of element to select
 */
export class ArrayElementSelectorFn extends NamedFn {
  private _index: Fn | number

  constructor(name: string, index: Fn | number) {
    super(name)
    this._index = index
    if (Array.isArray(this._index)) {
      if (this._index.length == 1) {
        this._index = this._index[0]
      } else {
        throw new FnConstructionError('multiple selectors not supported yet!')
      }
    }
  }

  get index() { return this._index }

  async apply(input: any) {
    let list = input && (
      input instanceof Tuple && (input.get(this.name) || null)
      || ((this.name == '_' || this.name == '_0') && input)
      || []
    )

    if (isVarFn(list))
      list = list.value

    let index: any = typeof this._index == 'number' ? this._index : await this._index.apply(input)
    if (list)
      return list[index] || null
    else
      return this
  }
}

/**
 * This fn is for selecting a range of an array, such as:
 *
 *   arr[1:2:8] // select from index 1 to 8th inclusive with interval 2
 *   arr[1:2:]  // select from index 1 to the end with interval 2
 *
 * where arr is an array.
 */
export class ArrayRangeSelectorFn extends Fn {
  name: string
  start: Fn
  end:Fn
  interval:Fn
  constructor(name:string, start:Fn, end:Fn, interval:Fn | null = null) {
    super()
    this.name = name
    this.start = start
    this.end = end
    this.interval = interval || new ConstFn(1)
  }

  async apply(input: any) {
    let list = input && (
      input instanceof Tuple && (input.get(this.name) || null)
      || ((this.name == '_' || this.name == '_0') && input)
      || []
    )

    let start = await this.start.apply(input)
    let end = await this.end.apply(input)
    let interval = await this.interval.apply(input)

    end = end == -1 ? list.length : end + 1
    let len = Math.ceil((end - start) / interval)
    let ret = new Array(len)
    for (var i = start, j = 0; i < end; i += interval, j++) {
      ret [j] = list[i]
    }
    return ret
  }
}

export class BinaryOperatorWithPrefixFn extends Fn {
  operand1: Fn
  operand2: Fn
  f: Fn
  prefix: Fn
  constructor(operand1 : Fn, operand2: Fn, f: Fn, prefix: Fn) {
    super()
    this.operand1 = operand1
    this.operand2 = operand2
    this.f = f
    this.prefix = prefix
  }

  async apply(input: any, context: any) {
    let r1 = await this.operand1.apply(input, context)
    let r2 = await this.operand2.apply(input, context)
    return await this.prefix.apply(Tuple.fromValues(r1, this.f, r2), context)
  }
}


/**
 * This is for capturing form of partial or full expression with an expression
 * invoked by passing arguments as:
 *
 *   (x + y)(x:1, y:2)
 *
 * A expression can be invoked with currying having arguments passed
 * one by one, such as:
 *
 *   (x + y)(x:1)(y:2)
 *
 * The arguments has to be constants with names matching the ones in the expression.
 * Sequence of arguments does not matter. The following is equivalent as
 * above:
 *
 *   (x + y)(y:2)(x:1)
 *
 * If partial arguments are passed in the currying form, it will form a partial
 * expression with provided arguments passed in, and then input is applied to
 * the partial expression to derive the complete result, such as:
 *
 *  (x:1) -> (x + y)(y:2)
 */
export class CurryExprFn extends Fn {
  expr:Fn
  params:Fn[]

  constructor(expr:Fn, params:Fn[]) {
    super()
    this.expr = expr
    this.params = params
  }

  async apply(input: any, module: any) {
    let res = this.expr
    for (var p of this.params) {
      res = await res.apply(await p.apply())
      if (res instanceof Tuple) {
        res = res.toTupleFn()
      }
    }
    return res instanceof Fn ? res.apply(input, module) : res
  }
}

/**
 * This fn wraps an executable expression.
 * 
 * An executable may have actual result as a tail. In that case,
 * the tail needs to be repeatedly executed until it is not a tail anymore.
 */
export class ExecutableFn extends WrapperFn {

  constructor(wrapped: Fn) {
    super(wrapped)
  }

  async apply() {
    return await this._wrapped.applyAndResolve()
  }
}

/**
 * A sideffect (short for side-effect) is is a function used with prefix "@".
 *
 * A sideffect acts on input to provide I/O side effects, such as writing
 * to a file, console, canvas, etc. It should not change the input for
 * computation. In other words, an expression with sideffect should produce
 * the same computation result as the one without sideffect.
 *
 * To achieve this, a copy of the input is passed to a sideffect and its
 * returned value is discarded to prevent possible data change.
 *
 * As result of build, it is part of the pipe preeeding the expression
 * but can be completely ignored when reasoning. That is why this class
 * is almost the same as CallExprFn but does not carry the signature.
 */
export class SideffectFn extends Fn {
  f: FunctionBaseFn
  name: string
  params: TupleFn

  constructor(name: string, f: FunctionBaseFn, params: TupleFn) {
    if (!f) {
      throw new FtlRuntimeError('f not provided in SideffectFn!')
    }
    if (!(f instanceof Fn))
      throw new FtlRuntimeError(name + " is not a function!")
    super()
    this.f = f
    this.name = name
    this.params = params
  }

  async apply(input: any, context?: any) {
    let args = input
    if (input instanceof Tuple) {
      args = new Tuple()
      args.appendAll(input)
    }
    await this.f.apply(this.params.apply(args), context)
    return input
  }
}

export class SideffectedFn extends WrapperFn {
  sideffects: SideffectFn[]
  constructor(fn: Fn, sideffects: SideffectFn[]) {
    super(fn)
    this.sideffects = sideffects
  }

  get name() {
    return isRefFn(this._wrapped) && this._wrapped.name || undefined
  }

  async apply(input: any, context?: any): Promise<Tuple | any> {
    for (let d of this.sideffects)
      await d.apply(input, context)
    return await super.apply(input, context)
  }
}

/**
 * This class is only used to wrap a function
 * for non-computation. Example is for debugging.
 */
export abstract class ProxyFn extends Fn {

  protected _wrapped: Fn

  constructor(wrapped: Fn) {
    super()
    this._wrapped = wrapped
  }

  get wrapped() { return this._wrapped }

  async apply(input: any, context?: any) {
    return await this._wrapped.apply(input, context)
  }

  toString() {
    return this._wrapped.toString()
  }
}
