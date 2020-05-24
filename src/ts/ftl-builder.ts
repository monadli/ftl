import fs from 'fs'
import * as ftl from './ftl-core'
import * as  ftl_parser from './ftl-parser'

var runPath: string

export function setRunPath(path: string) {
  runPath = path
}

const OPERATOR_SYMBOLS = '!%&*+\-./:<=>?^|\u00D7\u00F7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283';

type BuildInfo = ftl_parser.BuildInfo

export function buildModuleWithContent(content:string) {
  let module = new ftl.Module('')
  return buildToModule(content, module)
}

export function buildModule(path:string, ftlFile:string) {
  let content = fs.readFileSync(`${runPath}/${ftlFile}.ftl`, 'utf-8')
  return buildModuleWithContent(content)
}

export function buildToModule(ftl_content:string, module:any) {
  let parsed = ftl_parser.peg$parse(ftl_content)
  if (!parsed)
    return null
  buildElement(parsed, module)
  return module
}

function buildElement(buildInfo:any, module:any, input:any=null) {
  if (buildInfo instanceof ftl_parser.BuildInfo)
    return getBuilder(buildInfo.name)(buildInfo.details, module, input)
  else
    return buildInfo
}

function getBuilder(name:string) {
  let builder =  eval(`build${name}`);//buildElements[name]
  if (!builder)
    throw new Error(`Builder for ${name} not found!`)
  return builder
}

function buildDeclarations(details:any, module:any) {
  return details.declarations.map((declaration:BuildInfo) => {
    return buildElement(declaration, module)
  })
}

function buildImportDeclaration(details:any, module:any) {
  buildElement(details.items, module)
}

function buildImportList(details:any, module:any) {
  //let list = 
  buildElement(details.list, module, details)
  //list.forEach((item:any) => {
  //  item.path = details.path
  //  buildElement(item, module)
  //})
}

function buildImportMultiItems(details:any, module:any, prev:any) {
  //return 
  details.items.map((item:any) => {
    if (!item.details.path)
      item.details.path = details.path || (prev && prev.path)
    //return
    buildElement(item, module)
  })
}

function buildImportSingleItem(details:any, module:any) {
  let path:string = details.path
  if (path.endsWith('.')) path = path.substring(0, path.length - 1)

  let name_elm = buildElement(details.name, module)
  var name:string|null = name_elm.name || name_elm

  if (path.endsWith('/')) {
    path += name
    name = null
  }

  if (path.startsWith('.')) {
    name = path + '/' + name
  }

  // absolute import
  else {
    path = `lib/${path}`
  }

  var mod = ftl.getModule(path);
  if (!mod) {
    mod = buildModule(runPath, path)
    if (!mod)
      throw new ftl.ModuleNotLoadedError(path);
  }

  // import all
  if (!name) {
    //if (asName != null)
    //  throw new Error("Importing * (all) can not have alias name!");
    var fns = mod.getAllFns();
    Object.keys(fns).forEach(key => {
      module.addImport(key, fns[key]);
    });
  }
  else
    module.addImport(/*asName ||*/ name, mod.getFn(name));
}

function buildExecutable(details:any, module:any) {
  let executable = new ftl.ExecutableFn(buildElement(details.executable, module))
  module.addExecutable(executable)
  return executable
}

function buildMapExpression(details:any, module:any) {
  let prev:any = null
  let map_expr = details.elements.map((element:BuildInfo) => {
    return prev = buildElement(element, module, prev)
  })
  return map_expr.length == 1 ? map_expr[0] : new ftl.PipeFn(... map_expr)
}


function buildMapOperand(details:any, module:any, prev:any=null) {
  let built = buildElement(details.expr, module)
  if (built instanceof ftl.RefFn) {
    let name = built.name
    if (name.startsWith('_') || prev instanceof ftl.TupleFn && prev.hasName(name))
      return built
    var f = module.getAvailableFn(name);

    // TODO: buildFunctionCall
    if (f)
      return f
  }
  return built
}

function buildOperatorExpression(details:any, module:any) {
  return buildElement(details.unit, module)
}

/**
 * Builds n-ary operator expression.
 * 
 * During the build, when two operators are next to each other, it will make sure
 * to parse them correctly.
 * 
 * For example:
 *   1 + 2-- - 3
 * 
 * It will first treat it as
 *   1 + 2 -- (-3)
 * 
 * However once it finds that prefix operator '-' does not exist, it will try
 *   1 + (2--) - 3
 * 
 * This allows writing simpler operator expressions without precedence wrapping with prantheses.
 * @param details 
 * @param module 
 * @param input 
 */
function buildN_aryOperatorExpression(details:any, module:any, input:any=null) {
  let operands = []
  for (let i = 0; i < details.operands.length; i++) {
    let operand = details.operands[i]
    try {
      operands.push(buildElement(operand, module))
    } catch (e) {

      if (!(e instanceof PrefixOperatorNotFoundError)) {
        throw e
      }

      // try postfix operator
      let post_op = details.ops[i - 1]
      if (!module.getAvailableFn(` ${post_op}`)) {
        throw e
      }

      operands.pop()
      operands.push(buildElement(new ftl_parser.BuildInfo(
        "PostfixOperatorExpression", {
          operator: post_op,
          expr: details.operands[i - 1]
        }),
        module)
      )
      operands.push(buildElement(operand.details.expr, module))
      details.ops[i - 1] = (e as PrefixOperatorNotFoundError).op.trim()
    }
  }

  return parse_operators(module, input, details.ops, operands, details.ops.length, true, {current_index:0, stop_index:details.ops.length})
}

function buildPrefixOperatorDeclaration(details:any, module:any) {
  return {
    operator: details.operator,
    operand: buildElement(details.operand, module)
  }
}

function buildInfixOperatorDeclaration(details:any, module:any) {
  let operators = details.operators.join(' ')
  let operands = []
  for (let i = 0; i < details.operands.length; i++) {
    let operand = buildElement(details.operands[i], module)
    if (operand instanceof ftl.FunctionInterfaceFn)
      (operand as ftl.FunctionInterfaceFn).seq = i
    operands.push(operand)
  }

  return {
    operators: operators,
    operands: operands
  }
}

function buildOperandFunctionDeclaration(details:any, module:any, prevElm:any=null):ftl.Fn {
  let name = buildElement(details.name, module).name

  if (name == '$') {
    throw new Error('No name provided!')
  }

  let is_tail = false
  if (name.endsWith('$')) {
    is_tail = true
    name = name.substr(0, name.length - 1);
  }

  let params = buildElement(details.params, module, prevElm)

  // TODO needs sequnce of the parameter
  var fn = new ftl.FunctionInterfaceFn(name, params)
  fn.isTail = is_tail
  return fn
}

function buildFunctionSignature(details:any, module:any) {
  let name = buildElement(details.name, module).name
  let params = build_function_parameters(buildElement(details.params, module))
  return {name: name, params: params}
}

function buildFunctionDeclaration(details:any, module:any) {
  let signature = buildElement(details.signature, module)

  let f_name
  let params

  // prefix operator or infix operator
  if (signature.operator || signature.operators) {
    params = signature.operand && build_function_parameters(new ftl.TupleFn(signature.operand))
            || build_function_parameters(new ftl.TupleFn(... signature.operands))
    f_name = signature.postfix ? ` ${signature.operator}` : signature.operators || (params.fns.length == 1 ? `${signature.operator} ` : signature.operator)
  } else {
    f_name = signature.name
    params = signature.params
  }

  let body = details.body

  let param_list = params.fns.map((p:any) => p.name)
  let fn
  if (body.script) {
    let script = eval("(function(" + param_list.join(',') + ")" + body.script + ")")
    fn = new ftl.NativeFunctionFn(f_name, params, script)
  }
  else {
    module.addFn(new ftl.FunctionHolder(f_name))
    let arrow = body.map((arrow:any) => buildElement(arrow, module))

    // TODO arrow extract from pipe fn
    fn = new ftl.FunctionFn(f_name, params, new ftl.PipeFn(params, ... arrow))
   }

  module.addFn(fn)
  return fn
}

function buildPrefixOperatorExpression(details:any, module:any) {
    let op = details.operator
    let f = module.getAvailableFn(`${op} `)
    if (!f) {
      throw new PrefixOperatorNotFoundError(`${op} `);
    }

    let expr = buildElement(details.expr, module)

    if (expr instanceof ftl.TupleFn && expr.fns.length == 1) {
      return new ftl.PipeFn(expr.fns[0], f)
    } else {
      return new ftl.PipeFn(expr, f)
    }
}

function buildPostfixOperatorExpression(details:any, module:any) {
  let operator = ` ${details.operator}`
  let f = module.getAvailableFn(operator)
  if (!f) {
    throw new Error(`Postfix operator ${details.operator} not found!`)
  }
  let expr = buildElement(details.expr, module)
  return new ftl.PipeFn(expr, f)
}

function buildPostfixOperatorDeclaration(details:any, module:any, prev:any) {
  let operand = buildElement(details.operand, module)
  return {
    operator: details.operator,
    operand: buildElement(details.operand, module),
    postfix: true
  }
}

function buildCallExpression(details:any, module:any, prev:any) {
    let name = buildElement(details.name, module).name
    let f = module.getAvailableFn(name)
    if (!f && !prev) {
      throw new Error(`${name} not found!`)
    }
    let params = details.params.map((p:any) => buildElement(p, module))
    return new ftl.CallExprFn(name, f, params)
  }

  
  function buildArrayLiteral(details:any, module:any) {
    let elms = buildElement(details.list, module)
    for (let i = 0; i < elms.length; i++) {
      if (elms[i] instanceof ftl.ConstFn) {
        elms[i] = elms[i].apply()
      }
    }
    return new ftl.ConstFn(elms)
  }
  
  function buildLiteralList(details:any, module:any) {
    return !details ? [] : details.list.map((elm:any) => {
      return buildElement(elm, module)
    })
  }

  function buildStringLiteral(details:any, module:any) {
    return new ftl.ConstFn(details.value)
  }

  function buildNumericLiteral(details:any, module:any) {
    return new ftl.ConstFn(details.value)
  }

  function buildTrueToken(details:any, module:any) {
    return new ftl.ConstFn(details.value)
  }

  function buildFalseToken(details:any, module:any) {
    return new ftl.ConstFn(details.value)
  }

  function buildArrayElementSelector(details:any, module:any) {
    let name = buildElement(details.id, module).name
    let index = typeof details.index == 'string' ? parseInt(details.index) : details.index
    return new ftl.ArrayElementSelectorFn(name, index)
  }
  
  function buildTuple(details:any, module:any) {
    return new ftl.TupleFn(... details.elements.map((element:BuildInfo) => {
      return buildElement(element, module)
    }))
  }

  function buildTupleElement(details:any, module:any) {
    let name = buildElement(details.name, module)
    let expr = buildElement(details.expr, module)
    return name && new ftl.NamedExprFn(name.name, expr) || expr
  }

  function buildIdentifier(details:any, module:any) {
    return new ftl.RefFn(details.name)
  }

// builds function parameter
function build_function_parameters(params:ftl.TupleFn) {
  let fns = params.fns.map((p:any, i:number) => {
    if (p instanceof ftl.RefFn)
      return new ftl.NamedExprFn(p.name, new ftl.TupleSelectorFn(i));
    else
      return p
  })
  return new ftl.TupleFn(... fns)
}

// This is used to parse operators and operands recursively.
// It is called from index = length of operators down to 1.
function parse_operators(module:any, inputFn:any, ops:string[], operands:any[], index:number, full:boolean, extra:any): any {

  // operand at index 1 is for operator at 
  var op = index == 1 ? ops[0] : ops.slice(0, index).join(' ')
  var f = module.getAvailableFn(op);

  // no corresponding function found for single op
  if (!f) {
    if (index == 1)
      throw new FtlBuildError("No function with name '" + op + "' found!");

    index--;
    var reduced = parse_operators(module, inputFn, ops, operands, index, false, extra);
          
    if (extra.current_index == extra.stop_index)
      return reduced;

    ops = ops.slice(index, ops.length)
    operands = [reduced].concat(operands.slice(index + 1, operands.length))
    return parse_operators(module, inputFn, ops, operands, ops.length, true, extra)
  }

  for (var i = 0; i < f.params.fns.length; i++) {
    var fn = f.params.fns[i];
    if (fn instanceof ftl.FunctionInterfaceFn) {
      //fnode.wrapped.isNative = f instanceof ftl.NativeFunctionFn;
      console.debug(inputFn);

      // build the ExprRefFn wrapped element outside ExprRefFn itself
      // this is because inputFn is available here
      operands[i] = new ftl.ExprRefFn(fn, operands[i])
    }
  }

  extra.current_index += index;
  var operands_tuple = new ftl.TupleFn(... operands.slice(0, f.params.fns.length));

  return new ftl.PipeFn(operands_tuple, f);
}

function validate_tuple_elements(elms:any[]) {

}

//function addbuilder<D extends FtlBuilder>(builder:new(props?:any) => D) {
//  buildElements[builder.name] = builder
//}


// this is for building function / operator parameters
var dummy_param_tuple = new ftl.TupleFn();

  // The following functions are used for parsing

function join(value:any) {
  return Array.isArray(value) ? value.join("") : value
}

  function optionalList(value:any) {
    if (value == null)
      throw new Error('catching null');
    return value || [];
  }

  class FtlBuildError extends Error {
    constructor(... params:any[]) {
      super(... params);
      let stack = this.stack as string
      var start = stack.indexOf(' at new ') + 8;
      this.message = stack.substring(start, stack.indexOf(' ', start)) + ': ' + this.message;
    }
  }

  class PrefixOperatorNotFoundError extends FtlBuildError {
    op:string
    constructor(op:string) {
      super();
      this.op = op
    }
  }

  /**
   * Type for build only.
   */
  class FtlBuilder {

    constructor() {      
    }

    build(module:any, inputFn:any): any {
      return undefined;
    }
  }

  class DeclarationsBuilder extends FtlBuilder {
    declarations:any[]
    constructor(declarations:any[]) {
      super()
      this.declarations = declarations
    }
  
    build() {
  
    }
  }

  //addbuilder(DeclarationsBuilder)

  class FnWrapperBuilder extends FtlBuilder {
    fn:any

    constructor(fn:any) {
      super();
      this.fn = fn;
    }

    build(module:any, inputFn:any) {
      return this.fn;
    }
  }

  class ConstBuilder extends FtlBuilder {
    val:any
  
    constructor(val:any) {
      super();
      this.val = val;
    }

    build(module:any, inputFn:any) {
      return new ftl.ConstFn(this.val);
    }
  }

  class RefBuilder extends FtlBuilder {
    name:string

    constructor(name:string) {
      super();
      this.name = name;
    }

    build(module:any, inputFn:any) {
      if (this.name.startsWith('_') || inputFn instanceof ftl.TupleFn && inputFn.hasName(this.name))
        return new ftl.RefFn(this.name);

      var f = module.getAvailableFn(this.name);
      if (f)
        return buildFunctionCall(f, module, inputFn);

      let ret = new ftl.RefFn(this.name);
      ret.unresolved = true;
      return ret;
    }
  }

  class TupleElementBuilder extends FtlBuilder {
    id:any
    expr:any

    constructor(id:any, expr:any) {
      super();
      this.id = id;
      this.expr = expr;
    }

    set isFunctionArg(val:any) {
      this.expr.isFunctionArg = val;
    }

    set seq(val:any) {
      this.expr.seq = val;
    }

    build(module:any, inputFn:any) {
      var iid = this.id && this.id.name;
      var expr = this.expr instanceof FtlBuilder ? this.expr.build(module, inputFn) : this.expr;
      return iid == null ? expr : new ftl.NamedExprFn(iid, expr);
    }
  }

  class FunctionInterfaceBuilder extends FtlBuilder {
    name:string
    params:any
    seq:number

    constructor(name:string, params:any, seq = 0) {
      super();
      this.name = name;
      this.params = params;
      this.seq = seq;
    }

    build(module:any, inputFn:any) {
      if (this.name.endsWith('$') && this.name.length > 1) {
        this.name = this.name.substr(0, this.name.length - 1);
      }

      return new ftl.FunctionInterfaceFn(this.name, this.params.build(module, inputFn), this.seq);
    }
  }

  /**
   * This class captures n-ary operator expression. It is transient during parsing and building.
   */
  class N_aryOperatorExpressionBuilder extends FtlBuilder {
    ops:any
    operands:any

    constructor(ops:any, operands:any) {

      super();
      this.ops = ops;
      this.operands = operands;
    }

    build(module:any, inputFn:any) {
      ftl.FnValidator.assertNonEmptyArray(this.ops);

      var current_index = 0;
      var stop_index = this.ops.length;

      // This is used to parse operators and operands recursively.
      // It is called from index = length of operators down to 1.
      function parse_operators(ops:any, operands:any, index:number, full:boolean):any {

        // operand at index 1 is for operator at 
        var op = index == 1 ? ops[0] : ops.slice(0, index).join(' ')
        var f = module.getAvailableFn(op);

        // no corresponding function found for single op
        if (!f) {
          if (index == 1)
            throw new FtlBuildError("No function with name '" + op + "' found!");

          index--;
          var reduced = parse_operators(ops, operands, index, false);
          
          if (current_index == stop_index)
            return reduced;

          ops = ops.slice(index, ops.length)
          operands = [reduced].concat(operands.slice(index + 1, operands.length))
          return parse_operators(ops, operands, ops.length, true)
        }

        for (var i = 0; i < f.params.fns.length; i++) {
          var fn = f.params.fns[i];
          if (fn.wrapped instanceof ftl.FunctionInterfaceFn) {
            //fnode.wrapped.isNative = f instanceof ftl.NativeFunctionFn;
            console.debug(inputFn);

            // build the ExprRefFn wrapped element outside ExprRefFn itself
            // this is because inputFn is available here
            operands[i] = new FnWrapperBuilder(new ftl.ExprRefFn(fn.wrapped, operands[i].build(module, inputFn)));
          }
        }

        current_index += index;
        var operands_tuple = new TupleBuilder(... operands.slice(0, f.params.fns.length));

        return new PipeBuilder(operands_tuple, f);
      }

      return parse_operators(this.ops, this.operands, this.ops.length, true).build(module, dummy_param_tuple);
    }
  }

  /**
   * Builds a TupleFn.
   * 
   * If elms is empty, it builds an empty TupleFn.
   */
  class TupleBuilder extends FtlBuilder {
    fns:any

    constructor(... fns:any[]) {
      super();
      this.fns = fns;
    }

    // Checks duplicates of names.
    build(module:any, inputFn:any) {
      ftl.FnValidator.assertElmsTypes(this.fns, FtlBuilder, ftl.Fn);

      return new ftl.TupleFn(... this.fns.map((fn:any) => fn instanceof FtlBuilder && fn.build(module, inputFn) || fn));
    }
  }

  class PipeBuilder extends FtlBuilder {
    elements:any[]

    constructor(... elements:any[]) {
      super();
      this.elements = elements;
    }

    build(module:any, inputFn:any) {
      ftl.FnValidator.assertElmsTypes(this.elements, ftl.Fn, FtlBuilder);
      var prev = inputFn;
      var fns = [];
      for (var i = 0; i < this.elements.length; i++) {
        fns.push(this.elements[i] instanceof ftl.Fn && this.elements[i] || this.elements[i].build(module, prev));

        // pure single ref, replace with (NamedExprFn(name, ...))
        if (fns[i] instanceof ftl.RefFn && !fns[i].name.startsWith('_')) {

          var ref:any = (inputFn == null || inputFn == undefined || !(inputFn instanceof ftl.TupleFn || (inputFn instanceof ftl.TupleFn && !inputFn.hasName(fns[i].name)))) ?
            new ftl.TupleSelectorFn(0) : fns[i];
            fns[i] = new ftl.TupleFn(new ftl.NamedExprFn(fns[i].name, ref));
        }
        prev = fns[i];
      }

      // expands contained PipeFn elements which may be before or after build
      for (var i = fns.length; i >= 0; i--)
        if (fns[i] instanceof ftl.PipeFn)
          fns.splice(i, 1, ... fns[i].fns);

      return new ftl.PipeFn(... fns);
    }
  }

  /**
   * Builds tuple for parameters.
   * 
   * Function parameters are different from tuple where any non-named element is treated as a name.
   */
  class ParamTupleBuilder extends TupleBuilder {
    constructor(... params:any[]) {
      super(... params);
    }

    build(module:any, inputFn:any) {
      for (var i = 0; i < this.fns.length; i++) {
        let fn = this.fns[i];
        fn.isFunctionArg = true;
        fn.seq = i;
      }

      let fns = this.fns.map((fn:any) => fn instanceof FtlBuilder && fn.build(module, inputFn) || fn);

      ftl.FnValidator.assertElmsTypes(fns, ftl.RefFn, ftl.NamedExprFn, ftl.FunctionInterfaceFn, ftl.CallExprFn);

      var default_count = 0;
      for (var i = 0; i < fns.length; i++) {
        var fn = fns[i];

        // param with default value
        if (fn instanceof ftl.NamedExprFn) {
          default_count++;
          fns[i] = new ftl.NamedExprFn(fn.name, new ftl.SeqSelectorOrDefault(i, fn.wrapped));
        }

        // position param
        else {
          if (default_count > 0)
            throw new FtlBuildError("FTL0002: Position parameter at index " + i + " is after parameter with default value!");

          // simple param
          if (fn instanceof ftl.RefFn)
            fns[i] = new ftl.NamedExprFn(fn.name, new ftl.TupleSelectorFn(i));

          else if (fn instanceof ftl.CallExprFn) {
            fn = new ftl.FunctionInterfaceFn(fn.name, fn.params[0])
            fn.seq = i;
            fns[i] = new ftl.NamedExprFn(fn.name, fn);            
          }

          // function param
          else if (fn instanceof ftl.FunctionInterfaceFn) {
            fns[i] = new ftl.NamedExprFn(fn.name, fn);            
          }

          else
            throw new FtlBuildError("FTL0003: Element at index " + i + " is not a qualified parameter!");
        }
      }

      // The following is for existanceof input.
      // This happens for anonymous inline functions.
      return new ftl.TupleFn(... fns);
    }
  }

  class ExprCurryBuilder extends FtlBuilder {
    f:any
    paramtuples:any
    constructor(f:any, ... paramtuples:any[]) {
      super();
      this.f = f;
      this.paramtuples = paramtuples;
    }

    build(module:any, inputFn:any) {
      ftl.FnValidator.assertElmType(this.f, FtlBuilder);
      ftl.FnValidator.assertElmsTypes(this.paramtuples, FtlBuilder);

      return new ftl.ExprFn(this.f.build(module, inputFn), ... this.paramtuples.map(
        (paramtuple:any) => paramtuple.build(module, inputFn)
      ));
    }
  }

  class CallExprBuilder extends FtlBuilder {
    name:string
    params:any

      // tells if the call expression is part of function arguments
    isFunctionArg:boolean = false;
    seq:number = 0

    constructor(name:string, params:any) {
      super();
      this.name = name;
      this.params = params;
    }

    combine(... tuples:any[]) {
      function split(tuple:any) {
        for (var i = 0; i < tuple.size; i++) {
          if (tuple.fns[i] instanceof ftl.NamedExprFn)
            return [tuple.fns.slice(0, i), tuple.fns.slice(i)];
        }
        return [tuple.fns, []];
      }

      if (tuples.length == 1)
        return tuples[0];

      var pos_elms:any[] = [];
      var name_elms = new Map();
      tuples.forEach(tuple => {
        var sections = split(tuple);
        pos_elms.push(... sections[0]);
        sections[1].forEach((name_elm:any) => {
          name_elms.set(name_elm.name, name_elm);
        })
      });

      return new ftl.TupleFn(... pos_elms, ... name_elms.values());
    }

    combineMultiTuples(module:any, inputFn:any, paramsArray:any) {
      if (paramsArray.length == 1)
        return paramsArray[0];

      let posParams:any[] = [];
      let namedParams:any[] = [];
      paramsArray.forEach((params:any) => {
        if (params.fns.length == 0) {
          throw new Error('Redundent curry with no arguments!');
        }

        params.fns.forEach((param:any) => {
          if (param instanceof ftl.NamedExprFn)
            namedParams.push(param);
          else
            posParams.push(param);
        })
      })

      return new TupleBuilder(... posParams.concat(namedParams)).build(module, inputFn);
    }

    build(module:any, inputFn:any) {
/*      if (inputFn instanceof ftl.TupleFn && inputFn.hasName(this.name)) {
        for (var i = 0; i < this.fns.length; i++)
          this.fns[i] = this.fns[i].build(module, inputFn);

        // TODO this seems not right
        return this;
      }
*/
      // calling expression is a function invocation
      if (module.hasFn(this.name)) {
        var f = module.getAvailableFn(this.name);
        if (f) {
          let params = this.combineMultiTuples(module, inputFn, this.params.map((p:any) => p.build(module, inputFn)));
          let f_params = f.params.fns;

          let params_len = f_params.length;

          if (params_len > 0 && params.fns.length == 0)
            throw new Error(`Calling ${f.name} with no argument provided! For currying, provide at least one argument.`);

          //var input = (inputFn instanceof ftl.TupleFn) ? inputFn : new ftl.TupleFn(inputFn);
          //var combined = this.combine(... params.fns, input);
          var combined = params;
          //for (var i = 0; i < params_len; i++)
          //  if (f_params[i].wrapped && f_params[i].wrapped instanceof ftl.FunctionInterfaceFn)
          //    combined.fns[i] = new ftl.ExprRefFn(f_params[i].wrapped, combined.fns[i]);

          // TODO combine following two parts
          let built = buildFunctionCall(f, module, combined);
          if (built == f)
            return new ftl.PipeFn(combined, f);
          else
            return built;
/*
          var curry_params_len = this.fns[0].size;
          var ret = null;
          if (curry_params_len >= params_len)
            ret = new ftl.PipeFn(this.fns[0], f);
          else if (inputFn instanceof TupleFn && inputFn.size + curry_params_len.size >= params_len) {
            new ftl.TupleFn(... inputFn.slice(0, params_len - this.fns[0].size))
            var extra = ftl.NativeFunctionFn.validateInput(inputFn, this.fns[0]);

            ret = new ftl.PipeFn(new ftl.TupleFn(... inputFn.slice(0, params_len - this.fns[0].size), ... this.fns[0].fns), f);
          }
          else if (!(inputFn instanceof TupleFn) && this.fns[0].size + 1 >= params_len)
            ret = new ftl.PipeFn(new ftl.TupleFn(inputFn, ... this.fns[0].fns), f);
          else
            throw new Error("calling arguments to " + f + " does not match argument number!"); 

          return ret.build(module, inputFn);
*/
        }
      }

      else if (this.isFunctionArg)
        return new FunctionInterfaceBuilder(this.name, this.params[0], this.seq).build(module, inputFn);

      // Not resolved. It may be a recursive function call
      let unresolved = new ftl.RefFn(this.name)
      unresolved.unresolved = true;
      return new ftl.CallExprFn(this.name, unresolved, [this.combineMultiTuples(module, inputFn, this.params.map((p:any) => p.build(module, inputFn)))]);
    }
  }

  class FunctionBuilder extends FtlBuilder {
    id:any
    params:any
    body:any
    script:any
    constructor(id:any, params:any, body:any) {
      super();
      this.id = id;
      this.params = params;
      this.body = body;
    }

    build(module:any, inputFn:any) {
      if (this.id instanceof ftl.RefFn && this.body instanceof ftl.RefFn && this.params == null) {
        throw new Error("Error on a function declaration with '" + this.id.name + "' and '" + this.body.name + "'. Are you overriding -> ?");
      }

      var is_operator = this.id.type == 'OperatorDeclaration' || this.id.type == 'PostfixOperatorDeclaration';
      if (is_operator)
        console.log('parameter list for operator: ', this.id.operands);
      else
        console.log('parameter list for function: ', optionalList(this.params));

      var param_list = is_operator ? this.id.operands : optionalList(this.params);
      param_list = Array.isArray(param_list) ? param_list : param_list instanceof TupleBuilder ? param_list.fns : [param_list];

      // @TODO will never be called
      for (var i = 0; i < param_list.length; i++)
        if (param_list[i] instanceof ftl.CallExprFn) {
          param_list[i] = new ftl.FunctionInterfaceFn(param_list[i].name, param_list[i].params[0]);
        }

      console.log('parameter list: ', param_list)
      param_list = new ParamTupleBuilder(... param_list).build(module, new ftl.TupleFn());
      var name = this.id.name || this.id;

      // prefix operator
      if (!is_operator && this.isOperator(name)) {
        name = ' ' + name;
      }

      if (this.body.script) {
        return this.buildNativeFunction(module, name, param_list, this.body.script);
      }
      else {
        var f_body = new PipeBuilder(param_list, this.body).build(module, new ftl.TupleFn());
        var f_params = f_body.fns[0];
        let ret = new ftl.FunctionFn(name, f_params, f_body);

        this.resolveRecursiveRef(ret, f_body);
        return ret;
      }
    }

    resolveRecursiveRef(f:any, expr:any) {

      // Even if an expr is already a FunctionFn, it may still need to be relplaced
      // when recursive may have been resolved to an imported function to be overriden
      function maybeRecursive(expr:any) {
        return expr instanceof ftl.RefFn && expr.unresolved || expr instanceof ftl.FunctionFn;
      }

      if (expr instanceof ftl.PipeFn || expr instanceof ftl.TupleFn) {
        for (let i = 0; i < expr.fns.length; i++) {
          let e = expr.fns[i];
          if (e.name == f.name && maybeRecursive(e)) {
              expr.fns[i] = f;
          } else
            this.resolveRecursiveRef(f, e);
        }
      }
      else if (expr instanceof ftl.WrapperFn) {
        let e = expr.wrapped as any;
        if (e.name == f.name && maybeRecursive(e)) {
          expr.wrapped = f;
        }
        else {
          this.resolveRecursiveRef(f, e);
        }
      } else if (expr instanceof ftl.CallExprFn && expr.f) {
        let e = expr.f as any;
        if (e.name == f.name && maybeRecursive(e)) {
          expr.f = f;
        }
      }
    }

    isOperator(name:string) {
      return OPERATOR_SYMBOLS.includes(name[0]);
    }

    buildNativeFunction(module:any, name:string, params:any, script:any) {
      if (params instanceof FtlBuilder)
        params = params.build(module, new ftl.TupleFn());

      if (typeof this.script != 'function') {
        var param_list = [];
        if (params != null) {
          for (var i = 0; i < params.fns.length; i++) {
            var param = params.fns[i];

            // TODO what is the case for param as string
            if (typeof param == 'string')
              param_list.push(param)
            else
              param_list.push(param.name);
          }
        }

        script = eval("(function(" + param_list.join(',') + ")" + script + ")");
      }      

      return new ftl.NativeFunctionFn(name, params, script);
    }
  }

  /**
   * This is a post build with both f and inputFn built already.
   * @param {*} f 
   * @param {*} module 
   * @param {*} inputFn 
   */
  function buildFunctionCall(f:any, module:any, inputFn:any) {

    // tuple to a function has to satisfy argument spec:
    // named arguments has to be after position params.
    function validateInput(args:any, params:any, minSize:number) {
      var names = new Set();
      var pos_sz = 0;

      // validate sequence of position and named args
      for (var i = 0; i < args.size; i++) {
        if (args.fns[i] instanceof ftl.NamedExprFn) {
          names.add(args.fns[i].name);
        } else if (names.size > 0) {
          throw new Error("Position argument at index " + i + " after named argument!");
        } else
          pos_sz = i + 1;
      }

      // no named args and has enough positioned args
      if (names.size == 0 && args.size >= minSize)
        return null;

      var need_new_args = false;
      var new_args = new Array(params.size);

      let selector_pos = 0;
      for (var i = 0; i < params.size; i++) {
        var name = params.fns[i].name;

        // position arg
        if (i < pos_sz) {
          if (names.has(name)) {
            throw new Error("Parameter " + name + " is provided with both position and named argument!");
          }

          new_args[i] = args.fns[i];
        }

        // named param and no corresponding arg
        else if (!names.has(name)) {
          new_args[i] = new ftl.NamedExprFn(params.fns[i].name, new ftl.TupleSelectorFn(selector_pos++));
          need_new_args = true;
        }

       // named param matched with same named arg
        else if (i < args.size && args.fns[i].name == name) {
          new_args[i] = args.fns[i];
        }

        else {
          new_args[i] = args.getNamedFn(name);
          need_new_args = true;
        }
      }

      return need_new_args ? new ftl.TupleFn(... new_args) : null;
    }

    console.log(f);
    if (!(inputFn instanceof ftl.TupleFn))
      inputFn = new ftl.TupleFn(inputFn);

    var min_param_sz = f.params.size;
    for (var i = 0; i < f.params.size; i++)

      // functional
      if (f.params.fns[i].wrapped instanceof ftl.FunctionInterfaceFn) {
        inputFn.fns[i] = new ftl.FunctionalFn(inputFn.fns[i]);
      }
      else if (f.params.fns[i].wrapped instanceof ftl.SeqSelectorOrDefault) {
        min_param_sz = i;
        break;
      }

    var new_tuple = validateInput(inputFn, f.params, min_param_sz);
    return new_tuple ? new ftl.PipeFn(new_tuple, f) : f;
  }

  class ArrayElementSelectorBuilder extends FtlBuilder {
    name:string
    index:any
    constructor(name:any, index:number) {
      super();
      this.name = name.name;
      this.index = index;
    }

    build(module:any, inputFn:any) {
      return this.index instanceof RefBuilder
        ? new ftl.ArrayElementSelectorFn(this.name, this.index.build(module, inputFn))
        : new ftl.ArrayElementSelectorFn(this.name, new ftl.ConstFn(parseInt(this.index)));
    }
  }

export default {
  buildModule,
  ArrayElementSelectorBuilder,
  ConstBuilder,
  FnWrapperBuilder,
  FunctionBuilder,
  FunctionInterfaceBuilder,
  N_aryOperatorExpressionBuilder,
  ParamTupleBuilder,
  PipeBuilder,
  RefBuilder,
  TupleBuilder,
  TupleElementBuilder
}
