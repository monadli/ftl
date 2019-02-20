// ftl core functions and classes.
var ftl = (function() {

  var version = '0.0.0.2';
  var TupleSelectorPattern = /_\d+$/;

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

  class FtlBuildError extends Error {
    constructor(... params) {
      super(... params);
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
      this._name = name;
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
      if (!this._name) {
        this._name = name
      } else {
        throw new Error("The module name already set as " + this._name);
      }
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

    // TODO: no need for name
    addFn(name, f) {
      if (this._functions[name] != null)
        throw { message: "'" + name + "' exists and can not be declared again!"}

      this._functions[name] = f;
      f.buildFunction(this);
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
      this._executables.push(exec.build(this, new TupleFn()));
    }

    get executables() { return this._executables }

    resolveRecursiveRef(f, expr) {
      if (expr instanceof RefFn || expr instanceof ArrayElementSelectorFn) {
        if (expr.name == f.name)
          expr.possibleRef = f;
      }

      else if (expr instanceof PipeFn || expr instanceof TupleFn)
        expr.elements.forEach(elm => this.resolveRecursiveRef(f, elm));

      else if (expr instanceof WrapperFn) {
        this.resolveRecursiveRef(f, expr.wrapped);
      }
    }
  }

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
        throw new FtlRuntimeError("Tuple.addKeyValue(...): key " + key + " already exists!");

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

    // returns class name in string.
    get typeName() {
      return this.constructor.name;
    }

    // Build the function.
    // It resolves references and potentially performs optimization.
    //
    // @model the model where all functions and executables are defined
    // @inputFn input function
    // @return rebuilt function
    build(model, inputFn) {
      return this;
    }

    // Applies function with input and context.
    apply(input, context) {
      return new Tuple();
    }
  }

  /**
   * This class is used to define a function composed of child functions.
   * 
   * This class does not override build(...) because it has no knowledges how the function is composed.
   * Any subclass should provide build(...) themselves.
   * 
   * properties:
   * fnodes: list of child functions
   */
  class ComposedFn extends Fn {

    // fnodes: function items
    constructor(... fnodes) {
      if (!Array.isArray(fnodes))
        throw new FnConstructionError('fnodes is not an array!');

      fnodes.forEach(fnode => {
        if (!(fnode instanceof Fn)) {
          throw new FnConstructionError('some fnodes ' + fnode + ' is not Fn!');
        }
      });

      super()
      this.fnodes = fnodes || []
    }

    get size() {
      return this.fnodes.length;
    }
  }

  /**
   * Function with fnode functions.
   */
  class WrapperFn extends Fn {

    // wrapped: any non-array Fn
    constructor(wrapped) {

      if (!wrapped || !(wrapped instanceof Fn))
        throw new FnConstructionError('WrapperFn', 'wrapped is not an Fn.');

      super();
      this.wrapped = wrapped;
    }

    build(model, inputFn) {
      this.wrapped = this.wrapped.build(model, inputFn);
      return this;
    }

    apply(input, context) {
      return this.wrapped.apply(input, context);
    }

    toString() {
      return this.wrapped.toString();
    }
  }

  /**
   * Constant function.
   * 
   * Properties:
   *   value
   */
  class ConstFn extends Fn {
    constructor(value) {
      if (FnUtil.isNone(value))
        throw new FnConstructionError('val is undefined or null!')

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

    // name:string function name
    // params:ParamTupleFn parameter list
    // script:string script body
    constructor(name, params, script) {
      super();
      this.name = name;

      this.params = params;
      this.script = script;
    }

    // Builds parameter function
    //
    // @params a TupleFn

    static buildParameters(params) {
      if (params instanceof RefFn)
        return new TupleFn(params)
      var has_default = false;
      for (var i = 0; i < params.fnodeCount; i++) {
        if (!has_default && params.fnode(i) instanceof NamedExprFn)
          has_default = true;
        else if (has_defalt && params.fnode(i) instanceof RefFn)
          throw new Error("Non default argument " + params.fnode(i).name + " follows default argument.");
        params.setFnode(i, new NamedExprFn(params.fnode(i).name, new RefFn("_" + i)));
      }
      return params;
    }

    static buildParameters1(module, params) {
      //if (params instanceof RefFn)
      //  params = new TupleFn(params).build(module, new TupleFn());

//      var valid = params.isPureRefs;
      var default_count = 0;
      for (var i = 0; i < params.fnodes.length; i++) {
        var node = params.fnodes[i];

        if (node instanceof RefFn) {
          params.fnodes[i] = new NamedExprFn(node.name, new TupleSelectorFn(i));
        } else if (node instanceof NamedExprFn) {
           if (node.wrapped instanceof TupleSelectorFn) {
             if (node.wrapped.seq != '_' + i)
               throw new Error("Parameter " + node.name + " has tuple selector for the wrong sequence " + node.wrapped.seq + "!");
           } else
             params.fnodes[i] = new NamedExprFn(node.name, new SeqSelectorOrDefault(i, node.wrapped));
        }
      }
      return params;
    }

    // This is called by module when adding a function into module. 
    buildFunction(module) {
      this.params = this.params.build(module, new TupleFn(), true);

      if (typeof this.script != 'function') {
        var param_list = [];
        if (this.params != null) {
          for (var i = 0; i < this.params.fnodes.length; i++) {
            var param = this.params.fnodes[i];

            // TODO what is the case for param as string
            if (typeof param == 'string')
              param_list.push(param)
            else
              param_list.push(param.name);
          }
        }

        this.script = eval("(function(" + param_list.join(',') + ")" + this.script + ")");
      }      
    }

    static validateInput(args, params, minSize) {
      var names = new Set();
      var pos_sz = 0;
      for (var i = 0; i < args.size; i++) {
        if (args.fnodes[i] instanceof NamedExprFn) {
          names.add(args.fnodes[i].name);
        } else if (names.size > 0) {
          throw new Error("Position argument at index " + i + " after named argument!");
        } else
          pos_sz = i + 1;
      }

      if (names.size == 0 && args.size >= minSize)
        return null;

      var need_new_args = false;
      var new_args = new Array(params.size);
      for (var i = 0; i < params.size; i++) {
        var name = params.fnodes[i].name;
        if (i < pos_sz) {
          if (names.has(name)) {
            throw new Error("Parameter " + name + " is provided with both position and named argument!");
          }
          
          new_args[i] = args.fnodes[i];
        }
        else if (!names.has(name)) {
          new_args[i] = params.fnodes[i];
          need_new_args = true;
        }
        else if (i < args.size && args.fnodes[i].name == name) {
          new_args[i] = args.fnodes[i];
        }
        else {
          new_args[i] = args.getElement(name);
          need_new_args = true;
        }
      }

      if (!need_new_args) {
        return;
      } else {
        return new TupleFn(... new_args);
      }
    }

    // This is called by general build, not for building function itself.
    build(module, inputFn) {
      if (!(inputFn instanceof TupleFn))
        inputFn = new TupleFn(inputFn).build(module, inputFn);

      var min_param_sz = this.params.size;
      for (var i = 0; i < this.params.size; i++)

        // functional
        if (this.params.fnodes[i] instanceof RefFn) {
          inputFn.fnodes[i] = new FunctionalFn(inputFn.fnodes[i]);
        }
        else if (this.params.fnodes[i].wrapped instanceof SeqSelectorOrDefault) {
          min_param_sz = i;
          break;
        }

      var new_tuple = NativeFunctionFn.validateInput(inputFn, this.params, min_param_sz);
      return new_tuple ? new PipeFn(new_tuple, this) : this;
    }

    apply(input) {
      if (FnUtil.isNone(input) && this.params.size > 0)
        throw new Error("Input to native function " + this.name + " does not match!");
      var paramValues = this.params.apply(input).toList();
      var res = this.script.apply(null, paramValues)
      return res
    }

    toString() {
      return this._name; 
    }
  }

  /**
   * Function function.
   */  
  class FunctionFn extends WrapperFn {
    constructor(name, params, expr) {
      super(new PipeFn(params, expr));
      this.name = name;
      this.params = this.wrapped.fnodes[0];
    }

    // This is called by module when adding a function into module 
    buildFunction(module) {
      this.wrapped = this.wrapped.build(module, new TupleFn());
      this.params = this.wrapped.fnodes[0];
    }

    // This is called by general build, which simply returns this.
    build(module, inputFn) {
      return this;
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

  // This is used to represent functional argument in a function parameter declaration.
  //
  // For example, the y$() in :
  //   fn x || y$()
  //
  // properties:
  //   name
  //   params
  //   is
  class FunctionInterfaceFn extends Fn {
    constructor(name, params) {
      super();
      this.name = name;
      this.params = params;

      if (name.endsWith('$') && name.length > 1) {
        this.name = name.substr(0, name.length - 1);
        this.is_tail = true;
      } else {
        this.name = name;
      }

      this.params = params;
      this.seq = 0;
    }

    native_f(input) {
      return this.partial_input instanceof Tuple ? this.partial_input.getIndex(this.seq) : this.partial_input;
    }

    /**
     * Converts a javascript arguments into a tuple.
     */
    static js_args_to_tuple(params, args) {
      var ret = new Tuple();
      for (var i = 0; i < params.fnodes.length; i++)
        ret.addKeyValue(params.fnodes[i].name, args[i]);
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
        start = this.params.fnodes.length;
      }

      var res = this.fn.apply(tpl);
      return FnUtil.unwrapMonad(res);
    }

    build(module, inputFn) {
      return this;
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
   * Tuple function that contains list of elements, named or non-named.
   */
  class TupleFn extends ComposedFn {
    
    constructor(... fnodes) {
      
      super(... fnodes)
    }

    // Tells if this TupleFn contains a NamedExprFn element.
    hasName(name) {
      return this.getElement(name) != null;
    }

    // Returns element with the name. 
    getElement(name) {
      for (var i = 0; i < this.fnodes.length; i++) {
        var fnode = this.fnodes[i];
        if (fnode instanceof NamedExprFn && fnode.name == name)
          return fnode;
      }

      return null;
    }

    // Checks duplicate names
    build(module, inputFn) {
      var names = new Set();

      for (var i = 0; i < this.fnodes.length; i++) {
        var fnode = this.fnodes[i];

        if (fnode instanceof NamedExprFn) {
          if (names.has(fnode.name))
            throw new Error("Name " + fnode.name + " is defined more than once!");
          names.add(fnode.name);
          continue;
        }

        // build the node
        this.fnodes[i] = fnode = fnode.build(module, inputFn);
      }

      // TODO
      // return this.fnodes.length == 1 ? this.fnodes[0] : this;
      return this;
    }

    // Builds the tuple fn as function arguments
    buildArguments(module, inputFn) {

      function validateArguments(tuple) {

        var names = new Set();

        for (var i = 0; i < tuple.fnodes.length; i++) {
          var fnode = tuple.fnodes[i];

          if (fnode instanceof NamedExprFn) {
            if (names.has(fnode.name))
              throw new Error("Name " + fnode.name + " is defined more than once!");
            names.add(fnode.name);
            continue;
          }

          else if (!(fnode instanceof RefFn))
            throw new Error("Element at index " + i + " is not an indentifier!");

          else if (names.size > 0)
            throw new Error("Position element at index " + i + " is after named elements!");
        }
      }

      validateArgument(this);

      for (var i = 0; i < this.fnodes.length; i++) {
        var fnode = this.fnodes[i];
        if (fnode instanceof RefFn)
          this.fnodes[i] = new NamedExprFn(fnode.name, new TupleSelectorFn(i));
        else
          this.fnodes[i] = new NamedExprFn(fnode.name, new SeqSelectorOrDefault(i, node.wrapped));
      }

      // TODO
      // return this.fnodes.length == 1 ? this.fnodes[0] : this;
      return this;
    }

    // Shallow clone.
    clone() {
      return new TupleFn(... this.fnodes);
    }

    apply(input, context) {
      var tuple = new Tuple();
      var len = this.fnodes.length;
      if (len == 0)
        return tuple;

      for (var i = 0; i < len; i++) {
        var fnode = this.fnodes[i];

        var res = null;
        if (fnode instanceof Fn)
          res = fnode.apply(input);
        else {
          var tp = typeof(fnode);
          if (tp == 'number' || tp == 'string' || tp == 'boolean' || Array.isArray(fnode))
            res = fnode;
        }

        if (fnode instanceof NamedExprFn) {

          // if no name is resolved, return itself
          if (res === fnode.wrapped)
            return this;
          tuple.addKeyValue(fnode.name, res);
        }
        else
          tuple.addValue(res);
      }

      return tuple;
    }
  }

  /**
   * Parameter tuple. It satisfy all tuple requirements, and supports default values after position parameters.
   */
  class ParamTupleFn extends TupleFn {
    constructor( ... fnodes) {
      super(... fnodes)
    }

    validateInput(inputFn, minSize) {
      var names = new Set();
      var pos_sz = 0;
      for (var i = 0; i < inputFn.size; i++) {
        if (inputFn.fnodes[i] instanceof NamedExprFn) {
          names.add(inputFn.fnodes[i].name);
        } else if (names.size > 0) {
          throw new Error("Position argument at index " + i + " after named argument!");
        } else
          pos_sz = i + 1;
      }

      // when there are only positioned arguments and are more than minimal
      if (names.size == 0 && inputFn.fnodes.length >= minSize)
        return null;

      var need_new_args = false;
/*
      var new_args = new Array(params.size);
      for (var i = 0; i < params.size; i++) {
        var name = params.fnodes[i].name;
        if (i < pos_sz) {
          if (names.has(name)) {
            throw new Error("Parameter " + name + " is provided with both position and named argument!");
          }

          new_args[i] = args.fnodes[i];
        }
        else if (!names.has(name)) {
          new_args[i] = params.fnodes[i];
          need_new_args = true;
        }
        else if (i < args.size && args.fnodes[i].name == name) {
          new_args[i] = args.fnodes[i];
        }
        else {
          new_args[i] = args.getElement(name);
          need_new_args = true;
        }
      }
*/
      return need_new_args && new TupleFn(... new_args) || null;
    }

    build(module, inputFn, ignoreInput) {
      super.build(module, inputFn);

      var default_count = 0;
      for (var i = 0; i < this.fnodes.length; i++) {
        var fnode = this.fnodes[i];
        if (fnode instanceof NamedExprFn) {
          default_count++;
          this.fnodes[i] = new NamedExprFn(fnode.name, new SeqSelectorOrDefault(i, fnode.wrapped));
        }
        else {
          if (default_count > 0)
            throw new Error("Position element at index " + i + " is after named elements!");
          if (fnode instanceof RefFn)
            this.fnodes[i] = new NamedExprFn(fnode.name, new TupleSelectorFn(i));
          else if (fnode instanceof FunctionInterfaceFn) {
            fnode.seq = i;
            this.fnodes[i] = new NamedExprFn(fnode.name, fnode);            
          }
          else
            throw new Error("Element at index " + i + " is not an id nor id with default value!");
        }
      }

/*
      var min_param_sz = this.fnodes.length;
      for (var i = 0; i < this.fnodes.length; i++)
        if (this.fnodes[i].wrapped instanceof SeqSelectorOrDefault) {
          min_param_sz = i;
          break;
        }
*/
      // The following is for existanceof input.
      // This happens for anonymous inline functions.
      if (!ignoreInput) {
        if (!(inputFn instanceof TupleFn))
          inputFn = new TupleFn(inputFn).build(module, inputFn);
        var new_tuple = this.validateInput(inputFn, this.fnodes.length - default_count);
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
        if (inputFn.fnodes[i] instanceof NamedExprFn) {
          names.add(inputFn.fnodes[i].name);
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
        var name = params.fnodes[i].name;
        if (i < pos_sz) {
          if (names.has(name)) {
            throw new Error("Parameter " + name + " is provided with both position and named argument!");
          }

          new_args[i] = inputFn.fnodes[i];
        }
        else if (!names.has(name)) {
          new_args[i] = params.fnodes[i];
          need_new_args = true;
        }
        else if (i < args.size && args.fnodes[i].name == name) {
          new_args[i] = args.fnodes[i];
        }
        else {
          new_args[i] = args.getElement(name);
          need_new_args = true;
        }
      }

      if (!need_new_args) {
        return;
      } else {
        return new TupleFn(... new_args);
      }

      var new_tuple = this.validateInput(inputFn, this.fnodes.length - default_count);
      return new_tuple ? new PipeFn(new_tuple, this) : this;
    }

    clone() {
      return new ParamTupleFn(... this.fnodes);
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
   * This represents function chains in form of:
   * f1 -> f2 ... -> fn
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

    build(module, inputFn) {
      var prev = inputFn;
      for (var i = 0; i < this.fnodes.length; i++) {
        this.fnodes[i] = this.fnodes[i].build(module, prev);

        // pure single ref, replace with (NamedExprFn(name, ...))
        if (this.fnodes[i] instanceof RefFn && !this.fnodes[i].name.startsWith('_')) {

          var ref = (inputFn == null || inputFn == undefined || !(inputFn instanceof TupleFn || (inputFn instanceof TupleFn && !inputFn.hasName(this.fnodes[i].name)))) ?
            new TupleSelectorFn(0) : this.fnodes[i];
            this.fnodes[i] = new TupleFn(new NamedExprFn(this.fnodes[i].name, ref));
        }
        prev = this.fnodes[i];
      }

      // expands contained PipeFn elements which may be before or after build
      for (var i = this.fnodes.length; i >= 0; i--)
        if (this.fnodes[i] instanceof PipeFn)
          this.fnodes.splice(i, 1, ... this.fnodes[i].fnodes);

      return this;
    }

    apply(tuple, context) {
      var res = this.fnodes[0].apply(tuple, context);

      // there is name unresolved
      if (res === this.fnodes[0])
        return this;

      for (var i = 1; i < this.fnodes.length; i++) {
        if (res instanceof TailFn) {
          return new TailFn(new PipeFn([res._wrapped].concat(this.funs.slice(i))));
        } else if (res instanceof Tuple && res.hasTail()) {
          var nextTail = res.toTupleFn();
          res = new TailFn(new PipeFn(nextTail, ... this.fnodes.slice(i)));
          res.nextTail = nextTail;
          return res;
        }

        // still has unresolved ref
        else if (res instanceof Tuple && res.hasRef()) {
          return new PipeFn(... [res.toTupleFn()].concat(this.fnodes.slice(i)))
        }

        res = this.fnodes[i].apply(res, context)
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

    build(module, inputFn) {
      if (this.name.startsWith('_') || inputFn instanceof TupleFn && inputFn.hasName(this.name))
        return this;

      var f = module.getAvailableFn(this.name);
      if (f)
        return f.build(module, inputFn);

      return this;
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
   * This function selects tuple element.
   */
  class TupleSelectorFn extends Fn {
  
    constructor(seq) {
      if (seq == undefined || seq == null)
        throw new FnConstructionError('seq is undefined or null!');

      if ('number' != typeof seq)
        throw new FnConstructionError('seq is not string!');

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
    }
  }

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
    constructor(f, params) {
      super(f);
      this.params = params;
    }

    build(module, inputFn) {
      super.build(module, inputFn);
      for (var i = 0; i < this.params.length; i++)
        this.params[i] = this.params[i].build(module, inputFn);
      return this;      
    }

    apply(input) {
      var ret = super.apply(input);
      for (var i = 0; i < this.params.length; i++)
        ret = ret.toTupleFn().apply(this.params[i].apply(input));
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

    combine(... tuples) {
      function split(tuple) {
        for (var i = 0; i < tuple.size; i++) {
          if (tuple.fnodes[i] instanceof NamedExprFn)
            return [tuple.fnodes.slice(0, i), tuple.fnodes.slice(i)];
        }
        return [tuple.fnodes, []];
      }

      if (tuples.length == 1)
        return tuples[0];

      var pos_elms = [];
      var name_elms = new Map();
      tuples.forEach(function(tuple) {
        var sections = split(tuple);
        pos_elms.push(... sections[0]);
        sections[1].forEach(function(name_elm) {
          name_elms.set(name_elm.name, name_elm);
        })
      });

      return new TupleFn(... pos_elms, ... name_elms.values());
    }

    build(module, inputFn) {

      if (inputFn instanceof TupleFn && inputFn.hasName(this.name)) {
        for (var i = 0; i < this.params.length; i++)
          this.params[i] = this.params[i].build(module, inputFn);
        return this;
      }

      else if (module.hasFn(this.name)) {
        var f = module.getAvailableFn(this.name);
        if (f) {
          var f_params = f.params.fnodes;

          var params_len = f_params.length;
          
          var input = (inputFn instanceof TupleFn) ? inputFn : new TupleFn(inputFn);
          var combined = this.combine(... this.params, input);
          
          for (var i = 0; i < params_len; i++)
            if (f_params[i].wrapped && f_params[i].wrapped instanceof FunctionInterfaceFn)
              combined.fnodes[i] = new ExprRefFn(f_params[i].wrapped, combined.fnodes[i]);

          // TODO combine following two parts
          var built = f.build(module, combined);
          if (built == f)
            return new PipeFn(combined, f);
          else
            return built;

          var curry_params_len = this.params[0].size;
          var ret = null;
          if (curry_params_len >= params_len)
            ret = new PipeFn(this.params[0], f);
          else if (inputFn instanceof TupleFn && inputFn.size + curry_params_len.size >= params_len) {
            new TupleFn(... inputFn.slice(0, params_len - this.params[0].size))
            var extra = NativeFunctionFn.validateInput(inputFn, this.params[0]);
            
            ret = new PipeFn(new TupleFn(... inputFn.slice(0, params_len - this.params[0].size), ... this.params[0].fnodes), f);
          }
          else if (!(inputFn instanceof TupleFn) && this.params[0].size + 1 >= params_len)
            ret = new PipeFn(new TupleFn(inputFn, ... this.params[0].fnodes), f);
          else
            throw new Error("calling arguments to " + f + " does not match argument number!"); 

          return ret.build(module, inputFn);
        }
      }

      throw new Error(this.name + " can not be resolved.");
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
        start = this.params.fnodes.length;
      }

      for (var i = start; i < arguments.length; i++) {
          tpl.addValue(arguments[i]);
      }

      var res = this.wrapped.apply(tpl);
      return (res instanceof Tuple && res.size == 1) ? res.get('_0') : res;
    }

    build(module, inputFn) {
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
   * @parameter name - name of a list
   * @ index - index of element
   */
  class ArrayElementSelectorFn extends Fn {
    constructor(name, index) {
      super()
      this.name = name.name;
      this.index = (index instanceof RefFn) ? index.name : parseInt(index);
    }

    apply(input) {
      var list;
      if (input && input instanceof Tuple)
        list = input.get(this.name);


      if (list instanceof VarFn)
        list = list.value;

      if (list) {
        var i = typeof(this.index) == 'number' ? this.index : input.get(this.index)
        return list[i];
      }

      // no reference found
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

  class FnUtil {
    // unwraps the single value of tuple that contains a single value (monad) 
    static unwrapMonad(tuple) {
      return tuple instanceof Tuple && tuple.size == 1 ? FnUtil.unwrapMonad(tuple.getIndex(0)) : tuple;
    }

    // test if an element is undefined or null
    static isNone(elm) {
      return elm === undefined || elm == null;
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
    NativeFunctionFn: NativeFunctionFn,
    FunctionFn: FunctionFn,
    FunctionInterfaceFn: FunctionInterfaceFn,
    TupleFn: TupleFn,
    NamedExprFn: NamedExprFn,
    PipeFn: PipeFn,
    RefFn: RefFn,
    CallExprFn: CallExprFn,
    ExprRefFn: ExprRefFn,
    ExprFn: ExprFn,
    TailFn: TailFn,
    ArrayElementSelectorFn: ArrayElementSelectorFn,
    SimpleTypeFn: SimpleTypeFn,
    FtlBuildError: FtlBuildError,
    getModule: getModule,
    addModule: addModule
  }
})();
