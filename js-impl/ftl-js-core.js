// ftl functions and classes.
var ftl = (function() {

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

  function function_ref(arg) {
    console.log("function_ref arguments", arg)
    console.log("function_ref closure", this.closure)

    var len = arguments.length;
    if (len == 0)
      return this.f.apply(this.closure)

    var tpl = new Tuple();
    
    // has parameters
    // no named parameters
    var start = 0;
    if (this.params instanceof RefFn) {
      if (this.params.name === 'raw')
        return this.f.apply(arg);

      tpl.addKeyValue(this.params.name, arg);
      start = 1;
    } else if (this.params instanceof TupleFn) {
      var keys = this.params.list;
      start = keys.length;

      for (var i = 0; i < arguments.length; i++)
        tpl.addKeyValue(keys[i].name, arguments[i]);
    }

    for (var i = start; i < arguments.length; i++) {
        tpl.addValue(arguments[i]);
    }

    return this.f.apply(tpl);
  }

  /**
   * Error thrown at any function construction.
   */
  class FnConstructionError extends Error {
    constructor(...params) {
      super(...params);
      var start = this.stack.indexOf(' at new ') + 8;
      this.message = this.stack.substring(start, this.stack.indexOf(' ', start)) + ': ' + this.message;
    }
  }

  class FtlBuildError extends Error {
    constructor(...params) {
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
      this._executables.push(exec.build(this));
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
      this._map = new Map();
//      this._list = []
      this._size = 0;
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
      return this._size;
    }

    // add value without id
    addValue(value) {
//      this._list.push(value)
      this._map.set("_" + this._size++, value);
    }

    // add key for index
    setKey(index, key) {
      this._map.set(key, this._map.get("_" + index));
    }

    addKeyValue(key, value) {
//      this._list.push(value)
      this._map.set("_" + this._size++, value);
      this._map.set(key, value);
    }

    replaceValue(key, value) {
      this._map.set(key, value);
    }

    copyAllFrom(anotherTuple) {
      if (anotherTuple == null)
        return

      if (anotherTuple instanceof Tuple)
        anotherTuple.toList().forEach(elm => this.addValue(elm));
      else
        this.addValue(anotherTuple);
    }

    getNamedKeys() {
      var keys = [];
      for (let key of this._map.keys()) {
        if (!key.startsWith("_"))
          keys.push(key)
      }
      return keys;
    }

    get(key) {
      // if (key.startsWith('_')) {
      //   var ind = parseInt(key.substring(1))
      //   return ind < this._list.length ? this._list[ind] : null
      // }
      return this._map.get(key);
    }

    hasTail() {
      for (var i = 0; i < this._size; i++)
        if (this.get('_' + i) instanceof TailFn)
          return true;
      return false
    }

    // checks if any element is a reference
    // it does not go into nested elements
    hasRef() {
      for (var i = 0; i < this._size; i++)
        if (this.get('_' + i) instanceof RefFn)
          return true;
      return false
    }

    toList() {
      var list = [];
      for (var i = 0; i < this._size; i++)
        list.push(this.get('_' + i))
      return list
    }

    equals(o) {
      if (!(o instanceof Tuple))
        return false;

      if (o.size != this.size)
        return false;

      for (var i = 0; i < this._size; i++) {
        var ith = this.get('_' + i);
        var oth = o.get('_' + i);
        if (ith != oth && (!(ith instanceof Tuple) || !ith.equals(oth)))
            return false;
      }
      return true;
    }

    toString() {
      if (this._size == 0)
        return "()"

      var buf = []
      var i = 0
      var last = null 
      for (var [key, value] of this._map) {
        if (key.startsWith('_')) {
          if (last) {
            buf.push(last)
            i++
          }
          last = getValueString(value)
        } else {
          buf.push(key + ':' + getValueString(value))
          i++
          last = null
        }
        if (i == this._size)
          break
      }

      if (i < this._size && last)
        buf.push(last)

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
    constructor(...fnodes) {
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
      if (value === undefined || value === null)
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

  class DummyParamTuple {
    
  }

  /**
   * Native javascript function.
   */
  class NativeFunctionFn extends Fn {

    // name:string function name
    // params:TupleFn parameter names
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
      for (var i = 0; i < params.fnodeCount; i++) {
        params.setFnode(i, new NamedExprFn(params.fnode(i).name, new RefFn("_" + i)));
      }
      return params;
    }

    // extracts parameter names
    // @params array of parameter list
    extractParams(params) {
      var param_list = [];
      if (params == null)
        return param_list;
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        if (typeof param == 'string')
          param_list.push(param)
        else if (param instanceof RefFn)
          param_list.push(param.name);
        else
          param_list.push(param.id);
      }
      return param_list;
    }

    // This is called by module when adding a function into module 
    buildFunction(module) {
      this.params = this.params.build(module, new TupleFn())

      if (typeof this.script != 'function') {
        var param_list = [];
        if (this.params != null) {
          for (var i = 0; i < this.params.fnodes.length; i++) {
            var param = this.params.fnodes[i];

            // TODO what is the case for param as string
            if (typeof param == 'string')
              param_list.push(param)
            else if (param instanceof NamedExprFn)
              param_list.push(param.name);
          }
        }

        this.script = eval("(function(" + param_list.join(',') + ")" + this.script + ")");
      }      
    }

    // This is called by general build, which simply returns this.
    build(module, inputFn) {
      return this;
    }

    apply(input) {
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
      super(new PipeFn(NativeFunctionFn.buildParameters(params), expr));
      this.name = name;
      this.params = this.wrapped.fnodes[0];
    }

    // This is called by module when adding a function into module 
    buildFunction(module) {
      this.wrapped = this.wrapped.build(module, new TupleFn());
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

  class PartialFunctionFn extends WrapperFn {
    constructor(f, partialParams) {
      super(f)
      this._partialParams = partialParams;
    }

    apply(input) {
      var tuple = new Tuple();
      tuple.copyAllFrom(input)
      tuple.copyAllFrom(this._partialParams)
      return super.apply(tuple);
    }
  }

  /**
   * Tuple function that contains list of elements.
   */
  class TupleFn extends ComposedFn {
    constructor(...fnodes) {
      super(...fnodes)
    }

    // Tells if this TupleFn contains a NamedExprFn element.
    hasName(name) {
      for (var i = 0; i < this.fnodes.length; i++) {
        var fnode = this.fnodes[i];
        if (fnode instanceof NamedExprFn && fnode.name == name)
          return true;
      }

      return false;
    }

    getElement(name) {
      for (var i = 0; i < this.fnodes.length; i++) {
        var fnode = this.fnodes[i];
        if (fnode instanceof NamedExprFn && fnode.name == name)
          return fnode;
      }

      return null;
    }

    // 1. if all fnodes are pure reference, convers them into NamedExpr
    // 2. if only one fnode, returns that fnode
    build(module, inputFn) {
      var pure_refs = true;
      var has_any_refs = false;
      for (var i = 0; i < this.fnodes.length; i++) {
        var fnode = this.fnodes[i];
        this.fnodes[i] = fnode.build(module, inputFn);
        pure_refs = pure_refs && fnode instanceof RefFn && !fnode.name.startsWith('_');
        has_any_refs = has_any_refs || pure_refs && (inputFn != null && inputFn != undefined && inputFn instanceof TupleFn && inputFn.hasName(fnode.name));
      }

      if (pure_refs) {
        for (var i = 0; i < this.fnodes.length; i++) {
          var fnode = this.fnodes[i];
          this.fnodes[i] = new NamedExprFn(fnode.name,  has_any_refs ? fnode : new TupleSelectorFn(i));
        }
      }

      // TODO
      // return this.fnodes.length == 1 ? this.fnodes[0] : this;
      return this;
    }

    apply(input, context) {
      var tuple = new Tuple();
      var len = this.fnodes.length;
      if (len == 0)
        return tuple;

      for (var i = 0; i < len; i++) {
        var fnode = this.fnodes[i];
        if (fnode instanceof ConstFn || fnode instanceof PipeFn)
          tuple.addValue(fnode.apply(input)); 
        else if (fnode instanceof NamedExprFn) {
          var res = fnode.apply(input, context);
          tuple.addKeyValue(fnode.name, res);
        }

        else {
          var tp = typeof(fnode);
          if (tp == 'number' || tp == 'string' || tp == 'boolean' || Array.isArray(fnode))
            var res = fnode
          else
            var res = fnode.apply(input, context);
          console.log('res:', res)

          if (res instanceof Tuple && !(fnode instanceof OperandFn)) {
            var elms = res.toList();
            elms.forEach(val => {
              tuple.addValue(val);
            });
          }
          else
            tuple.addValue(res);
        }
      }

      return tuple;
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
  }

  /**
   * Composition function.
   */
  class PipeFn extends ComposedFn {
    constructor(...elements) {
      super(...elements)
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

    resolveInternalReferences(module) {
      this.resolveReferences(module, this.funs);
    }

    // resolves names in elms[]
    resolveReferences(module, elms) {
      if (elms.length < 2)
        return elms;

      var prev = elms[0];
      for (var i = 1; i < elms.length; i++) {

        var elm = elms[i];

        // single pure ref
        if (is_elm_pure_ref(module, elm)) {
          // wrap elm into NamedExprFn and then into TupleFn
          var newElm = new TupleFn([new NamedExprFn(elm.name, elm)]);
          elm.name = "_0";
          elms.splice(i, 1, newElm);
          if (!(prev instanceof TupleFn) || prev instanceof TupleFn && !prev.hasName(elm.name)) {
            elm.name = "_0";
          }
          elm = newElm;
        }
        
        // tuple
        else if (elm instanceof TupleFn && elm.size > 0) {

          // check if all elements are refs
          var allRef = true;
          for (var j = 0; j < elm.list.length; j++) {
            var em = elm.list[j];
            if (!is_elm_pure_ref(module, em)) {
              allRef = false;
              break;
            }
          }

          if (allRef) {
            var newElms = [];
            for (var j = 0; j < elm.list.length; j++) {
              var em = elm.list[j];
              newElms.push(new NamedExprFn(em.name, em));
            }

            elm.tp = newElms;

            var hasAnyName = false;
            var siz = 1;
            // check all refs can be found from prev tuple
            // otherwise renames to be sequences.
            if (prev instanceof TupleFn) {
              siz = prev.size;
              for (var j = 0; j < prev.list.length; j++) {
                var em = prev.list[j];
                if (em instanceof NamedExprFn) {
                  hasAnyName = true;
                  break;
                }
              }
            }

            if (!hasAnyName) {
              if (siz > elm.elements.length)
                siz = elm.elements.length;
              for (var j = 0; j < siz; j++) {
                elm.elements[j].elm.name = '_' + j;
              }
            }
          }

          // not all elements are pure refs
          else {
            for (var j = 0; j < elm.list.length; j++) {
              var em = elm.list[j];
              if (em instanceof TupleFn) {
                this.resolveReferences(module, [prev, em]);
              }
              
              // other cases are composition fn
              else if (em instanceof PipeFn) {
                this.resolveReferences(module, [prev].concat(em.elements));
              }

              else if (em instanceof NamedExprFn) {
                if (em.elm instanceof TupleFn) {
                  var arr = [prev, em.elm];
                  this.resolveReferences(module, arr);
                  em.elm = arr[1];
                }

                else if (em.elm instanceof PipeFn) {
                  var arr = [prev].concat(em.elm.elements);
                  this.resolveReferences(module, arr);
                  em.elm.elements.splice(0, arr.length - 1)
                  em.elm.appendElements(arr.slice(1));
                  console.log(em.elm.elements)
                }
              }
            }
          }
        }
        prev = elm;
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
          this.fnodes.splice(i, 1, ...this.fnodes[i].fnodes);

      return this;
    }

    apply(tuple, context) {
      var res = this.fnodes[0].apply(tuple, context);

      for (var i = 1; i < this.fnodes.length; i++) {
        if (res instanceof TailFn) {
          return new TailFn(new PipeFn([res._wrapped].concat(this.funs.slice(i))));
        } else if (res instanceof Tuple && res.hasTail()) {
          var nextTail = new TupleFn(res.toList());
          res = new TailFn(new PipeFn([nextTail].concat(this.funs.slice(i))));
          res.nextTail = nextTail;
          return res;
        }

        // still has unresolved ref
        else if (res instanceof Tuple && res.hasRef()) {
          return new PipeFn(...[new TupleFn(...res.toList())].concat(this.fnodes.slice(i)))
        }

        res = this.fnodes[i].apply(res, context)
        if (res)
          console.log("result of item " + i + ":", res);
      }

      return res;
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
      super()
      if (name.endsWith('$')) {
        this.name = name.substr(0, name.length - 1);
        this._tail = true;
      } else {
        this.name = name;
      }

      this.setAsValueType();
    }

    setAsValueType() {
      this.refType = 'value'
    }

    setAsRefType() {
      this.refType = 'ref'
    }

    // Tells this RefFn is purely an identifier, excluding tuple sequence selector such as "_1"
    isPureId() {
      return !this.isTupleSelector() && this.isValueType() && !this.isTail();
    }

    // Tells if this is a tuple selector such as "_0", "_1", etc.
    isTupleSelector() {
      return this.name.match(TupleSelectorPattern) != null;
    }

    isTail() {
      return this._tail ? this._tail : false;
    }

    get params() { return this._params }

    set params(params) { this._params = params }

    isValueType() {
      return this.refType == 'value'
    }

    isRefType() {
      return this.refType == 'ref'
    }

    build(module, inputFn) {
      if (this.name.startsWith('_') || inputFn instanceof TupleFn && inputFn.hasName(this.name))
        return this;

      var f = module.getAvailableFn(this.name);
      if (f) {
        return f;
      }

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
        if (this._params != null) {
          if (typeof(e) == 'function') {
            var args = [];
            if (this._params instanceof RefFn)
              args.push(input.get(this._params.name))
            else if (this._params instanceof Fn) {
              args = this._params.apply(input);
              args = args instanceof Tuple ? args.toList() : [args];
            }
            else for (var i = 0; i < this._params.size; i++)
              args.push(input.get(this._params[i].name));
            return e.apply(null, args)
          }

          // e not a function but an Fn
          else {
            var tpl = this._params.apply(input);
            if (this._params instanceof RefFn)
              tpl = Tuple.fromKeyValue(this._params.name, tpl);
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
      this.seq = '_' + seq;
    }

    apply(input) {
      if (!input)
        return null;

      if (input instanceof Tuple)
        return input.get(this.seq);

      if (this.seq == '_0')
        return input;
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

    build(module, inputFn) {
      if (inputFn instanceof TupleFn && inputFn.hasName(this.name)) {
        return new PipeFn(this.params, this)
      }

      else if (module.hasFn(this.name)) {
        var f = module.getAvailableFn(this.name);
        if (f) {
          var f_params = f.params;

          var params_len = f_params.fnodes.length;
          var actual_params_len = this.params.fnodes.length;

          if (actual_params_len >= params_len)
            return new ftl.PipeFn(this.params, f)
          else
            return new ftl.PartialFunctionFn(f, param_list);          
        }

        return new PipeFn(params, new RefFn(this.name));
      }
    }
  }

  /**
   * This is a functional tuple reference, which returns a function.
   */
  class ExprRefFn extends WrapperFn {
    constructor(fn, params, isTail) {
      super(fn)
      this.params = params;
      this.isTail = isTail;
    }

    apply(input) {
      if (this.isTail) {
        return pass_through.bind(new ftl.TailFn(this.wrapped, input));
      } else
        return function_ref.bind({f: this.wrapped, closure: input, params: this.params});
    }
  }

  class TailFn extends WrapperFn {
    constructor(fn, closure) {
      super(fn);
      this.closure = closure;
      this.nextTail = null;
    }

    set nextTail(nextTail) {
      this.nextTail = nextTail;
    }

    get nextTail() {
      return this.nextTail;
    }

    executeRecursive(context) {
      if (this.nextTail instanceof TupleFn) {
        var tuple = this.nextTail.tuple;
        for (var i = 0; i < tuple.length; i++) {
          var elm = tuple[i];
          if (elm instanceof TailFn) {
            var next = elm.apply(context);
            if (next instanceof TailFn) {
              this.nextTail = next.nextTail;
              tuple[i] = next.wrapped;
            }

            // end of recursive
            else {
              this.nextTail = null;
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

  /**
   * A function wrapping a operand. This is a place holder to make results of a tuple spread into parent tuple.
   */
  class OperandFn extends WrapperFn {
    constructor(fn) {
      super(fn);
    }

    build(module, inputFn) {
      super.build(module, inputFn);
      if (this.wrapped instanceof TupleFn && this.wrapped.fnodes.length == 1)
        return this.wrapped.fnodes[0];
      else
        return this;
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
    NativeFunctionFn: NativeFunctionFn,
    FunctionFn: FunctionFn,
    PartialFunctionFn: PartialFunctionFn,
    TupleFn: TupleFn,
    NamedExprFn: NamedExprFn,
    PipeFn: PipeFn,
    RefFn: RefFn,
    CallExprFn: CallExprFn,
    ExprRefFn: ExprRefFn,
    TailFn: TailFn,
    OperandFn: OperandFn,
    ArrayElementSelectorFn: ArrayElementSelectorFn,
    SimpleTypeFn: SimpleTypeFn,
    FtlBuildError: FtlBuildError,
    getModule: getModule,
    addModule: addModule
  }
})();
