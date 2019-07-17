// ftl core functions and classes.
var ftl = (function() {

  var version = '0.0.0.2';
  var TupleSelectorPattern = /_\d+$/;
  var VALIDATE_BUILD = false;

  function validateBuild(value) {
    VALIDATE_BUILD = value;
  }

  function getValueString(value) {
    if (Array.isArray(value) || typeof value == 'string')
      return JSON.stringify(value)
    else
      return value.toString()
  }

  // Tells an element is a pure identifier.
  function is_elm_pure_ref(module, elm) {
    return elm instanceof RefFn && elm.isPureId() && !elm.params && !module.hasFn(elm.name);
  }

  function is_elm_ref(elm) {
    return elm instanceof RefFn && elm.isPureId() && !elm.params;
  } 

  function pass_through() {
    return this;
  }

  class FtlValidationError extends Error {
    constructor(... params) {
      super(... params);
      var start = this.stack.indexOf(' at new ') + 8;
      this.message = this.stack.substring(start, this.stack.indexOf(' ', start)) + ': ' + this.message;
    }
  }

  class FnUtil {
    // Test if an element is undefined or null
    static isNone(elm) {
      return elm === undefined || elm === null;
    }

    static isNumber(elm) {
      return typeof elm == 'number'
    }

    static isObject(elm) {
      return typeof elm == 'object'
    }
  
    static isString(elm) {
      return typeof elm == 'string'
    }

    static isArray(elm) {
      return !FnUtil.isNone(elm) && Array.isArray(elm);
    }

    /**
     * Tests if elm is of type.
     */
    static isType(elm, type) {
      return elm && type && elm instanceof type;
    }

    /**
     * Tests if elm is any one of types.
     */
    static isOneType(elm, ... types) {
      if (FnUtil.isNone(elm) || types.length == 0)
        return false;

      for (var i = 0; i < types.length; i++)
        if (FnUtil.isType(elm, types[i]))
          return true;
      return false;
    }

    // unwraps the single value of tuple that contains a single value (monad) 
    static unwrapMonad(tuple) {
      return tuple instanceof Tuple && tuple.size == 1 ? FnUtil.unwrapMonad(tuple.getIndex(0)) : tuple;
    }

    static getFn(fns, predicate) {
      for (var i = 0; i < fns.length; i++) {
        var fn = fns[i];
        if (predicate(fn))
          return fn;
      }

      return null;
    }
  }

  class FnValidator {

    static assertNonNull(elm) {
      if (FnUtil.isNone(elm))
        throw new FtlValidationError('elm is undefined or null!');
    }

    static assertNumberType(elm) {
      if (!FnUtil.isNumber(elm))
        throw new FtlValidationError('elm is not a Number!');
    }

    static assertObjectType(elm) {
      if (!FnUtil.isObject(elm))
        throw new FtlValidationError('elm is not Object!');
    }

    static assertStringType(elm) {
      if (!FnUtil.isString(elm))
        throw new FtlValidationError('elm is not String!');
    }

    static assertArrayType(elm) {
      if (VALIDATE_BUILD && !FnUtil.isArray(elm))
        throw new FtlValidationError('elm is not Array!');
    }

    static assertNonEmptyArray(elm) {
      FnValidator.assertArrayType(elm);
      if (VALIDATE_BUILD && elm.length == 0)
        throw new FtlValidationError('elm is empty array!');
    }

    static assertElmType(elm, ... types) {
      if (VALIDATE_BUILD && !FnUtil.isOneType(elm, ... types))
        throw new FtlValidationError('elm is not one of types!');
    }

    static assertElmsTypes(elms, ... types) {
      if (VALIDATE_BUILD) {
        FnValidator.assertArrayType(elms);
        elms.forEach(e => {
          FnValidator.assertElmType(e, ... types);
        });
      }
    }

    static assetNoDupNames(... fns) {
      let names = new Set();
      fns.forEach(fn => {
        if (fn instanceof ftl.NamedExprFn) {
          if (names.has(fn.name))
            throw new FtlBuildError("Name " + fn.name + " is defined more than once!");
          names.add(fn.name);
        }
      });
    }
}

  /**
   * Error thrown at any function construction.
   */
  class FnConstructionError extends Error {
    constructor(... params) {
      super(... params);
      var start = this.stack.indexOf(' at new ') + 8;
      this.message = this.stack.substring(start, this.stack.indexOf(' ', start)) + ': ' + this.message;
    }
  }

  class FtlRuntimeError extends Error {
    constructor(... params) {
      super(... params);
    }
  }


  /**
   * A module holds a list of defined identifiers that can be seen from the outside
   * (except the ones starts with '_' which are private to the module)
   *
   * Any imported identifies are private to the module.
   *
   */
  class Module {
  
    // creates a module with name, such as 'ftl.lang'
    constructor(name) {
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

    importStatement(path, items) {
      items.forEach(item => {
        if (item.type == 'single') {
          var name = item.name;
          var asName = item.asName;

          // import * operator
          if (name == '*') {
            var mod = ftl.getModule(path);
            if (mod == null)
              throw new Error('Module ' + path + ' does not exist!');
            var f = mod.getFn(name);
            if (!f)
              throw new Error('Operator * not found in ' + path + '!');
            this.addImport(asName || name, f);
            return;
          }

          if (path)
            name = path + '.' + name;

          var dotIdx = name.lastIndexOf('.');
          if (dotIdx < 0)
            throw new Error(name + ' is not a module!');

          var id = name.substring(dotIdx + 1);
          var moduleName = name.substring(0, dotIdx);
          var mod = ftl.getModule(moduleName);
          if (mod == null)
            throw new Error('Module ' + moduleName + ' does not exist!');

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

          item.importList.forEach(sub => {
            this.importStatement(subPath, Array.isArray(sub) ? sub : [sub]);
          });
        }
      });
    }

    addImport(name, f) {
      if (!f)
        throw new Error('Can not import null for ' + name + '!')

      if (this._imports[name]) {
        console.log("import " + name + " exists! Overriding.");
      }

      this._imports[name] = f;
    }

    addFn(f) {
      if (this._functions[f.name] != null)
        throw { message: "'" + name + "' exists and can not be declared again!"}

      this._functions[f.name] = f;
    }

    // Returns module defined identifier. 
    getFn(name) {
      return this._functions[name];
    }

    // Tells if module contains a function with name.
    hasFn(name) {
      return this.getAvailableFn(name) != null;
    }

    // Returns either module defined or imported identifier. 
    getAvailableFn(name) {
      return this._functions[name] || this._imports[name];
    }

    getAllFns() {
      return this._functions;
    }

    addExecutable(exec) {
      // passing empty tuple as input
      this._executables.push(exec);
    }

    get executables() { return this._executables }
  }

  /**
   * This class  is a data structure carrying computation results from one tuple to next tuple.
   */
  class Tuple {
    constructor() {

      // full map of named or unnamed values
      this._names = new Map();
      this._values = [];
    }

    static fromKeyValue(key, value) {
      var t = new Tuple();
      t.addKeyValue(key, value)
      return t;
    }
    
    static fromValue(value) {
      var t = new Tuple();
      t.addValue(value)
      return t;
    }

    static fromList(list) {
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
    addValue(value) {
      this.addKeyValue('_' + this.size, value);
    }

    addKeyValue(key, value) {
      if (this._names.has(key))
        throw new FtlRuntimeError("Tuple.addKeyValue(.): key " + key + " already exists!");

      this._names.set(key, this.size);
      this._values.push(value instanceof Tuple && value.size == 1 ? value.getIndex(0) : value);
    }

    /**
     * Invokes callback(key, value) for each pair of (key, value) in this tuple.
     */
    forEach(callback) {
      this._names.forEach((value, key, map) => {
        callback(key, this._values[value]);
      });
    }

    /**
     * Appends all element from another tuple. It will keep names of the elements if any. 
     */
    appendAll(tuple) {
      if (tuple == null)
        return;

      if (tuple instanceof Tuple)
        tuple.forEach((key, value) => key.startsWith('_') ? this.addValue(value) : this.addKeyValue(key, value));
      else
        this.addValue(tuple);
    }

    // returns list of all names
    //
    getNames() {
      return this._names.filter(key => !key.startsWith("_"));
    }

    // returns named element value
    get(key) {
      return this._values[this._names.get(key)];
    }

    // returns indexed value
    getIndex(index) {
      return this._values[index];
    }

    hasTail() {
      return this._values.find(elm => elm instanceof TailFn) !== undefined;
    }

    // checks if any element is a reference
    // it does not go into nested elements
    hasRef() {
      return this._values.find(elm => elm instanceof RefFn) !== undefined;
    }

    toList() {
      return this._values;
    }

    // Checkes equality of each value in both tuples sequentially. 
    equals(o) {
      if (!(o instanceof Tuple))
        return false;

      if (o.size != this.size)
        return false;

      for (var i = 0; i < this.size; i++) {
        var ith = this.getIndex(i);
        var oth = o.getIndex(i);
        if (ith != oth && (!(ith instanceof Tuple) || !ith.equals(oth)))
          return false;
      }
      return true;
    }

    // converts into a tuple fn
    // TODO presesrve names
    toTupleFn() {
      return new TupleFn(... this._values.map(elm => elm instanceof Fn ? elm : new ConstFn(elm)));
    }

    toString() {
      if (this._values.length == 0)
        return "()";

      var buf = []
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
  class Fn {

    // returns class name.
    get typeName() {
      return this.constructor.name;
    }

    // Applies function with input and context.
    apply(input, context) {
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

    // fns: function items
    constructor(... fns) {
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
  class WrapperFn extends Fn {

    // @param wrapped: any non-array Fn
    constructor(wrapped) {
      FnValidator.assertElmType(wrapped, Fn);

      super();
      this.wrapped = wrapped;
    }

    apply(input, context) {
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
  class ConstFn extends Fn {
    constructor(value) {
      FnValidator.assertNonNull(value, 'val is undefined or null!')

      super();

      // evaluate the value
      this.value = value instanceof Fn ? value.apply() : value;
    }

    get valueType() {
      return typeof this.value;
    }

    apply(input) {
      return this.value;
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

    // during construction, the value is computed and stored
    constructor(name, value) {
      super(value);
      this.name = name;
    }
  }

  /**
   * Variable function.
   */
  class VarFn extends ImmutableValFn {

    // during construction, the value is computed and stored
    constructor(name, value) {
      super(name, val);
    }

    // sets value
    set value(value) {
      if (value == undefined)
        throw new Error("value to VarFn can not be undefined!")
      this._val = val;
    }
  }

  /**
   * Native javascript function.
   */
  class NativeFunctionFn extends Fn {

    static NativeScriptFn = class extends Fn {
      constructor(jsfunc) {
        super();
        this.jsfunc = jsfunc;
      }

      apply(input) {
        return this.jsfunc.apply(null, (input instanceof Tuple) && input.toList() || [ input ]);
      }
    }

    // name:string function name
    // params:TupleFn parameter list
    // script: javascript function with parameter declaration and body.
    constructor(name, params, jsfunc) {
      FnValidator.assertElmType(params, TupleFn);
      FnValidator.assertElmsTypes(params.fns, RefFn, NamedExprFn, FunctionInterfaceFn);

      super();
      this.name = name;

      this.params = params;
      this.body = new ftl.NativeFunctionFn.NativeScriptFn(jsfunc);
    }

    // Builds parameter function
    //
    // @params a TupleFn

    static buildParameters(params) {
      if (params instanceof RefFn)
        return new TupleFn(params)
      var has_default = false;
      for (var i = 0; i < params.funcCount; i++) {
        if (!has_default && params.func(i) instanceof NamedExprFn)
          has_default = true;
        else if (has_defalt && params.func(i) instanceof RefFn)
          throw new Error("Non default argument " + params.func(i).name + " follows default argument.");
        params.setfunc(i, new NamedExprFn(params.func(i).name, new RefFn("_" + i)));
      }
      return params;
    }

    static buildParameters1(module, params) {
      //if (params instanceof RefFn)
      //  params = new TupleFn(params).build(module, new TupleFn());

//      var valid = params.isPureRefs;
      var default_count = 0;
      for (var i = 0; i < params.fns.length; i++) {
        var node = params.fns[i];

        if (node instanceof RefFn) {
          params.fns[i] = new NamedExprFn(node.name, new TupleSelectorFn(i));
        } else if (node instanceof NamedExprFn) {
           if (node.wrapped instanceof TupleSelectorFn) {
             if (node.wrapped.seq != '_' + i)
               throw new Error("Parameter " + node.name + " has tuple selector for the wrong sequence " + node.wrapped.seq + "!");
           } else
             params.fns[i] = new NamedExprFn(node.name, new SeqSelectorOrDefault(i, node.wrapped));
        }
      }
      return params;
    }

    apply(input) {
      if (FnUtil.isNone(input) && this.params.size > 0)
        throw new Error("Input to native function " + this.name + " does not match!");
      var paramValues = this.params.apply(input);
      var res = this.body.apply(paramValues);
      return res;
    }

    toString() {
      return this._name; 
    }
  }

  /**
   * Function function.
   */  
  class FunctionFn extends Fn {
    static FunctionBodyFn = class extends WrapperFn {
      constructor(expr) {
        super(expr);
      }

      apply(input, context) {
        var res = super.apply(input);
        var i = 0;
        while (res instanceof TailFn) {
          i++;
          if (i == 10000)
            break;
          if (context == this) {
            res._recursive = true;
            return res;
          }
          if (res.nextTail)
            res = res.executeRecursive(this);
          else {
            res = res.apply(this);
            if (!(res instanceof TailFn))
              break;
          }
        }
        return res;
      }
    }

    constructor(name, params, expr) {
      super();
      this.name = name;
      this.params = params;
      this.body = new ftl.FunctionFn.FunctionBodyFn(expr);
    }

    // This is called by general build, which simply returns this.
    build1(module, inputFn) {
      return this;
    }

    apply(input, context) {
      return this.body.apply(input, context);
    }
  }

  // This is used to represent functional argument in a function parameter declaration.
  //
  // For example, the y$() in :
  //   fn x || y$()
  //
  // properties:
  //   name
  //   params
  //   seq
  class FunctionInterfaceFn extends Fn {
    constructor(name, params, seq = 0) {
      super();
      this.name = name;
      this.params = params;
      this.seq = seq;
    }

    native_f(input) {
      return this.partial_input instanceof Tuple ? this.partial_input.getIndex(this.seq) : this.partial_input;
    }

    /**
     * Converts a javascript arguments into a tuple.
     */
    static js_args_to_tuple(params, args) {
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
    fn_ref(arg) {
      console.log("fn_ref arguments", arg)
      console.log("fn_ref closure", this.closure)

      var len = arguments.length;
      if (len == 0)
        return this.fn.apply(this.params);

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
          tpl = this.params.params.apply(FunctionInterfaceFn.js_args_to_tuple(arguments));
        } else
          tpl.addKeyValue(this.params.name, arg);
        start = 1;
      } else if (this.params instanceof TupleFn) {
        tpl = FunctionInterfaceFn.js_args_to_tuple(this.params, arguments);
        start = this.params.fns.length;
      }

      var res = this.fn.apply(tpl);
      return FnUtil.unwrapMonad(res);
    }

    apply(input) {
      if (this.isTail) {
        return pass_through.bind(new TailFn(this.wrapped, input));
      } else {
        return this.fn_ref.bind({fn: input.getIndex(this.seq), params: this.params});
      }
//      return this.native_f.bind({seq: this.seq, partial_input: input, params: this.params});
    }
  }

  /**
   * Stateful intermediate partial function storing function and partial parameters.
   */
  class PartialFunction {
    constructor(f, partialParams) {
      this.f = f;
      this.partialParams = partialParams;
    }

    apply(input) {
      var tuple = new Tuple();

      // TODO can not simply append
      tuple.appendAll(this.partialParams)
      tuple.appendAll(input)
      return this.f.apply(tuple);
    }
  }

  /**
   * This is functional, or higher order function that returns a partial function when being invoked.
   */
  class FunctionalFn extends WrapperFn {
    constructor(expr) {
      super(expr);
    }

    apply(input) {
      return new PartialFunction(this.wrapped, input);
    }
  }

  /**
   * Tuple function contains a list of named or non-named fns.
   */
  class TupleFn extends ComposedFn {
    
    constructor(... fns) {
      FnValidator.assetNoDupNames(... fns);
      super(... fns);
    }

    // Tells if this TupleFn contains a NamedExprFn element.
    hasName(name) {
      return this.getNamedFn(name) != null;
    }

    // Returns element with the name. 
    getNamedFn(name) {
      return FnUtil.getFn(this.fns, fn => fn instanceof NamedExprFn && fn.name == name);
    }

    apply(input, context) {
      var tuple = new Tuple();
      var len = this.fns.length;
      if (len == 0)
        return tuple;

      for (var i = 0; i < len; i++) {
        var fn = this.fns[i];

        var res = null;
        if (fn instanceof Fn)
          res = fn.apply(input);
        else {
          var tp = typeof(fn);
          if (tp == 'number' || tp == 'string' || tp == 'boolean' || Array.isArray(func))
            res = fn;
        }

        if (fn instanceof NamedExprFn) {

          // if no name is resolved, return itself
          if (res === fn.wrapped)
            return this;
          tuple.addKeyValue(fn.name, res);
        }
        else
          tuple.addValue(res);
      }

      return tuple;
    }
  }

  /**
   * Parameter tuple. It satisfy all tuple requirements, and supports default values after position parameters.
   * 
   * @params fns - list of simple name, function interface, or name with default value
   */
  class ParamTupleFn extends TupleFn {
    constructor( ... fns) {
      super(... fns);
    }

    validateInput(inputFn, minSize) {
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
/*
      var new_args = new Array(params.size);
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
      return need_new_args && new TupleFn(... new_args) || null;
    }

    build1(module, inputFn, ignoreInput) {
      FnUtil.validateTypes(this.fns, RefFn, NamedExprFn, FunctionInterfaceFn);

      super.build(module, inputFn);

      var default_count = 0;
      for (var i = 0; i < this.fns.length; i++) {
        var func = this.fns[i];

        // param with default value
        if (func instanceof NamedExprFn) {
          default_count++;
          this.fns[i] = new NamedExprFn(func.name, new SeqSelectorOrDefault(i, func.wrapped));
        }

        // position param
        else {
          if (default_count > 0)
            throw new Error("FTL0002: Position parameter at index " + i + " is after parameter with default value!");

          // simple param
          if (func instanceof RefFn)
            this.fns[i] = new NamedExprFn(func.name, new TupleSelectorFn(i));

          // function param
          else if (func instanceof FunctionInterfaceFn) {
            func.seq = i;
            this.fns[i] = new NamedExprFn(func.name, func);            
          }

          else
            throw new Error("FTL0003: Element at index " + i + " is not a qualified parameter!");
        }
      }

/*
      var min_param_sz = this.fns.length;
      for (var i = 0; i < this.fns.length; i++)
        if (this.fns[i].wrapped instanceof SeqSelectorOrDefault) {
          min_param_sz = i;
          break;
        }
*/
      // The following is for existanceof input.
      // This happens for anonymous inline functions.
      if (!ignoreInput) {
        if (!(inputFn instanceof TupleFn))
          inputFn = new TupleFn(inputFn).build(module, inputFn);
        var new_tuple = this.validateInput(inputFn, this.fns.length - default_count);
        return new_tuple ? new PipeFn(new_tuple, this) : this;
      }

      return this;
    }

    /**
     * This is for input with both positioned and named parameters.
     */
    build_input_adaptor(module, inputFn) {
      if (!(inputFn instanceof TupleFn))
        inputFn = new TupleFn(inputFn).build(module, inputFn);

      var names = new Set();
      var pos_sz = 0;
      for (var i = 0; i < inputFn.size; i++) {
        if (inputFn.fns[i] instanceof NamedExprFn) {
          names.add(inputFn.fns[i].name);
        } else if (names.size > 0) {
          throw new Error("Input position argument at index " + i + " after named argument!");
        } else
          pos_sz = i + 1;
      }

      // no named arguments
      if (names.size == 0)
        return this;

      var need_new_args = false;
      var new_args = new Array(params.length);
      for (var i = 0; i < this.params.length; i++) {
        var name = params.fns[i].name;
        if (i < pos_sz) {
          if (names.has(name)) {
            throw new Error("Parameter " + name + " is provided with both position and named argument!");
          }

          new_args[i] = inputFn.fns[i];
        }
        else if (!names.has(name)) {
          new_args[i] = params.fns[i];
          need_new_args = true;
        }
        else if (i < args.size && args.fns[i].name == name) {
          new_args[i] = args.fns[i];
        }
        else {
          new_args[i] = args.getNamedFn(name);
          need_new_args = true;
        }
      }

      if (!need_new_args) {
        return;
      } else {
        return new TupleFn(... new_args);
      }

      var new_tuple = this.validateInput(inputFn, this.fns.length - default_count);
      return new_tuple ? new PipeFn(new_tuple, this) : this;
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
  class NamedExprFn extends WrapperFn {
    constructor(name, elm) {
      super(elm);
      this.name = name;
    }

    // TODO: check use cases
    hasRef() {
      return this.elm instanceof RefFn;
    }

    get isConst() {
      return this.wrapped instanceof ConstFn;
    }
  }

  /**
   * This represents chains of tuple in form of:
   * (t1) -> (t2) ... -> (tn)
   */
  class PipeFn extends ComposedFn {
    constructor(... elements) {
      super(... elements)
    }

    /**
     * Creates a PipeFn
     */
    static createPipeFn(first, rest) {
      if (first instanceof PipeFn) {
        first.appendElements(rest);
        return first;
      } else if (rest instanceof PipeFn) {
        rest.prependElements(first);
        return rest;
      } else {
        var list = Array.isArray(first) ? list : [first];
        var ret = new PipeFn(Array.isArray(first) ? first : [first])
        ret.appendElements(rest);
        return ret;
      }
    }

    /**
     * Appends elements.
     */
    appendElements(elms) {
      var toBeAppended = Array.isArray(elms) ? elms : [elms];
      //this.modifyElements(toBeAppended);
      this.funs = this.funs.concat(toBeAppended);
    }

    /**
     * Prepends elements.
     */
    prependElements(elms) {
      var toBePrepended = Array.isArray(elms) ? elms : [elms];
      this.modifyElements(toBePrepended);
      this.funs = toBePrepended.concat(this.funs);
    }

    get elements() { return this.funs }

    modifyElements(list) {
      list.forEach(elm => {
        if (elm instanceof RefFn) {
          elm.tupleSeq = '_0';
        }
      });
    }

    apply(tuple, context) {
      var res = this.fns[0].apply(tuple, context);

      // there is name unresolved
      if (res === this.fns[0])
        return this;

      for (var i = 1; i < this.fns.length; i++) {
        if (res instanceof TailFn) {
          return new TailFn(new PipeFn([res._wrapped].concat(this.funs.slice(i))));
        } else if (res instanceof Tuple && res.hasTail()) {
          var nextTail = res.toTupleFn();
          res = new TailFn(new PipeFn(nextTail, ... this.fns.slice(i)));
          res.nextTail = nextTail;
          return res;
        }

        // still has unresolved ref
        else if (res instanceof Tuple && res.hasRef()) {
          return new PipeFn(... [res.toTupleFn()].concat(this.fns.slice(i)))
        }

        res = this.fns[i].apply(res, context)
        if (res)
          console.log("result of item " + i + ":", res);
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
  class RefFn extends Fn {
    constructor(name) {
      super();
      this.name = name;
    }

    // Tells if this is a tuple selector such as "_0", "_1", etc.
    isTupleSelector() {
      return this.name.match(TupleSelectorPattern) != null;
    }

    apply(input, context) {
      console.log("calculating ref for '" + this.name)
      console.log("input to RefFn:" + input)
      var e;

      // find name from scoped tuple first
      if (input && input instanceof Tuple)
        e = input.get(this.name);

      if (e !== undefined) {
        if (this.params != null) {
          if (typeof(e) == 'function') {
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
      else
        return this;
    }
  }

  /**
   * This function selects tuple element with 0 based sequence number.
   * 
   * For example:
   *   (1, 2, 3) -> (_2, _3) results in (2, 3)
   */
  class TupleSelectorFn extends Fn {
  
    constructor(seq) {
      if (seq == undefined || seq == null)
        throw new FnConstructionError('seq is undefined or null!');

      if ('number' != typeof seq)
        throw new FnConstructionError('seq is not number!');

      if (seq < 0)
        throw new FnConstructionError('seq is smaller than 0!');

      super();
      this.seq = seq;
    }

    apply(input) {
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
  class SeqSelectorOrDefault extends TupleSelectorFn {
    constructor(seq, defaultFn) {
      if (!(defaultFn instanceof Fn))
        throw new FnConstructionError('defaultFn is not instanceof Fn!');

      var default_val = defaultFn.apply();
      if (default_val instanceof Fn)
        throw new FnConstructionError('defaultFn is not a constant or constant expresion!');

      super(seq);
      this.defaultValue = default_val;
    }

    apply(input) {
      var sv = super.apply(input);
      if (sv !== undefined && sv != null)
        return sv;
      return this.defaultValue;
    }
  }

   /**
   * This fn wraps an expression with calling parameters.
   */
  class ExprFn extends WrapperFn {
    constructor(f, ... paramtuples) {
      FnValidator.assertElmsTypes(paramtuples, Fn);

      super(f);
      this.paramtuples = paramtuples;
    }

    apply(input) {
      var ret = super.apply(input);
      for (var i = 0; i < this.paramtuples.length; i++)
        ret = ret.toTupleFn().apply(this.paramtuples[i].apply(input));
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
  class CallExprFn extends Fn {
    constructor(name, params) {
      super();
      this.name = name;
      this.params = params;
    }

    apply(input) {
      var f = input.get(this.name);
      if (!(f instanceof Fn))
        throw new Error(this.name + " is not a functional expression. Can not be invoked as " + this.name + "(...)");
      var ret = f.apply(this.params[0].apply(input));
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
  class ExprRefFn extends WrapperFn {
    constructor(fnl, expr) {
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
    fn_ref(arg) {
      console.log("fn_ref arguments", arg)
      console.log("fn_ref closure", this.closure)

      var len = arguments.length;
      if (len == 0)
        return this.wrapped.apply(this.closure)

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
          tpl = this.params.params.apply(js_args_to_tuple(arguments));
        } else
          tpl.addKeyValue(this.params.name, arg);
        start = 1;
      } else if (this.params instanceof TupleFn) {
        tpl = this.params.apply(js_args_to_tuple(arguments));
        start = this.params.fns.length;
      }

      for (var i = start; i < arguments.length; i++) {
          tpl.addValue(arguments[i]);
      }

      var res = this.wrapped.apply(tpl);
      return (res instanceof Tuple && res.size == 1) ? res.get('_0') : res;
    }

    build1(module, inputFn) {
      //this.params = this.params.build(module, inputFn);
      return this;
    }

    apply(input) {
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

  class TailFn extends WrapperFn {
    constructor(fn, closure) {
      super(fn);
      this.closure = closure;
      this._nextTail = null;
    }

    set nextTail(nextTail) {
      this._nextTail = nextTail;
    }

    get nextTail() {
      return this._nextTail;
    }

    executeRecursive(context) {
      if (this._nextTail instanceof TupleFn) {
        var tuple = this._nextTail.tuple;
        for (var i = 0; i < tuple.length; i++) {
          var elm = tuple[i];
          if (elm instanceof TailFn) {
            var next = elm.apply(context);
            if (next instanceof TailFn) {
              this._nextTail = next._nextTail;
              tuple[i] = next.wrapped;
            }

            // end of recursive
            else {
              this._nextTail = null;
              tuple[i] = next;
            }
          }
        }
      }
      return this;
    }

    apply(context) {
      var res = this.wrapped.apply(this.closure, context);
      return res;
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
  class ArrayElementSelectorFn extends Fn {
    constructor(name, index) {
      super()
      this.name = name;
      this.index = index;
    }

    apply(input) {
      let list = input && (
        input instanceof Tuple && (input.get(this.name) || null)
        || ((this.name == '_' || this.name == '_0') && input)
        || []
      );

      if (list instanceof VarFn)
        list = list.value;

      if (list)
        return list[this.index] || null;

      else
        return this;
    }
  }

  /**
   * Simple type function.
   */
  class SimpleTypeFn {
    constructor(id, paramList, script) {
      if (paramList.length == 1 && paramList[0].startsWith('/')) {
        regex = regex.substring(1, regex.length - 1);
        regex = regex.replace('\\', '\\\\')
        this.regex = new RegExp(regex);
      }
      this.internal = eval("(function(value)" + script + ")");
    }

    apply(input) {
      if (typeof input === 'string') {
        var match = input.match(this.regex);
        if (match == null) {
          throw {message: input + " does not match pattern" }
        }
        return this.internal.apply(null, match);
      }
    }
  }

  // runtime modules
  var modules = new Map();

  // returns module with name.
  function getModule(name)  {
    return modules.get(name)
  }

  // adds a module with name.
  function addModule(name, module) {
    if (modules.has(name))
      throw new Error("Module with name '" + name + "' already exists!");
    modules.set(name, module);
  }

  return {
    Module: Module,
    Tuple: Tuple,
    Fn: Fn,
    WrapperFn: WrapperFn,
    ConstFn: ConstFn,
    ImmutableValFn: ImmutableValFn,
    VarFn: VarFn,
    ParamTupleFn: ParamTupleFn,
    SeqSelectorOrDefault: SeqSelectorOrDefault,
    NativeFunctionFn: NativeFunctionFn,
    FunctionFn: FunctionFn,
    FunctionInterfaceFn: FunctionInterfaceFn,
    FunctionalFn: FunctionalFn,
    TupleFn: TupleFn,
    NamedExprFn: NamedExprFn,
    PipeFn: PipeFn,
    RefFn: RefFn,
    TupleSelectorFn: TupleSelectorFn,
    CallExprFn: CallExprFn,
    ExprRefFn: ExprRefFn,
    ExprFn: ExprFn,
    TailFn: TailFn,
    ArrayElementSelectorFn: ArrayElementSelectorFn,
    SimpleTypeFn: SimpleTypeFn,
    getModule: getModule,
    addModule: addModule,
    validateBuild: validateBuild,
    FnValidator: FnValidator
  }
})();
