/**
 * ftl grammar
 *
 * This grammar is in form of peg, specifically parsable by pegjs (https://pegjs.org)
 *
 * Jian Li
 */

{

// ftl functions and classes.
var ftl = (function() {

  function getValueString(value) {
    if (Array.isArray(value))
      return '[' + value.toString() + ']';
    else if (typeof value == 'string')
      return "'" + value + "'";
    else
      return value.toString();
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

    addFn(name, f) {
      if (this._functions[name] != null)
        throw { message: "'" + name + "' exists and can not be declared again!"}
      this._functions[name] = f;
    }

    // Returns module defined identifier. 
    getFn(name) {
      return this._functions[name];
    }

    // Returns either module defined or imported identifier. 
    getAvailableFn(name) {
      return this._functions[name] || this._imports[name];
    }

    getAllFns() {
      return this._functions;
    }

    addExecutable(exec) {
      if (exec instanceof RefFn && exec.isValueType())
        exec.possibleRef = this.getAvailableFn(exec.name);

      this._executables.push(exec);
    }

    get executables() { return this._executables }
  }

  class Tuple {
    constructor() {
      // full map of named or unnamed values
      this._map = new Map();
//      this._list = []
      this._size = 0;
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
    apply(input) {
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

    apply(input) {
      return this._wrapped.apply(input);
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
   * Named expression.
   */
  class NamedExpressionFn extends Fn {
    constructor(id, expr) {
      this.id = id;
      this.expr = expr;
    }

    get id() { return this.id }

    apply(tuple) {
      return this.expr.apply(tuple);
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

    apply(input) {
      var tuple = new Tuple();

      var list = (this.params instanceof RefFn) ? [this._params] : this._params.list
      for (var i = 0; i < list.length; i++) {

        // value from input or from default expression
        var val = this._getInputElement(input, i);
        if (val == null)
          val = list[i].apply(input);

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
        var prev = res;
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
      this.tp = tp;
      console.log("arg to TupleFn constructor", tp)
      this._type="TupleFn"
    }

    static createTupleFn(elms) {
      return elms == null ? null : (elms.length == 1 && elms[0] instanceof Fn) ? elms[0] : new TupleFn(elms);
    }

    // deprecated
    get list() { return this.tp }

    get tuple() { return this.tp }

    apply(input, context) {
      var tuple = new Tuple()
      if (this.tp == null)
        return tuple
      for (var i = 0; i < this.tp.length; i++) {
        var tpl = this.tp[i];
        console.log("tuple type: ", tpl)
        if (tpl instanceof ConstFn || tpl instanceof CompositionFn)
          tuple.addValue(tpl.apply(input)); 
        else if (tpl instanceof ExprFn) {
          var res = tpl.apply(input, context);
          tuple.addKeyValue(tpl.id, res);
        }

        else {
          var tp = typeof(tpl);
          if (tp == 'number' || tp == 'string' || tp == 'boolean')
            var res = tpl 
          else
            var res = tpl.apply(input, context);
          console.log('res:', res)
          tuple.addValue(res);
        }
      }
      return tuple
    }
  }

  /**
   * Expression function.
   */
  class ExprFn extends Fn {
    constructor(id, elm) {
      super();
      this.id = id;
      this.elm = elm;
    }

    get name() { return this.id }

    hasRef() {
      return this.elm instanceof RefFn
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

    /**
     * Appends elements.
     */
    appendElements(elms) {
      this.funs = this.funs.concat(Array.isArray(elms) ? elms : [elms]);
    }

    /**
     * Prepends elements.
     */
    prependElements(elms) {
      this.funs = (Array.isArray(elms) ? elms : [elms]).concat(this.funs);
    }

    get elements() { return this.funs }

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

      if (e == undefined && this._tupleSeq && input && input instanceof Tuple) {
        e = input.get(this._tupleSeq);
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
            if (!(tpl instanceof Tuple))
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

      var i = typeof(this._index) == 'number' ? this._index : input.get(this._index)
      return list[i];
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

  class ImportStatement {
    constructor(path, id, as) {
      this._path = path;
      this._id = id;
      this._as = as;
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
    NamedExpressionFn: NamedExpressionFn,
    LiteralExpressionFn: LiteralExpressionFn,
    ParameterMappingFn: ParameterMappingFn,
    NativeFunctionFn: NativeFunctionFn,
    FunctionFn: FunctionFn,
    PartialFunctionFn: PartialFunctionFn,
    TupleFn: TupleFn,
    ExprFn: ExprFn,
    CompositionFn: CompositionFn,
    RefFn: RefFn,
    ExprRefFn: ExprRefFn,
    TailFn: TailFn,
    ArrayElementSelectorFn: ArrayElementSelectorFn,
    SimpleTypeFn: SimpleTypeFn,
    getModule: getModule,
    addModule: addModule
  }
})();

// this is the module created during parsing
var module = new ftl.Module('')

// The following functions are used for parsing

function join(value) {
  if (Array.isArray(value))
    return value.join("")
  return value
}

function extractOptional(optional, index) {
  return optional ? optional[index] : null;
}

function extractList(list, index) {
  var result = new Array(list.length), i;

  for (i = 0; i < list.length; i++) {
    result[i] = list[i][index];
  }

  return result;
}

function buildList(first, rest, index) {
  return [first].concat(extractList(rest, index));
}

function optionalList(value) {
  return value !== null ? value : [];
}

function buildFirstRest(first, rest) {
  return (Array.isArray(rest) && rest.length == 0) ? first : buildList(first, rest, 1)
}

// end of script for parser generation
}

// start
Start
  = ___ ModuleDeclaration? ___ program:Declarations? ___ { return program } 

ModuleDeclaration
  = ModuleToken _ module_name: (ModulePath NamespaceIdentifier { return text() }) {
    console.log("module name: '" + module_name + "'");
    module.name = module_name;
  } 

ModulePath
  = (NamespaceIdentifier ".")* { return text() }

// all allowed declarations
Declarations
  = first:Declaration rest:(__ Declaration)* {
    return buildList(first, rest, 1)
  }

Declaration
  = ImportDeclaration / VariableDeclaration / FunctionDeclaration / Executable

ImportDeclaration
  = ImportToken _ importItems:ImportMultiItems {
      console.log(importItems);
      module.importStatement(null, importItems)
    }

ImportSingleItem
  = name: (ModulePath (Identifier / Operator (" " Operator)*) { return text() }) as:(_ "as" _ (Identifier / Operator))? {

    // TODO: extract path

    return {
      type: "single",
      name: name,
      asName: extractOptional(as, 3)
    };
  }

ImportMultiItems
  = first:ImportItem rest:(_ "," _ ImportItem)* {
    var ret = extractList(rest, 3);
    ret.unshift(first);
    return ret;
  }

ImportList
  = path:(ModulePath NamespaceIdentifier { return text() }) _ "[" _ list:ImportMultiItems? _ "]" {
    return {
      type: "list",
      path: path,
      importList: list
    }
  }

ImportItem
  = ImportList
  / ImportSingleItem

// Variable or constant declaration at module level, which can be referenced in any functions within the same module or outside the module.
VariableDeclaration
  = modifier:(ConstToken / VarToken) _ id:Identifier _ "=" _ expr:PrimaryExpression {
    var ret = modifier =='const' ? new ftl.ImmutableValFn(id.name, expr) : new ftl.VarFn(id.name, expr)
    module.addFn(id.name, ret); 
    return ret
  }

// Function declaration
// A function can be n-ary operator as well
FunctionDeclaration
  = FunctionToken _ id:(OperatorDeclaration / Identifier / Operator) _ params:Tuple? _ body:FunctionBody {

    // FunctionDeclaration

    console.log('function id: ', id.name || id)
    console.log('expr: ', body)

    var is_operator = id.type == 'OperatorDeclaration' || id.type == 'PostfixOperatorDeclaration';
    if (is_operator)
      console.log('parameter list from operator: ', id.operands)
    console.log('parameter list from function: ', optionalList(params))

    var param_list = is_operator ? id.operands : optionalList(params);
    console.log('parameter list: ', param_list)
    var name = id.name || id

    var ret = body.script ? new ftl.NativeFunctionFn(name, param_list, body.script) :
        new ftl.FunctionFn(name, param_list, body);
    module.addFn(name, ret);

    return ret;
  }

Tuple = "(" _ elms:ParameterList? ")" { return ftl.TupleFn.createTupleFn(elms) }

ParameterList
  = first:Parameter rest:(_ "," _ Parameter)* {
    console.log("first", first);console.log("rest", rest);
    console.log("param list:", buildList(first, rest, 3));
    var list = buildList(first, rest, 3);
    for (var i = 0; i < list.length; i++) {
      if (list[i] instanceof ftl.RefFn) {
        list[i].tupleSeq = '_' + i;
      }
    }
    return list;
   }

Parameter
  = id:(Identifier _ ":")? _ expr:Expression {
      var iid = extractOptional(id, 0);
      if (iid != null)
        iid = iid.name;
      if (iid == null)
        return expr;
      return new ftl.ExprFn(iid, expr)
    }

FunctionBody
  = NativeBlock
  / PipeExpression

PipeExpression
  = "->" _ ex:Expression _ { return ex }

Expression
  = first:(OperatorExpression / PrimaryExpression) rest:(_ PipeExpression)? {
    console.log("first is ", first)
    var t = extractOptional(rest, 1);
    if (rest)
      console.log("rest is ", t)
    if (t == null)
      return first;
    
    return ftl.CompositionFn.createCompositionFn(first, t);
  }

Executable
  = expr:Expression {
      var res = expr.apply()
      if (res && res instanceof ftl.TailFn)
        res = res.apply();
      if (res)
        console.log('executable result: ', res)

      // attach results to expression for display in pegjs online
      // if result is not the expression itself, which is possible
      // when expr contains unresolved references
      if (res != expr)
        expr.result = res;
      module.addExecutable(expr);
      return expr
    }

PrimaryExpression
  = ArrayElementSelector
  / CallExpression
  / MemberExpression
  / Identifier
  / Literal
  / ArrayLiteral
  / Tuple
  / TupleSelector

Operator
  = !"->" first:OperatorSymbol rest:OperatorSymbol* { return text() }

OperandValueDeclaration
  = id:Identifier { id.setAsValueType(); return id }

OperandReferenceDeclaration
  = id:Identifier params:Tuple {
      id.setAsRefType();
      id.params = params;
      return id
    }

OperandDeclaration
 = OperandReferenceDeclaration
 / OperandValueDeclaration

/**
 * Operator declaration with form of:
 *   operand (op operand)+
 * @return type:'OperatorDeclaration', id, operands
 */
OperatorDeclaration
  = PreInfixOperatorDeclaration
  / PostfixOperatorDeclaration

PreInfixOperatorDeclaration
  = first:OperandDeclaration rest:(_ Operator _ OperandDeclaration)+ {
      var ops = extractList(rest, 1);
      var name = ops.length == 1 ? ops[0] : ops.join(' ');
      console.log("operators in operator declaration:", ops)
      var operands = [first].concat(extractList(rest, 3))
      console.log("operands in operator declaration:", operands)
      return {
        type: 'OperatorDeclaration',
        name: name,
        operands: ftl.TupleFn.createTupleFn(operands)
      }
    }

PostfixOperatorDeclaration
  = operand:OperandDeclaration _ op:Operator {
    console.log('PostfixOperatorDeclaration begin')
      return {
        type: 'PostfixOperatorDeclaration',
        name: op,
        operands: operand
      }
  }

OperatorExpression
  = UnaryOperatorExpression
  / N_aryOperatorExpression
  / PostfixOperatorExpression

// unary prefix operator expression 
UnaryOperatorExpression
  = op:Operator _ expr:PrimaryExpression {
      console.log('op', op)
      console.log('expr', expr)
      return ftl.CompositionFn.createCompositionFn(expr, module.getAvailableFn(op.name || op));
    }

// postfix operator
PostfixOperatorExpression
  = expr:PrimaryExpression _ op:Operator {
      console.log('PostfixOperatorExpression: op', op)
      console.log('PostfixOperatorExpression: expr', expr)
      var op_fn = module.getAvailableFn(op);
      if (!op_fn)
        op_fn = new ftl.RefFn(module, op);
      return ftl.CompositionFn.createCompositionFn(expr, op_fn);
  }

// n-ary operator expression
N_aryOperatorExpression
  = operand:PrimaryExpression rest: (_ Operator _ PrimaryExpression)+ {

      var current_index = 0;
      var stop_index = 0;
      var parse_operators = function(ops, operands, index, full) {
        var op = index == 1 ? ops[0] : ops.slice(0, index).join(' ')
        var f = module.getAvailableFn(op);

        // no corresponding function found for single op
        if (!f) {
          if (index == 1)
            throw new Error("No function with name '" + op + "' found!");

          index--;
          var reduced = parse_operators(ops, operands, index, false);
          
          if (current_index == stop_index)
            return reduced;

          ops = ops.slice(index, ops.length)
          operands = [reduced].concat(operands.slice(index + 1, operands.length))
          return parse_operators(ops, operands, ops.length, true)
        }

        for (var i = 0; i < f.params.length; i++) {
          if (f.params[i] instanceof ftl.RefFn && f.params[i].isRefType()) {
            operands[i] = new ftl.ExprRefFn(operands[i], f.params[i].params, f.params[i].isTail());
          }
        }

        current_index += index;
        return ftl.CompositionFn.createCompositionFn(ftl.TupleFn.createTupleFn(operands.slice(0, f.params.length)), f);
      }

      var ops = extractList(rest, 1);
      var params = [operand].concat(extractList(rest, 3));
      if (ops.length == 0)
        throw new Error('No ops found!')
      console.log('ops:', ops)
      console.log('operands', params)
      stop_index = ops.length;
      return parse_operators(ops, params, ops.length, true);
  }

TupleSelector
  = "_" ("0" / (NonZeroDigit DecimalDigit* !IdentifierStart)) { return new ftl.RefFn(module, text()) }

ArrayElementSelector
  = id: Identifier _ "[" index:("0" / (NonZeroDigit DecimalDigit* {return text()}) / Identifier) _ "]" {
    console.log('got ArrayElementSelector', index);
    return new ftl.ArrayElementSelectorFn(module, id, index);
  }

Literal
  = NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

ArrayLiteral
  = "[" elms:(_ LiteralList)? _ "]" {
    var lst = extractOptional(elms, 1);
    return lst == null ? new ftl.ConstFn([]) : lst
  }

LiteralList
  = first:PrimaryExpression rest:(_ "," _ PrimaryExpression)* {
    var elms = buildList(first, rest, 3);
    var ret = [];
    for (var i = 0; i < elms.length; i++)
      ret.push(elms[i].value);
    return new ftl.ConstFn(ret)
  }

// expression for getting member of variable
MemberExpression
  = Identifier _ "[" _ ( ParameterList)+ _ "]"

CallExpression
  = id: Identifier _ params:Tuple {

    // CallExpression

    var f = module.getAvailableFn(id.name);
    if (f) {
      var f_params = f.params;
      if (!Array.isArray(f_params)) {
        if (f_params instanceof ftl.TupleFn) {
          f_params = f_params.list
        } else
          f_params = [f_params]
      }

      var params_len = f_params.length;
      for (var i = 0; i < f_params.length; i++) {
        var p = f_params[i];
        if (p instanceof ftl.ExprFn && !p.hasRef())
          params_len--;
      }
      var param_list = params.apply();
      var actual_params_len = param_list instanceof ftl.Tuple ? param_list.size: 1;

      if (actual_params_len >= params_len) {
        return new ftl.CompositionFn([params, f])
      }
      return new ftl.PartialFunctionFn(f, param_list);
    }

    else {
      id.params = params;
      return id;
    }
  }

// Native javascript block wrapped with "{" and "}"
NativeBlock
  = "{" _ ((!("{" / "}") SourceCharacter)* {return text()})
    NativeBlock* _
    ((!("{" / "}") SourceCharacter)* {return text()}) "}"
    {return {type:'native', script: text()}}

SourceCharacter
  = .

Identifier
  = !ReservedWord name:IdentifierName {
    var ret = new ftl.RefFn(module, name);
    ret.possibleRef = module.getAvailableFn(name);
    return ret;
  }

IdentifierName "identifier"
  = first:IdentifierStart rest:IdentifierPart* {return first + rest.join("")}

IdentifierStart
  = AsciiLetter
  / "$"
  / "_"

/// non-start of identifier
IdentifierPart
  = IdentifierStart
  / DecimalDigit

NamespaceIdentifier
  = LowerLetter (LowerLetter / "_")* { return text() }

// Tokens
FalseToken      = "false" !IdentifierPart
FunctionToken   = "fn" !IdentifierPart
NullToken       = "null" !IdentifierPart
TrueToken       = "true" !IdentifierPart
ModuleToken     = "module" !IdentifierPart
ImportToken     = "import" !IdentifierPart
VarToken        = "var" !IdentifierPart
ConstToken      = "const" !IdentifierPart

AsciiLetter
  = UpperLetter
  / LowerLetter

UpperLetter
  = [\u0041-\u005A]

LowerLetter
  = [\u0061-\u007A]

DecimalDigit
  = [0-9]

OperatorSymbol
  = [!%&*+\-./:<=>?^|\u00D7\u00F7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283]

ReservedWord
  = VarToken
  / ConstToken
  / FunctionToken
  / ModuleToken
  / ImportToken
  / NullToken
  / BooleanLiteral

NullLiteral
  = NullToken

BooleanLiteral
  = TrueToken { return new ftl.ConstFn(true) }
  / FalseToken { return new ftl.ConstFn(false) }

NumericLiteral
  = literal:HexIntegerLiteral !(IdentifierStart / DecimalDigit)
  / literal:DecimalLiteral !(IdentifierStart / DecimalDigit) { return literal }

DecimalLiteral
  = DecimalIntegerLiteral "." DecimalDigit* ExponentPart? {
      return new ftl.ConstFn(parseFloat(text()));
    }
  / [-]? "." DecimalDigit+ ExponentPart? {
      return new ftl.ConstFn(parseFloat(text()));
    }
  / DecimalIntegerLiteral ExponentPart? {
      return new ftl.ConstFn(parseFloat(text()));
    }

DecimalIntegerLiteral
  = "0"
  / [-]? NonZeroDigit DecimalDigit*

NonZeroDigit
  = [1-9]

ExponentPart
  = ExponentIndicator SignedInteger

ExponentIndicator
  = "e"i

SignedInteger
  = [+-]? DecimalDigit+

HexIntegerLiteral
  = "0x"i digits:$HexDigit+

HexDigit
  = [0-9a-f]i

StringLiteral
  = '"' chars:DoubleStringCharacter* '"' { var str = text(); return new ftl.ConstFn(str.substr(1, str.length - 2)) }
  / "'" chars:SingleStringCharacter* "'" { var str = text(); return new ftl.ConstFn(str.substr(1, str.length - 2)) }

DoubleStringCharacter
  = !('"' / "\\" / LineTerminator) SourceCharacter
  / "\\" sequence:EscapeSequence
  / LineContinuation

SingleStringCharacter
  = !("'" / "\\" / LineTerminator) SourceCharacter
  / "\\" sequence:EscapeSequence
  / LineContinuation

LineContinuation
  = "\\" EOL

EscapeSequence
  = CharacterEscapeSequence
  / "0" !DecimalDigit
  / HexEscapeSequence

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter
  = "'"
  / '"'
  / "\\"
  / "b"
  / "f"
  / "n"
  / "r"
  / "t"
  / "v"

NonEscapeCharacter
  = !(EscapeCharacter / LineTerminator) SourceCharacter

EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / "x"
  / "u"

HexEscapeSequence
  = "x" digits:$(HexDigit HexDigit)

LineTerminator
  = [\n\r]

// End of line
EOL
  = "\n"
  / "\r\n"
  / "\r"

WhiteSpace
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"

Comment "comment"
  = MultiLineComment
  / SingleLineComment

SingleLineComment
  = "//" (!LineTerminator SourceCharacter)*

MultiLineComment
  = "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator
  = "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

// any white space, comment, with end of line
_
  = (WhiteSpace / Comment)* (EOL+ (WhiteSpace / Comment)+)*

// at least one end of line with optional white space or comment preceding it
__
  = ((WhiteSpace / Comment)* EOL)+

// any white space, comment, or end of line
___
  = (WhiteSpace / EOL / Comment)*
