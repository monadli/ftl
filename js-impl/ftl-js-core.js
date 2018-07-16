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

      if (f instanceof FunctionFn)
        f.wrapped.preprocess(this);
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
      exec.preprocess(this);
      this._executables.push(exec);
    }

    get executables() { return this._executables }

    resolveRecursiveRef(f, expr) {
      if (expr instanceof RefFn || expr instanceof ArrayElementSelectorFn) {
        if (expr.name == f.name)
          expr.possibleRef = f;
      }

      else if (expr instanceof CompositionFn || expr instanceof TupleFn)
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

    // Pre-process the function.
    // This function resolves references and potentially performs optimization.
    //
    // @model the model the function is defined
    // @ inputFn input function
    preprocess(model, inputFn) {
    }

    // Applies function with input and context.
    apply(input, context) {
      return null;
    }
  }

  /**
   * Function with children.
   */
  class WrapperFn extends Fn {
    constructor(fn) {
      super();
      this._wrapped = fn;
    }

    get wrapped() {
      return this._wrapped;
    }

    preprocess(model, inputFn) {
      this._wrapped.preprocess(model, inputFn);
    }

    apply(input, context) {
      return this._wrapped.apply(input, context);
    }

    toString() {
      return this._wrapped.toString();
    }
  }

  /**
   * Constant function.
   */
  class ConstFn extends Fn {
    constructor(val) {
      super()
      console.log("val to ConstFn: ", val)
      if (val instanceof Fn) {
        this._val = val.apply()
        console.log("val detected as Fn: ", val)
      }
      else
        this._val = val;

      console.log("_val in ConstFn: ", val)
    }

    get type() {
      return typeof this._val;
    }

    get value() {
      return this._val;
    }

    apply(input) {
      return this._val;
    }

    toString() {
      return getValueString(this._val);
    }
  }

  /**
   * Immutable value with a name.
   *
   * This represents "const" declaration.
   */
  class ImmutableValFn extends ConstFn {

    // during construction, the value is computed and stored
    constructor(name, val) {
      super(val);
      this._name = name;
    }

    get name() {return this._name}
  }

  /**
   * Variable function.
   */
  class VarFn extends ImmutableValFn {

    // during construction, the value is computed and stored
    constructor(name, val) {
      console.log("val to VarFn", val)
      super(name, val);
      this._type = "VarFn"
    }

    // sets value
    set value(val) {
      this._val = val;
    }
  }

  /**
   * Literal expression.
   */
  class LiteralExpressionFn {
    constructor(list) {
      this.list = list;
    }
    
    apply(input) {
      return "";
    }
  }

  class ParameterMappingFn extends Fn {
    constructor(params) {
      super();
      this._params = params;
    }

    get params() {
      return this._params;
    }

    _getInputElement(input, idx) {
      return input instanceof Tuple ? input.get('_' + idx) : idx == 0 ? input : null;
    }

    apply(input, context) {
      var tuple = new Tuple();

      var list = (this.params instanceof RefFn) ? [this._params] : this._params.list
      for (var i = 0; i < list.length; i++) {

        // value from input or from default expression
        var val = this._getInputElement(input, i);
        if (val == null)
          val = list[i].apply(input, context);

        // resolve any tail
        else if (val instanceof TailFn)
          val = val.apply();

        tuple.addKeyValue(list[i].name, val)
      }

      return tuple;
    }
  }

  /**
   * Native javascript function.
   */
  class NativeFunctionFn extends Fn {

    // name: function name
    // params: parameter names
    // script: script body
    constructor(name, params, script) {
      super()

      this._name = name;
      this._params = params;

      var ins = params;
      var param_list = [];
      this._params = params instanceof TupleFn ? ins.list : (Array.isArray(params) ? params : [ins]);
      param_list = this.extractParams(this._params);

      for (var i = 0; i < ins.length; i++) {
        param_list.push('_' + (i + 1));
      }

      console.log("parameter list:", param_list) 
      console.log("parameters:", params)
      console.log("script:", script)

      this.internal = (typeof script == 'function') ? script
          : eval("(function(" + param_list.join(',') + ")" + script + ")");
      this._param_list = param_list;
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

    get name() { return this._name }

    /**
     * Parameters in list
     */
    get params() { return this._params; }

    apply(input) {
      console.log("tuple to native function: ", input)
      if (this._param_list.length == 1 && this._param_list[0] == 'raw')
        var res = this.internal.apply(null, [input])
      else {
        var input_array = (input instanceof Tuple)? input.toList() : [input];
        var res = this.internal.apply(null, input_array);
      }

      console.log("output of native function: ", res)
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
      super(new CompositionFn([new ParameterMappingFn(params), expr]))
      this._name = name;
      this._recursive = false;
    }

    get isRecursive() {
      return this._recursive
    }

    get name() { return this._name; }

    get params() { return this.wrapped.elements[0].params.list; }
  
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
  class TupleFn extends Fn {
    constructor(tp) {
      super()
      this.tp = tp || [];
      console.log("arg to TupleFn constructor", tp)
      this._type="TupleFn"
    }

    // Returns a tuple with elements.
    // If there is only one any Fn, returns it without wrapping into a tuple.
    static createTupleFn(elms) {
      return (elms && elms.length == 1 && elms[0] instanceof Fn) ? elms[0] : new TupleFn(elms);
    }

    // deprecated
    get list() { return this.tp }

    // TODO: deprecated
    get tuple() { return this.tp }

    get elements() { return this.tp }

    get size() {
      return !this.tp ? 0 : this.tp.length;
    }

    // Tells if this TupleFn contains a NamedExprFn element.
    hasName(name) {
      for (var i = 0; i < this.tp.length; i++) {
        if (this.tp[i] instanceof NamedExprFn && this.tp[i].name == name)
          return true;
      }

      return false;
    }

    getElement(name) {
      for (var i = 0; i < this.tp.length; i++) {
        if (this.tp[i] instanceof NamedExprFn && this.tp[i].name == name)
          return this.tp[i];
      }
      return null;
    }

    preprocess(module, inputFn) {
      function isAllPureRefs(module, elms) {
        for (var i = 0; i < elms.length; i++) {
          if (!is_elm_pure_ref(module, elms[i])) {
            return false;
          }
        }
        return true;
      }

      // if all elms are pure refs
      if (isAllPureRefs(module, this.tp)) {

        // 1. replace pure refs with named expr
        var oldElms = this.tp;
        this.tp = [];
        oldElms.forEach(elm => this.tp.push(new NamedExprFn(elm.name, elm)));

        var hasWrapperFn = false;
        var siz = 1;

        var prevNames = new Set();

        // check if inputFn contains any name
        // and also has known output size
        if (inputFn instanceof TupleFn) {
          siz = inputFn.size;
          for (var j = 0; j < siz; j++) {
            var em = inputFn.list[j];
            if (em instanceof NamedExprFn) {
              prevNames.add(em.elm.name)
              em = em.elm;
            }
            
            if (em instanceof WrapperFn)
              hasWrapperFn = true;
          }
        }

        // inputFn not contain any name.
        if (prevNames.size == 0) {
          if (siz > this.tuple.length || hasWrapperFn)
            siz = this.tp.length;
          for (var j = 0; j < siz; j++) {
            this.tp[j].elm.name = '_' + j;
          }
        }
      }

      else {

        // detect and replace function
        for (var i = 0; i < this.tp.length; i++) {
          var elm = this.tp[i];
          if (elm instanceof RefFn && elm.isPureId() && inputFn instanceof TupleFn) {
            if (inputFn.hasName(elm.name)) {
              var e = inputFn.getElement(elm.name)
              if (e.elm.name == elm.name)
                this.tp.splice(i, 1, e);
              else
                this.tp.splice(i, 1, new NamedExprFn(elm.name, elm));
            } else if (module.hasFn(elm.name)) {
              this.tp.splice(i, 1, module.getAvailableFn(elm.name));
            }
          }
        }

        for (var i = 0; i < this.tp.length; i++) {
          this.tp[i].preprocess(module, inputFn);
        }
      }
    }

    apply(input, context) {
      var tuple = new Tuple()
      if (this.tp == null)
        return tuple
      for (var i = 0; i < this.tp.length; i++) {
        var tpl = this.tp[i];
        console.log("tuple type: ", tpl)
        if (tpl instanceof ConstFn || tpl instanceof CompositionFn)
          tuple.addValue(tpl.apply(input)); 
        else if (tpl instanceof NamedExprFn) {
          var res = tpl.apply(input, context);
          tuple.addKeyValue(tpl.id, res);
        }

        else {
          var tp = typeof(tpl);
          if (tp == 'number' || tp == 'string' || tp == 'boolean' || Array.isArray(tpl))
            var res = tpl
          else
            var res = tpl.apply(input, context);
          console.log('res:', res)

          if (res instanceof Tuple && !(tpl instanceof OperandFn)) {
            var elms = res.toList();
            elms.forEach(val => {
              tuple.addValue(val);
            });
          }
          else
            tuple.addValue(res);
        }
      }

      return tuple
    }
  }

  /**
   * Named expression.
   * 
   * This is always an element in a TupleFn.
   */
  class NamedExprFn extends Fn {
    constructor(id, elm) {
      super();
      this.id = id;
      this.elm = elm;
    }

    get name() { return this.id }

    hasRef() {
      return this.elm instanceof RefFn
    }

    preprocess(model, inputFn) {
      this.elm.preprocess(model, inputFn);
    }

    apply(input) {
      return this.elm.apply(input);
    }
  }

  /**
   * Composition function.
   */
  class CompositionFn extends Fn {
    constructor(list) {
      super()
      this.funs = list;
//      this.modifyElements(list);
      this._type = "CompositionFn"
    }

    /**
     * Creates a CompositionFn
     */
    static createCompositionFn(first, rest) {
      if (first instanceof CompositionFn) {
        first.appendElements(rest);
        return first;
      } else if (rest instanceof CompositionFn) {
        rest.prependElements(first);
        return rest;
      } else {
        var list = Array.isArray(first) ? list : [first];
        var ret = new CompositionFn(Array.isArray(first) ? first : [first])
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
              else if (em instanceof CompositionFn) {
                this.resolveReferences(module, [prev].concat(em.elements));
              }

              else if (em instanceof NamedExprFn) {
                if (em.elm instanceof TupleFn) {
                  var arr = [prev, em.elm];
                  this.resolveReferences(module, arr);
                  em.elm = arr[1];
                }

                else if (em.elm instanceof CompositionFn) {
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

    preprocess(module, inputFn) {
      
      var prev = inputFn;
      for (var i = 0 ; i < this.funs.length; i++) {
        var elm = this.funs[i];
        if (prev) {
          if (elm instanceof RefFn && is_elm_ref(elm)) {

            // prev either not a tuple or a tuple but not have the name 
            // figure out if it is a function
            if (!(prev instanceof TupleFn) || !prev.hasName(elm.name)) {
              var f = module.getAvailableFn(elm.name);
              if (f) {
                this.funs.splice(i, 1, f);
                prev = f;
                continue;
              }
            } 

            var newElm = new TupleFn([new NamedExprFn(elm.name, elm)]);
            this.funs.splice(i, 1, newElm);

            if (!(prev instanceof TupleFn) || !prev.hasName(elm.name))
              elm.name = "_0";

            elm = newElm;
          }

          // preprocess any fn except function
          if (!(elm instanceof FunctionFn || elm instanceof NativeFunctionFn))
              elm.preprocess(module, prev);

        }

        prev = elm;
      }
    }

    apply(tuple, context) {
      console.log("composition input:", tuple);
      var res = this.funs[0].apply(tuple, context);
      console.log("result of first item:", res);

      for (var i = 1; i < this.funs.length; i++) {
        if (res instanceof TailFn) {
          return new TailFn(new CompositionFn([res._wrapped].concat(this.funs.slice(i))));
        } else if (res instanceof Tuple && res.hasTail()) {
          var nextTail = new TupleFn(res.toList());
          res = new TailFn(new CompositionFn([nextTail].concat(this.funs.slice(i))));
          res.nextTail = nextTail;
          return res;
        }

        // still has unresolved ref
        else if (res instanceof Tuple && res.hasRef()) {
          return new CompositionFn([new TupleFn(res.toList())].concat(this.funs.slice(i)))
        }

        res = this.funs[i].apply(res, context)
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
    constructor(module, name) {
      super()
      this._type = "RefFn"
      this._name = name;
      this._module_name = module.name;
      if (name.endsWith('$')) {
        this._name = name.substr(0, name.length - 1);
        this._tail = true;
      } else {
        this._name = name;
      }
      this.setAsValueType();
    }

    get name() {
      return this._name;
    }

    set name(name) {
      this._name = name;
    }

    setAsValueType() {
      this._refType = 'value'
    }

    setAsRefType() {
      this._refType = 'ref'
    }

    set possibleRef(ref) {
      this._possibleRef = ref;
    }

    // tuple seq is '_' + tuple sequence
    set tupleSeq(seq) {
      this._tupleSeq = seq;
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
      return this._refType == 'value'
    }

    isRefType() {
      return this._refType == 'ref'
    }

    apply(input, context) {
      console.log("calculating ref for '" + this._name)
      console.log("input to RefFn:" + input)
      var e;

      // find name from scoped tuple first
      if (input && input instanceof Tuple)
        e = input.get(this._name);

      if (e == undefined) {
        // must be a function
        e = this._possibleRef;

        if (e) {
          console.log("actual f ", e)
          console.log("tuple to " + this._name, input)

          var res = e.apply((this._params == null ? input : this._params.apply(input)), context);
          console.log("result of RefFn: ", res)
          return res;
        }
      }

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

      if (this._name == '_0' && input && !(input instanceof Tuple))
        return input;

      // can not find ref, return itself
      else
        return this;
    }
  }

  /**
   * This is a functional tuple reference, which returns a function.
   */
  class ExprRefFn extends WrapperFn {
    constructor(fn, params, isTail) {
      super(fn)
      this._type = "ExprRefFn"
      this._params = params;
      this._isTail = isTail;
    }

    apply(input) {
      if (this._isTail) {
        return pass_through.bind(new ftl.TailFn(this.wrapped, input));
      } else
        return function_ref.bind({f: this.wrapped, closure: input, params: this._params});;
    }
  }

  class TailFn extends WrapperFn {
    constructor(fn, closure) {
      super(fn);
      this._closure = closure;
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
      var res = this._wrapped.apply(this._closure, context);
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
    constructor(module, name, index) {
      super()
      this._type = "ArrayElementSelectorFn"
      this._name = name.name;
      this._module_name = module.name;
      this._index = (index instanceof RefFn) ? index.name : parseInt(index);
    }

    get name() {
      return this._name;
    }

    set possibleRef(ref) {
      this._possibleRef = ref;
    }

    apply(input) {
      var list;
      if (input && input instanceof Tuple)
        list = input.get(this._name);

      if (!list)
        list = this._possibleRef;

      if (list instanceof VarFn)
        list = list._val;

      if (list) {
        var i = typeof(this._index) == 'number' ? this._index : input.get(this._index)
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

  class OperandFn extends WrapperFn {
    constructor(fn) {
      super(fn);
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
    LiteralExpressionFn: LiteralExpressionFn,
    ParameterMappingFn: ParameterMappingFn,
    NativeFunctionFn: NativeFunctionFn,
    FunctionFn: FunctionFn,
    PartialFunctionFn: PartialFunctionFn,
    TupleFn: TupleFn,
    NamedExprFn: NamedExprFn,
    CompositionFn: CompositionFn,
    RefFn: RefFn,
    ExprRefFn: ExprRefFn,
    TailFn: TailFn,
    OperandFn: OperandFn,
    ArrayElementSelectorFn: ArrayElementSelectorFn,
    SimpleTypeFn: SimpleTypeFn,
    getModule: getModule,
    addModule: addModule
  }
})();
