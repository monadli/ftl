import fs from 'fs'

// ftl core functions and classes.
var version = '0.0.0.2';
var TupleSelectorPattern = /_\d+$/
var VALIDATE_BUILD = false

var runPath: string;

function setRunPath(path: string) {
  runPath = path
}

function validateBuild(value: any) {
  VALIDATE_BUILD = value;
}

function getValueString(value: any) {
  if (Array.isArray(value) || typeof value == 'string')
    return JSON.stringify(value)
  else
    return value.toString()
}

let bindingFunctions = {
  pass_through() {
    return this;
  }
}

class FtlValidationError extends Error {
  constructor(...params: any[]) {
    super(...params);
    if (this.stack) {
      var start = this.stack.indexOf(' at new ') + 8;
      this.message = this.stack.substring(start, this.stack.indexOf(' ', start)) + ': ' + this.message;
    }
  }
}

export class ModuleNotLoadedError extends Error {
  moduleName: string

  constructor(moduleName: string) {
    super();
    this.moduleName = moduleName
    this.message = 'Module not exist!'
  }
}

class FnUtil {
  // Test if an element is undefined or null
  static isNone(elm: any) {
    return elm === undefined || elm === null;
  }

  static isNumber(elm: any) {
    return typeof elm == 'number'
  }

  static isObject(elm: any) {
    return typeof elm == 'object'
  }

  static isString(elm: any) {
    return typeof elm == 'string'
  }

  static isArray(elm: any) {
    return !FnUtil.isNone(elm) && Array.isArray(elm);
  }

  /**
   * Tests if elm is of type.
   */
  static isType(elm: any, type: any) {
    return elm && type && elm instanceof type;
  }

  /**
   * Tests if elm is any one of types.
   */
  static isOneType(elm: any, ...types: any[]) {
    if (FnUtil.isNone(elm) || types.length == 0)
      return false;

    for (var i = 0; i < types.length; i++)
      if (FnUtil.isType(elm, types[i]))
        return true;
    return false;
  }

  // unwraps the single value of tuple that contains a single value (monad) 
  static unwrapMonad(tuple: any): any {
    return tuple instanceof Tuple && tuple.size == 1 && tuple._names.size == 1 ? tuple.getIndex(0) : tuple;
  }

  static getFn(fns: any, predicate: any) {
    for (var i = 0; i < fns.length; i++) {
      var fn = fns[i];
      if (predicate(fn))
        return fn;
    }

    return null;
  }
}

export class FnValidator {

  static assertNonNull(elm: any) {
    if (FnUtil.isNone(elm))
      throw new FtlValidationError('elm is undefined or null!');
  }

  static assertNumberType(elm: any) {
    if (!FnUtil.isNumber(elm))
      throw new FtlValidationError('elm is not a Number!');
  }

  static assertObjectType(elm: any) {
    if (!FnUtil.isObject(elm))
      throw new FtlValidationError('elm is not Object!');
  }

  static assertStringType(elm: any) {
    if (!FnUtil.isString(elm))
      throw new FtlValidationError('elm is not String!');
  }

  static assertArrayType(elm: any) {
    if (VALIDATE_BUILD && !FnUtil.isArray(elm))
      throw new FtlValidationError('elm is not Array!');
  }

  static assertNonEmptyArray(elm: any) {
    FnValidator.assertArrayType(elm);
    if (VALIDATE_BUILD && elm.length == 0)
      throw new FtlValidationError('elm is empty array!');
  }

  static assertElmType(elm: any, ...types: any[]) {
    if (VALIDATE_BUILD && !FnUtil.isOneType(elm, ...types))
      throw new FtlValidationError('elm is not one of types!');
  }

  static assertElmsTypes(elms: any, ...types: any[]) {
    if (VALIDATE_BUILD) {
      FnValidator.assertArrayType(elms);
      elms.forEach((e: any) => {
        FnValidator.assertElmType(e, ...types);
      });
    }
  }

  static assetNoDupNames(...fns: any[]) {
    let names = new Set();
    fns.forEach(fn => {
      if (fn instanceof NamedExprFn) {
        if (names.has(fn.name)) {
          // TODO             throw new FtlBuildError("Name " + fn.name + " is defined more than once!");
        }
        names.add(fn.name);
      }
    });
  }
}

/**
 * Error thrown at any function construction.
 */
class FnConstructionError extends Error {
  constructor(...params: any[]) {
    super(...params);
    if (this.stack) {
      var start = this.stack.indexOf(' at new ') + 8;
      this.message = this.stack.substring(start, this.stack.indexOf(' ', start)) + ': ' + this.message;
    }
  }
}

class FtlRuntimeError extends Error {
  constructor(...params: any[]) {
    super(...params);
  }
}


/**
 * A module holds a list of defined identifiers that can be seen from the outside
 * (except the ones starts with '_' which are private to the module)
 *
 * Any imported identifies are private to the module.
 *
 */
export class Module {

  _name: string;
  _functions: any;
  _imports: any;
  _executables: any[];

  // creates a module with name, such as 'ftl.lang'
  constructor(name: string) {
    this._name = name || '';
    this._functions = {};
    this._imports = {};
    this._executables = [];
  }

  get name() {
    return this._name;
  }

  // Sets a module name.
  // A module can have the name set once only.
  set name(name) {
    if (this._name)
      throw new Error(`The module name already has name "${this._name}".`);

    this._name = name;
  }

  importStatement(path: string, items: any[]) {
    items.forEach(item => {
      if (item.type == 'single') {
        var name = item.name;
        var asName = item.asName;

        // import * operator
        if (name == '*') {
          var mod = getModule(path);
          if (mod == null)
            throw new Error('Module ' + path + ' does not exist!');
          var f = mod.getFn(name);
          if (!f)
            throw new Error('Operator * not found in ' + path + '!');
          this.addImport(asName || name, f);
          return;
        }

        // name starts with '.' is module relateive to path
        let relative = name.startsWith('.')

        // relative import
        if (name.startsWith('.')) {
          name = path + '/' + name
        }

        // absolute import
        else {
          name = 'lib/' + name
        }

        var dotIdx = name.lastIndexOf('.');
        if (dotIdx < 0)
          throw new Error(name + ' is not a module!');

        var id = name.substring(dotIdx + 1);
        var moduleName = name.substring(0, dotIdx);
        var mod = getModule(moduleName);
        if (!mod) {
          throw new ModuleNotLoadedError(moduleName);
        }

        // import all
        if (id == '*') {
          if (asName != null)
            throw new Error("Importing * (all) can not have alias name!");
          var fns = mod.getAllFns();
          Object.keys(fns).forEach(key => {
            this.addImport(key, fns[key]);
          });
        }
        else {
          this.addImport(asName || id, mod.getFn(id));
        }
      }

      // import list of items
      else {
        var subPath = item.path;

        item.importList.forEach((sub: any) => {
          this.importStatement(subPath, Array.isArray(sub) ? sub : [sub]);
        });
      }
    });
  }

  addImport(name: string, f: any) {
    if (!f)
      throw new Error('Can not import null for ' + name + '!')

    if (this._imports[name]) {
      console.log("import " + name + " exists! Overriding.");
    }

    this._imports[name] = f;
  }

  addFn(f: NativeFunctionFn | FunctionFn) {
    if (this._functions[f.name] != null) {
      if (this._functions[f.name] instanceof FunctionHolder)
        this._functions[f.name].wrapped = f
      else
        throw { message: "'" + f.name + "' exists and can not be declared again!" }
    }

    this._functions[f.name] = f;
  }

  // Returns module defined identifier. 
  getFn(name: string) {
    return this._functions[name];
  }

  // Tells if module contains a function with name.
  hasFn(name: string) {
    return this.getAvailableFn(name) != null;
  }

  // Returns either module defined or imported identifier. 
  getAvailableFn(name: string) {
    return this._functions[name] || this._imports[name];
  }

  getAllFns() {
    return this._functions;
  }

  addExecutable(exec: Fn) {
    // passing empty tuple as input
    this._executables.push(exec);
  }

  get executables(): any[] { return this._executables }

  get lastExecutable() {
    return this._executables[this._executables.length - 1]
  }

  apply() {
    return this.executables.map(e => {
      try {
        let res = e.apply()
        return res && (Array.isArray(res) && JSON.stringify(res) || res) || null
      } catch (e) {
        return e
      }
    })
  }
}

/**
 * This class  is a data structure carrying computation results from one tuple to next tuple.
 */
export class Tuple {
  _names: Map<string, any>;
  _values: Array<any>;
  constructor() {

    // full map of named or unnamed values
    this._names = new Map();
    this._values = [];
  }

  static fromKeyValue(key: string, value: any) {
    var t = new Tuple();
    t.addKeyValue(key, value)
    return t;
  }

  static fromValue(value: any) {
    var t = new Tuple();
    t.addValue(value)
    return t;
  }

  static fromList(... list: any[]) {
    var t = new Tuple()
    if (list == null)
      return t

    list.forEach(elm => t.addValue(elm));

    return t;
  }

  get size() {
    return this._values.length;
  }

  // add value without id
  addValue(value: any) {
    this.addKeyValue(null, value);
  }


  addKeyValue(key: string|null, value: any) {
    if (key && this._names.has(key)) {
      throw new FtlRuntimeError("Tuple.addKeyValue(.): key " + key + " already exists!");
    }

    let seq = this.size
    this._names.set(`_${seq}`, seq)
    if (key) this._names.set(key, seq)

    this._values.push(value instanceof Tuple && value.size == 1 ? value.getIndex(0) : value);
  }

  /**
   * Invokes callback(key, value) for each pair of (key, value) in this tuple.
   */
  forEach(callback: Function) {
    this._names.forEach((value, key, map) => {
      callback(key, this._values[value]);
    });
  }

  /**
   * Appends all element from another tuple. It will keep names of the elements if any. 
   */
  appendAll(tuple: Tuple | any) {
    if (tuple == null)
      return;

    if (tuple instanceof Tuple) {
      let value_map = new Map<number, string>()
      tuple._names.forEach((value, key, map) => {
        value_map.set(value, key)
      })
      value_map.forEach((value, key) => {
        if (value.startsWith('_') && !isNaN(parseInt(value.substring(1))))
          this.addValue(tuple._values[key])
        else
          this.addKeyValue(value, tuple._values[key])
      })
    }
    else
      this.addValue(tuple);
  }

  // returns list of all names
  //
  getNames() {
    return [];// TODO this._names.keys..filter(key => !key.startsWith("_"));
  }

  // returns named element value
  get(key: any) {
    return this._values[this._names.get(key)];
  }

  // returns indexed value
  getIndex(index: number) {
    return this._values[index];
  }

  hasTail(): boolean {
    return this._values.find(elm => TailFn.isTail(elm)) !== undefined
  }

  // checks if any element or nested element is a reference
  // In essence it is equivalent to having any function
  hasRef():boolean {
//    return this._values.find(elm => elm instanceof RefFn || elm instanceof Tuple && elm.hasRef()) !== undefined;
    return this._values.find(elm => elm instanceof Fn) !== undefined
  }

  toList() {
    return this._values;
  }

  // Checkes equality of each value in both tuples sequentially. 
  equals(o: any) {
    function arrayIdentical(a:any, b:any) {
      if (!Array.isArray(a) || !Array.isArray(b))
        return false
      var i = a.length;
      if (i != b.length) return false;
      while (i--) {
          if (a[i] != b[i]) return false;
      }
      return true;
    }
    
    if (!(o instanceof Tuple))
      return false;

    if (o.size != this.size)
      return false;

    for (var i = 0; i < this.size; i++) {
      var ith = this.getIndex(i);
      var oth = o.getIndex(i);
      
      if (ith != oth && !arrayIdentical(ith, oth) && (!(ith instanceof Tuple) || !ith.equals(oth)))
        return false;
    }
    return true;
  }

  // converts into a tuple fn
  // TODO presesrve names
  toTupleFn():Fn {
    var converted:any[] = []
    let value_map = new Map<number, string>()
    this._names.forEach((value, key, map) => {
      value_map.set(value, key)
    })
    value_map.forEach((value, key) => {
      var val = this._values[key]
      if (val instanceof Tuple) {
        val = val.toTupleFn()
      } else if (!(val instanceof Fn)) {
        val = new ConstFn(val)
      }
      if (value.startsWith('_') && !isNaN(parseInt(value.substring(1))))
        converted.push(val)
      else if (val instanceof TailFn) {
        // TODO test in what situation there is TailFn
        val.name = value
        converted.push(val)
      }
      else
        converted.push(new NamedExprFn(value, val))
    })

    return new TupleFn(... converted)
  }

  toString() {
    if (this._values.length == 0)
      return "()";

    var buf: any[] = []
    this._names.forEach((value, key, map) => {
      var value_str = getValueString(this._values[value]);
      if (!key.startsWith('_'))
        buf.push(key + ':' + value_str);
      else
        buf.push(value_str);
    });

    return '(' + buf.join(', ') + ')'
  }
}

/**
 * Base class for a function in ftl.
 */
export class Fn {

  // returns class name.
  get typeName() {
    return this.constructor.name;
  }

  // Applies function with input and context.
  apply(input?: any, context?: any): Tuple | any {
    return new Tuple();
  }
}

/**
 * This abstract class is used to define a function composed of child functions.
 * 
 * properties:
 * fns: array of child functions
 */
class ComposedFn extends Fn {
  fns: Array<any>
  // fns: function items
  constructor(...fns: any[]) {
    FnValidator.assertElmsTypes(fns, Fn);

    super();
    this.fns = fns || [];
  }

  get size() {
    return this.fns.length;
  }
}

/**
 * Abstract function with func functions.
 */
export class WrapperFn extends Fn {
  wrapped: Fn;

  // @param wrapped: any non-array Fn
  constructor(wrapped: Fn) {
    FnValidator.assertElmType(wrapped, Fn);

    super();
    this.wrapped = wrapped;
  }

  apply(input: any, context?: any) {
    return this.wrapped.apply(input, context);
  }

  toString() {
    return this.wrapped.toString();
  }
}

/**
 * Constant function, which wraps a constant and returns it for any input.
 * 
 * Properties:
 *   non-null value
 */
export class ConstFn extends Fn {
  value: any;
  constructor(value: Fn | any) {
    FnValidator.assertNonNull(value)

    super();

    this.value = value;
  }

  get valueType() {
    return typeof this.value;
  }

  apply(input: any) {
    return Array.isArray(this.value) ? Array.from(this.value) : this.value;
  }

  toString() {
    return getValueString(this.value);
  }
}

/**
 * Immutable value with a name.
 *
 * This represents "const" declaration.
 */
class ImmutableValFn extends ConstFn {

  name: string;
  // during construction, the value is computed and stored
  constructor(name: string, value: any) {
    super(value);
    this.name = name;
  }
}

/**
 * Variable function.
 */
class VarFn extends ImmutableValFn {
  _val: any;
  // during construction, the value is computed and stored
  constructor(name: string, value: any) {
    super(name, value);
  }

  // sets value
  set value(value: any) {
    if (value == undefined)
      throw new Error("value to VarFn can not be undefined!")
    this._val = value;
  }
}

export class FunctionBaseFn extends Fn {
  name: string;
  params: any;
  body: Fn;

  constructor(name: string, params: any, body: any) {
    super()
    this.name = name
    this.params = params
    this.body = body
  }

apply(input: any, context: any) {
    return this.body.apply(input, context)
  }
}

/**
 * Native javascript function.
 */
export class NativeFunctionFn extends FunctionBaseFn {
  static NativeScriptFn = class extends Fn {
    jsfunc: any;
    constructor(jsfunc: Function) {
      super();
      this.jsfunc = jsfunc;
    }

    apply(input: any) {
      return this.jsfunc.apply(null, (input instanceof Tuple) && input.toList() || [input]);
    }
  }


  // name:string function name
  // params:TupleFn parameter list
  // script: javascript function with parameter declaration and body.
  constructor(name: string, params: any, jsfunc: Function) {

    FnValidator.assertElmType(params, TupleFn);
    FnValidator.assertElmsTypes(params.fns, RefFn, NamedExprFn, FunctionInterfaceFn);

    super(name, params, new NativeFunctionFn.NativeScriptFn(jsfunc))
  }

  // Builds parameter function
  //
  // @params a TupleFn

  static buildParameters(params: any) {
    if (params instanceof RefFn)
      return new TupleFn(params)
    var has_default = false;
    for (var i = 0; i < params.funcCount; i++) {
      if (!has_default && params.func(i) instanceof NamedExprFn)
        has_default = true;
      else if (has_default && params.func(i) instanceof RefFn)
        throw new Error("Non default argument " + params.func(i).name + " follows default argument.");
      params.setfunc(i, new NamedExprFn(params.func(i).name, new RefFn("_" + i, null)));
    }
    return params;
  }

  static buildParameters1(module: any, params: any) {
    //if (params instanceof RefFn)
    //  params = new TupleFn(params).build(module, new TupleFn());

    //      var valid = params.isPureRefs;
    var default_count = 0;
    for (var i = 0; i < params.fns.length; i++) {
      let node: RefFn | NamedExprFn = params.fns[i];

      if (node instanceof RefFn) {
        params.fns[i] = new NamedExprFn(node.name, new TupleSelectorFn(i));
      } else if (node instanceof NamedExprFn) {
        if (node.wrapped instanceof TupleSelectorFn) {
          if ((node.wrapped as TupleSelectorFn).seq != + i)
            throw new Error("Parameter " + node.name + " has tuple selector for the wrong sequence " + node.wrapped.seq + "!");
        } else
          params.fns[i] = new NamedExprFn(node.name, new SeqSelectorOrDefault(i, node.wrapped));
      }
    }
    return params;
  }

  apply(input: any, context?:any) {
    if (FnUtil.isNone(input) && this.params.size > 0)
      throw new Error("Input to native function " + this.name + " does not match!");
    var paramValues = this.params.apply(input);
    return this.body.apply(paramValues);
  }

  toString() {
    return this.name;
  }
}

/**
 * Function function.
 */
export class FunctionFn extends FunctionBaseFn {
  static FunctionBodyFn = class extends WrapperFn {
    constructor(expr: any) {
      super(expr);
    }

    apply(input: string, context?: any) {
      let res:TailFn|Tuple = super.apply(input, context)
      var i = 0
      while (res instanceof TailFn) {
        i++;
        if (i == 10000)
          break
        if (context == this) {
          return res
        }

        res = res.hasTail() ? res.ResolveNextTail(this) : res.apply(null, this)
      }
      return res
    }
  }

  constructor(name: string, params: any, expr: any) {
    super(name, params, new FunctionFn.FunctionBodyFn(expr))
  }
}

// This is used to represent functional argument in a function parameter or operand declaration.
// The purpose of function interface is to wrap an expression that is executed only when it is needed.
//
// For example, the y() below:
//   fn x || y()
//
// We know that in this operator || which represents logic "or", if x is true, y is not needed.
// In oher words, y is invoked only when x is false;
//
// Optionally, y or any operand can be noted with "$" such as "y$". This tells the system that it is a
// tail that can be returned to the calling stack of the operator, and it can be invoked there.
// The purpose of tail notation is to reduce the depth of stacks.
//
// properties:
//   name
//   params
//   seq
export class FunctionInterfaceFn extends Fn {
  name: string;
  params: any;
  seq: number;
  partial_input: any;

  // temp

  isTail: any;
  closure: any;
  wrapped: any;
  fn: any;
  constructor(name: string, params: any, seq = 0) {
    super();
    this.name = name;
    this.params = params;
    this.seq = seq;
  }

  native_f(input: any) {
    return this.partial_input instanceof Tuple ? this.partial_input.getIndex(this.seq) : this.partial_input;
  }

  /**
   * Converts a javascript arguments into a tuple.
   */
  static js_args_to_tuple(params: any, args: any) {
    var ret = new Tuple();
    for (var i = 0; i < params.fns.length; i++)
      ret.addKeyValue(params.fns[i].name, args[i]);
    return ret;
  }


  // This is a function passing to native javascript functions.
  // The "this" here is not this class instance but a dynamic binding
  // containg runtime info.
  // Coincidentally this.params and this.wrapped are the same as
  // the ones in this class, but this.closure is not.
  fn_ref(arg: any) {
    console.log("fn_ref arguments", arg)
    console.log("fn_ref closure", this.closure)

    var len = arguments.length;
    if (len == 0)
      return this.fn.apply(this.params.apply());

    var tpl = new Tuple();

    // has parameters
    // no named parameters

    var start = 0;
    if (this.params instanceof RefFn) {

      // TODO
      if (this.params.name === 'raw')
        return this.wrapped.apply(arg);

      // TODO change ref type
      if (this.params.isRefType()) {
        // TODO tpl = this.params.params.apply(FunctionInterfaceFn.js_args_to_tuple(arguments));
      } else
        tpl.addKeyValue(this.params.name, arg);
      start = 1;
    } else if (this.params instanceof TupleFn) {
      tpl = FunctionInterfaceFn.js_args_to_tuple(this.params, arguments);
      start = this.params.fns.length;
    }

    // call expr where params is array of TupleFn
    else if (Array.isArray(this.params) && this.params[0] instanceof TupleFn) {
      tpl = FunctionInterfaceFn.js_args_to_tuple(this.params[0], arguments);
      start = this.params[0].fns.length;
    }

    var res = this.fn.apply(tpl);
    return FnUtil.unwrapMonad(res);
  }

  apply(input: any) {

    let f = input.getIndex(this.seq)
    if (typeof f == 'function' && (f.name == 'bound fn_ref' || f.name == 'bound pass_through')) {
      return f
    }

    if (this.isTail) {
      return bindingFunctions.pass_through.bind(new TailFn(f));
    } else {
      return this.fn_ref.bind({ fn: input instanceof Tuple ? f : input, params: this.params });
    }
    //      return this.native_f.bind({seq: this.seq, partial_input: input, params: this.params});
  }
}

/**
 * Stateful intermediate partial function storing function and partial parameters.
 */
class PartialFunction {
  f: Fn;
  partialParams: any;
  constructor(f: any, partialParams: any) {
    this.f = f;
    this.partialParams = partialParams;
  }

  apply(input: any, context?:any) {
    var tuple = new Tuple();

    // TODO can not simply append
    tuple.appendAll(this.partialParams)
    tuple.appendAll(input)
    return this.f.apply(tuple, context);
  }
}

/**
 * This is functional, or higher order function that returns a partial function when being invoked.
 */
export class FunctionalFn extends WrapperFn {
  constructor(expr: any) {
    super(expr);
  }

  apply(input: any) {
    return new PartialFunction(this.wrapped, input);
  }
}

/**
 * Tuple function contains a list of named or non-named fns.
 * 
 * Any tail element or any tuple containng tail element will be wrapped into another tail
 * and return to the top level such as FunctionFn or ExecutableFN to compute. The purpose
 * of this is to greatly reduce stack depth. 
 */
export class TupleFn extends ComposedFn {

  // temporary
  tuple: any;
  constructor(...fns: any[]) {
    FnValidator.assetNoDupNames(...fns);
    super(...fns);
  }

  // Tells if this TupleFn contains a NamedExprFn element.
  hasName(name: string) {
    return this.getNamedFn(name) != null;
  }

  // Returns element with the name. 
  getNamedFn(name: string) {
    return FnUtil.getFn(this.fns, (fn: any) => fn instanceof NamedExprFn && fn.name == name);
  }

  apply(input: any, context?: any) {
    var tuple = new Tuple();
    var len = this.fns.length;
    if (len == 0)
      return tuple;

    for (var i = 0; i < len; i++) {
      var fn = this.fns[i];

      var res = null;
      if (fn instanceof Fn)
        res = fn.apply(input, context);
      else if (fn instanceof Tuple || Array.isArray(fn)) {
        res = fn
      } else {
        var tp = typeof (fn);
        if (tp == 'number' || tp == 'string' || tp == 'boolean')
          res = fn;
      }

      if (fn instanceof NamedExprFn || fn instanceof TailFn) {

        // if no name is resolved, return itself
        // TODO test is this needed?
        ////if (res === fn.wrapped)
        ////  return this;
        tuple.addKeyValue(fn.name, res);
      }
      else
        tuple.addValue(res);
    }

    return tuple
  }
}

/**
 * Parameter tuple. It satisfy all tuple requirements, and supports default values after position parameters.
 * 
 * @params fns - list of simple name, function interface, or name with default value
 */
class ParamTupleFn extends TupleFn {
  constructor(...fns: any[]) {
    super(...fns);
  }

  validateInput(inputFn: any, minSize: number) {
    var names = new Set();
    var pos_sz = 0;
    for (var i = 0; i < inputFn.size; i++) {
      if (inputFn.fns[i] instanceof NamedExprFn) {
        names.add(inputFn.fns[i].name);
      } else if (names.size > 0) {
        throw new Error("Position argument at index " + i + " after named argument!");
      } else
        pos_sz = i + 1;
    }

    // when there are only positioned arguments and are more than minimal
    if (names.size == 0 && inputFn.fns.length >= minSize)
      return null;

    var need_new_args = false;
    var new_args = new Array();
    /*
        for (var i = 0; i < params.size; i++) {
          var name = params.fns[i].name;
          if (i < pos_sz) {
            if (names.has(name)) {
              throw new Error("Parameter " + name + " is provided with both position and named argument!");
            }
  
            new_args[i] = args.fns[i];
          }
          else if (!names.has(name)) {
            new_args[i] = params.fns[i];
            need_new_args = true;
          }
          else if (i < args.size && args.fns[i].name == name) {
            new_args[i] = args.fns[i];
          }
          else {
            new_args[i] = args.getElement(name);
            need_new_args = true;
          }
        }
    */
    return need_new_args && new TupleFn(...new_args) || null;
  }

  clone() {
    return new ParamTupleFn(... this.fns);
  }
}

/**
 * Named expression.
 * 
 * This is always an element in a TupleFn.
 */
export class NamedExprFn extends WrapperFn {
  name: string;
  constructor(name: string, elm: any) {
    super(elm);
    this.name = name;
  }

  // TODO: check use cases
  hasRef() {
    return this.wrapped instanceof RefFn;
  }

  get isConst() {
    return this.wrapped instanceof ConstFn;
  }
}

/**
 * This represents chains of tuple in form of:
 * (t1) -> (t2) ... -> (tn)
 */
export class PipeFn extends ComposedFn {
  constructor(...elements: any[]) {
    super(...elements)
  }

  /**
   * Creates a PipeFn
   */
  static createPipeFn(first: any, rest: any) {
    if (first instanceof PipeFn) {
      first.appendElements(rest);
      return first;
    } else if (rest instanceof PipeFn) {
      rest.prependElements(first);
      return rest;
    } else {
      var list: any = Array.isArray(first) ? list : [first];
      var ret = new PipeFn(Array.isArray(first) ? first : [first])
      ret.appendElements(rest);
      return ret;
    }
  }

  /**
   * Appends elements.
   */
  appendElements(elms: any) {
    var toBeAppended = Array.isArray(elms) ? elms : [elms];
    //this.modifyElements(toBeAppended);
    this.fns = this.fns.concat(toBeAppended);
  }

  /**
   * Prepends elements.
   */
  prependElements(elms: any) {
    var toBePrepended = Array.isArray(elms) ? elms : [elms];
    this.modifyElements(toBePrepended);
    this.fns = toBePrepended.concat(this.fns);
  }

  get elements() { return this.fns }

  modifyElements(list: Array<any>) {
    list.forEach(elm => {
      if (elm instanceof RefFn) {
        // TODO elm.tupleSeq = '_0';
      }
    });
  }

  apply(tuple: any, context: any) {
    var res = this.fns[0].apply(tuple, context);

    // there is name unresolved
    if (res === this.fns[0])
      return this;

    for (var i = 1; i < this.fns.length; i++) {
      if (res instanceof TailFn) {
        return new TailFn(new PipeFn(res, ... this.fns.slice(i)))
      } else if (res instanceof Tuple && res.hasTail()) {
        return new TailFn(new PipeFn(res.toTupleFn(), ... this.fns.slice(i)))
      }

      // still has unresolved ref
      else if (res instanceof Tuple && res.hasRef()) {
        return new PipeFn(...[res.toTupleFn()].concat(this.fns.slice(i)))
      }

      res = this.fns[i].apply(res, context)
    }

    return FnUtil.unwrapMonad(res);
  }

  toString() {
    return 'lambda expression'
  }
}

/**
 * Function capturing any reference.
 */
export class RefFn extends Fn {
  name: string;
  params: any;
  module: any
  unresolved: boolean;
  constructor(name: string, module:any) {
    super();
    this.name = name
    this.module = module
    this.unresolved = false;
  }

  // TODO 
  isRefType() {
    return false;
  }
  // Tells if this is a tuple selector such as "_0", "_1", etc.
  isTupleSelector() {
    return this.name.match(TupleSelectorPattern) != null;
  }

  apply(input: any, context?: any) {
    var e;

    // find name from scoped tuple first
    if (input && input instanceof Tuple)
      e = input.get(this.name);

    if (e !== undefined) {
      if (this.params != null) {
        if (typeof (e) == 'function') {
          var args = [];
          if (this.params instanceof RefFn)
            args.push(input.get(this.params.name))
          else if (this.params instanceof Fn) {
            args = this.params.apply(input);
            args = args instanceof Tuple ? args.toList() : [args];
          }
          else for (var i = 0; i < this.params.size; i++)
            args.push(input.get(this.params[i].name));
          return e.apply(null, args)
        }

        // e not a function but an Fn
        else {
          var tpl = this.params.apply(input);
          if (this.params instanceof RefFn)
            tpl = Tuple.fromKeyValue(this.params.name, tpl);
          else if (!(tpl instanceof Tuple))
            tpl = Tuple.fromValue(tpl);
          return e.apply(tpl);
        }
      }
      return e;
    }

    if (this.name == '_0' && input && !(input instanceof Tuple))
      return input;

    // can not find ref, return itself
    var f
    if (this.module) {
      f = this.module.getFn(this.name)
    }

    if (f) {
      return f
    }

    return this;
  }
}

export class FunctionHolder extends Fn {
  f:any
  name:string

  constructor(name:string) {
    super()
    this.name = name
  }

  set wrapped(f:any) {
    this.f = f
  }

  apply(input: any, context?: any) {
    return this.f.apply(input, context)
  }
}

/**
 * This function selects tuple element with 0 based sequence number.
 * 
 * For example:
 *   (1, 2, 3) -> (_2, _3) results in (2, 3)
 */
export class TupleSelectorFn extends Fn {
  seq: number;
  constructor(seq: any) {
    if (seq == undefined || seq == null)
      throw new FnConstructionError('seq is undefined or null!');

    if ('number' != typeof seq)
      throw new FnConstructionError('seq is not number!');

    if (seq < 0)
      throw new FnConstructionError('seq is smaller than 0!');

    super();
    this.seq = seq;
  }

  apply(input: any) {
    if (FnUtil.isNone(input))
      return this;

    if (input instanceof Tuple)
      return input.getIndex(this.seq);

    if (this.seq == 0)
      return input;

    return null;
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
  defaultValue: any
  constructor(seq: any, defaultFn: any) {
    if (!(defaultFn instanceof Fn))
      throw new FnConstructionError('defaultFn is not instanceof Fn!');

    var default_val = defaultFn.apply();
    if (default_val instanceof Fn)
      throw new FnConstructionError('defaultFn is not a constant or constant expresion!');

    super(seq);
    this.defaultValue = default_val;
  }

  apply(input: any) {
    var sv = super.apply(input);
    if (sv !== undefined && sv != null && sv != this)
      return sv;
    return this.defaultValue;
  }
}

/**
* This fn wraps an expression with calling parameters.
*/
export class ExprFn extends WrapperFn {
  paramtuples: any
  constructor(f: any, ...paramtuples: any[]) {
    FnValidator.assertElmsTypes(paramtuples, Fn);

    super(f);
    this.paramtuples = paramtuples;
  }

  apply(input: any, context?:any) {
    var ret = super.apply(input);
    for (var i = 0; i < this.paramtuples.length; i++)
      ret = ret.toTupleFn().apply(this.paramtuples[i].apply(input, context));
    return ret instanceof Tuple && ret.size == 1 ? ret.get('_0') : ret;
  }

  toString() {
    return 'expression'
  }
}

/**
 * CallExprFn captures call expressions such as sin(3.14).
 * 
 * A call expression may represent a full or partial function call,
 * or a lambda expression invocation with named refrences.   
 */
export class CallExprFn extends Fn {
  f: Fn;
  name: string;
  params: any;
  constructor(name: string, f: any, params: any) {
    super();
    this.f = f;
    this.name = name;
    this.params = params;
  }

  apply(input: any, context?:any) {
    var f = !this.f ? input.get(this.name) : this.f;
    if (!(f instanceof Fn))
      throw new Error(this.name + " is not a functional expression. Can not be invoked as " + this.name + "(...)");
    if (f instanceof RefFn) {
      f = f.apply(input);
    }
    let intermediate = FnUtil.unwrapMonad(this.params[0].apply(input))
    let ret;
    if (typeof f == 'function') {
      if (intermediate instanceof Tuple) {
        ret = f(...intermediate.toList())
      } else {
        ret = f(intermediate)
      }
    } else {
      ret = f.apply(intermediate);
    }
    for (var i = 1; i < this.params.length; i++)
      return ret.apply(this.params[i].apply(input));
    return ret;
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
  fnl: any;

  // temporary
  closure: any;
  params: any

  constructor(fnl: any, expr: any) {
    if (!(fnl instanceof FunctionInterfaceFn))
      throw new Error("functional is not instanceof FunctionalFn");

    super(expr);
    this.fnl = fnl;
  }

  // This is a function passing to native javascript functions.
  // The "this" here is not this class instance but a dynamic binding
  // containg runtime info.
  // Coincidentally this.params and this.wrapped are the same as
  // the ones in this class, but this.closure is not.
  fn_ref(arg: any) {
    console.log("fn_ref arguments", arg)
    //console.log("fn_ref closure", this.closure)

    var len = arguments.length;
    if (len == 0)
      return this.wrapped.apply(this.closure)

    var tpl = new Tuple();

    // has parameters
    // no named parameters

    var start = 0;


    var res = this.wrapped.apply(tpl);
    return (res instanceof Tuple && res.size == 1) ? res.get('_0') : res;
  }

  apply(input: any) {
    return new PartialFunction(this.wrapped, input);
  }

  /*
    apply(input) {
      if (this.fnl.isTail) {
        return pass_through.bind(new TailFn(this.wrapped, input));
      } else {
        return this.fn_ref.bind({wrapped: this.wrapped, closure: input, params: this.fnl.params});
      }
    }
  */
}

/**
 * This class holds information about tail and provides executeRecursive() to resolve tail.
 * 
 * It is stateful. It will never be used in statement/function construction but only used
 * as transient during execution.
 * 
 * When being executed, a tail is picked and executed. If it results in another or more tails,
 * these tails will not be recursively executed right away. Instead they are added into the tail list
 * and the whole tail will be return back, from where executeRecursive() is executed again to
 * pick the next tail to execute. This process is repeated until all tails are resolved.
 */
class TailFn extends WrapperFn {
  closure: any
  _tails = new Array<TupleFn>()
  _name:string|null = null

  constructor(fn: any, closure?: any) {
    super(fn)
    this.closure = closure

    if (fn instanceof PipeFn) {
      var first = fn.fns[0]
      if (TailFn.isTail(first)) {
        fn.fns[0] = first.wrapped
      } else if (first instanceof TupleFn) {
        this.addTail(first)
      }
    }
  }

  get name():string|null {
    return this._name
  }

  set name(name:string|null) {
    this._name = name
  }

  addTail(tail:TupleFn) {
    if (tail.fns.find(elm => TailFn.isTail(elm)) !== undefined) {
      this._tails.unshift(tail)
    }
    else {
      tail.fns.filter(elm => elm instanceof TupleFn).forEach(elm => {
        this.addTail(elm)
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
    return elm instanceof TailFn
  }

  ResolveNextTail(context: any) {
    var tail = this.nextTail()
    if (!tail) {
      return this
    }

    var tuple = tail.fns
    for (var i = 0; i < tuple.length; i++) {
      var elm = tuple[i]
      if (TailFn.isTail(elm)) {
        var next = elm.apply(null, context)
        if (TailFn.isTail(next)) {
          this.addAllTails(next)
          tuple[i] = elm.name ? new NamedExprFn(elm.name, next.wrapped) : next.wrapped
        }

        // end of recursive
        else {
          tuple[i] = elm.name ? new NamedExprFn(elm.name, next instanceof Fn ? next : new ConstFn(next)) : next
        }
      }
    }
    return this
  }

  apply(input: any, context?: any) {
    var res = this.wrapped.apply(this.closure, context)
    res = FnUtil.unwrapMonad(res)
    if (res instanceof Tuple && res.hasTail()) {
      return new TailFn(res.toTupleFn())
    }
    return res
  }
}

export class ArrayInitializerFn extends Fn {
  values:any[]

  constructor(... values:any[]) {
    super()
    this.values = values
  }

  apply(input:any, context:any) {
    var ret:any[] = []
    this.values.forEach((v:any) => {
      let val = v.apply(input, context)
      if (Array.isArray(val)) {
        ret.splice(ret.length, 0, ... val)
      } else {
        ret.push(v.apply(input, context))
      }
    })
    return ret
  }
}

/**
 * Array initializer with values of start, end, and interval.
 */
export class ArrayInitializerWithRangeFn extends Fn {
  start_val:Fn
  end_val:Fn
  interval:Fn

  constructor(start_val:Fn, end_val:Fn, interval:Fn) {
    super()
    this.start_val = start_val
    this.end_val = end_val
    this.interval = interval
  }

  apply(input:any, context:any) {
    let start = this.start_val.apply(input, context)
    let interval = this.interval.apply(input, context)
    let end = this.end_val.apply(input, context)
    end = FnUtil.unwrapMonad(end)
    let len = Math.ceil((end + 1 - start) / interval)
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
export class ArrayElementSelectorFn extends Fn {
  name: string;
  index: Fn | number;
  constructor(name: string, index: Fn | number) {
    super()
    this.name = name;
    this.index = index instanceof ConstFn ? index.apply(null) : index
    if (Array.isArray(this.index)) {
      if (this.index.length == 1) {
        this.index = this.index[0]
      } else {
        throw new Error('multiple selectors not supported yet!')
      }
    }
  }

  apply(input: any) {
    let list = input && (
      input instanceof Tuple && (input.get(this.name) || null)
      || ((this.name == '_' || this.name == '_0') && input)
      || []
    );

    if (list instanceof VarFn)
      list = list.value;

    let index: any = typeof this.index == 'number' ? this.index : this.index.apply(input);
    if (list)
      return list[index] || null;
    else
      return this;
  }
}

export class ArrayRangeSelectorFn extends Fn {
  name: string
  start: number
  end:number
  interval:number
  constructor(name:string, start:number, end:number, interval=1) {
    super()
    this.name = name
    this.start = start
    this.end = end
    this.interval = interval
  }

  apply(input: any) {
    let list = input && (
      input instanceof Tuple && (input.get(this.name) || null)
      || ((this.name == '_' || this.name == '_0') && input)
      || []
    )

    let end = this.end == -1 ? list.length : this.end + 1
    let len = Math.ceil((end - this.start) / this.interval)
    let ret = new Array(len)
    for (var i = this.start, j = 0; i < end; i += this.interval, j++) {
      ret [j] = list[i]
    }
    return ret
  }
}

// property accessor operator
export class PropertyAccessorFn extends Fn {
  elm_name:RefFn
  prop_names:string[]
  constructor(elm_name:RefFn, ... prop_names:string[]) {
    super()
    this.elm_name = elm_name
    this.prop_names = prop_names
  }

  apply(input:any, context:any) {
    var resolve = (elm:any, prop:string) => {
      return elm ? elm instanceof Tuple ? elm.get(prop) : elm.prop : null
    }

    var elm = this.elm_name.apply(input, context)
    for (var i = 0; i < this.prop_names.length; i++) {
      elm = resolve(elm, this.prop_names[i])
      if (!elm) {
        return null
      }
    }
    return elm
  }
}

export class RaiseFunctionForArrayFn extends Fn {
  raised_function:any
  constructor(raised_function:any) {
    super()
    this.raised_function = raised_function
  }

  apply(input:any, context:any) {
    var raised_f = this.raised_function
    if (raised_f instanceof RefFn) {
      raised_f = this.raised_function.apply(input, context)
      if (!raised_f || raised_f == this.raised_function) {
        throw new Error(`Function for '${this.raised_function.name}' not found`)
      }
    }

    if (!Array.isArray(input)) {
      input = [input]
    }
    var ret:any[] = []
    input.forEach((element:any) => {
      ret.push(raised_f.apply(element, context))
    })
    return ret
  }
}

export class RaiseBinaryOperatorForArrayFn extends RaiseFunctionForArrayFn {
  constructor(raised_function:any) {
    super(raised_function)
  }

  apply(input:Tuple, context:any) {
    var first = input.getIndex(0)
    var second = input.getIndex(1)
    let is_first_array = Array.isArray(first)
    let is_second_array = Array.isArray(second)
    
    if (!is_first_array && !is_second_array) {
      return this.raised_function.apply(Tuple.fromList(first, second))
    }

    if (!is_first_array) {
      throw new Error('first is not array!')
    }

    if (!is_second_array) {
      var ret:any[] = []
      first.forEach((element:any) => {
        ret.push(this.raised_function.apply(Tuple.fromList(element, second), context))
      })
      return ret
    }

    if (first.length != second.length) {
      throw new Error('first and second array sizes are different!')
    }

    var ret:any[] = []
    for (var i = 0; i < first.length; i++) {
      ret.push(this.raised_function.apply(Tuple.fromList(first[i], second[i]), context))
    }
    return ret
  }
}

export class ExecutableFn extends WrapperFn {

  constructor(wrapped: Fn) {
    super(wrapped)
  }

  apply() {
    let ret = this.wrapped.apply();

    // TODO tail
    while (TailFn.isTail(ret)) {
      ret = ret.apply(null)

    }
    return FnUtil.unwrapMonad(ret)
  }  
}

export class CurryExprFn extends Fn {
  expr:Fn
  params: Fn[]

  constructor(expr:Fn, params:Fn[]) {
    super()
    this.expr = expr
    this.params = params
  }

  apply(input:any, module:any) {
    let expr_res = FnUtil.unwrapMonad(this.expr.apply(input, module))
    if (expr_res instanceof Tuple) {
      expr_res = expr_res.toTupleFn()
    }

    let res = expr_res

    for (var i = 0; i < this.params.length; i++) {
      let param = this.params[i].apply(input)
      res = FnUtil.unwrapMonad(res.apply(param))
      if (res instanceof Tuple) {
        res = res.toTupleFn()
      }
    }

    return res
  }
}

// runtime modules
var modules = new Map<string, any>();

// returns module with name.
export function getModule(name: string) {
  return modules.get(name)
}

// adds a module with name.
export function addModule(module: any) {
  let name = module._name
  if (modules.has(name))
    throw new Error("Module with name '" + name + "' already exists!");
  modules.set(name, module);
}
