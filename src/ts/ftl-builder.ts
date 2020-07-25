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
  if (buildInfo instanceof ftl_parser.BuildInfo) {
    let builder = getBuilder(buildInfo.name)
    return builder(buildInfo.details, module, input)
  }
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

function buildMapExpression(details:any, module:any, input?:any) {
  let prev:any = input
  let map_expr = details.elements.map((element:BuildInfo) => {
    return prev = buildElement(element, module, prev)
  })
  return map_expr.length == 1 ? map_expr[0] : new ftl.PipeFn(... map_expr)
}

function buildMapOperand(details:any, module:any, prev:any=null) {
  var built
  var raise = false
  try {
    built = buildElement(details.expr, module, prev)
  } catch (e)
  {
    // array initializer
    if (e instanceof N_aryOperatorBuildError && (e.op == ':' || e.op == ': :')) {
      let start = e.operands[0]
      let interval = e.op == ':' ? new ftl.ConstFn(1) : e.operands[1]
      let end = e.op == ':' ? e.operands[1] : e.operands[2]
      return new ftl.ArrayInitializerWithRangeFn(start, end, interval)
    }

    if (e instanceof N_aryOperatorBuildError && (e.op == '.' || e.op == '. .')) {
      return new ftl.PropertyAccessorFn(e.operands[0], ... e.operands.slice(1).map(o => o.name))
    }

    // raise operator
    else if (e instanceof PrefixOperatorNotFoundError && e.op == '. ') {
      raise = true
      built = e.operand
    }
    
    else {
      throw e
    }
  }
 
  if (built instanceof ftl.RefFn) {
    let name = built.name
    if (name.startsWith('_') || prev instanceof ftl.TupleFn && prev.hasName(name))
      return built
    var f = module.getAvailableFn(name);

    // TODO: buildFunctionCall
    if (f)
      built = f
  }

  return raise ? new ftl.RaiseFunctionForArrayFn(built) : built
}

function buildOperatorExpression(details:any, module:any, input?:any) {
  return buildElement(details.unit, module, input)
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
      operands.push(buildElement(operand, module, input))
    } catch (e) {

      if (!(e instanceof PrefixOperatorNotFoundError)) {
        if (e instanceof PostfixOperatorBuildError) {
          operands.push(e.operand)
          throw new N_aryOperatorBuildError(e.message, `${details.ops.join(' ')}${e.op}`, operands)
        }
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
        module, input)
      )
      operands.push(buildElement(operand.details.expr, module, input))
      details.ops[i - 1] = (e as PrefixOperatorNotFoundError).op.trim()
    }
  }

  
  return (

    // This is used to parse operators and operands recursively.
    // It is called from index = length of operators down to 1.
    function parse_operators(module:any, inputFn:any, ops:string[], operands:any[], index:number, full:boolean, extra:any): any {

      // operand at index 1 is for operator at 
      var op = index == 1 ? ops[0] : ops.slice(0, index).join(' ')
      var f = module.getAvailableFn(op);
      var raise = false
      // no corresponding function found for single op
 
      if (!f && index == 1 && op.length > 1 && op.startsWith('.')) {
        op = op.substring(1)
        raise = true
        f = module.getAvailableFn(op)
      }

      if (!f) {
        if (index == 1) {
          throw new N_aryOperatorBuildError(`N-ary operator ${ops} not found!`, op, operands)
        }
        
        index--;

        try {
          var reduced = parse_operators(module, inputFn, ops, operands, index, false, extra);

          if (extra.current_index == extra.stop_index)
            return reduced;

          ops = ops.slice(index, ops.length)
          operands = [reduced].concat(operands.slice(index + 1, operands.length))
          return parse_operators(module, inputFn, ops, operands, ops.length, true, extra)
        } catch(e) {
          throw new N_aryOperatorBuildError(`N-ary operator ${ops} not found!`, op, operands)
        }
      }

      for (var i = 0; i < f.params.fns.length; i++) {
        var fn = f.params.fns[i];
        if (fn instanceof ftl.NamedExprFn && fn.wrapped instanceof ftl.FunctionInterfaceFn) {
          //fnode.wrapped.isNative = f instanceof ftl.NativeFunctionFn;
          console.debug(inputFn);

          // wrap functional interface and input function with ExprRefFn.
          // This can be done only here with inputFn available
          operands[i] = new ftl.ExprRefFn(fn.wrapped, operands[i])
        }
      }

      extra.current_index += index;
      var operands_tuple = new ftl.TupleFn(... operands.slice(0, f.params.fns.length))

      return new ftl.PipeFn(operands_tuple, raise ? new ftl.RaiseBinaryOperatorForArrayFn(f) : f)
    }
  )(module, input, details.ops, operands, details.ops.length, true, {current_index:0, stop_index:details.ops.length})
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

  // functional interface
  // its sequence is detemined in buildInfixOperatorDeclaration(...)
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
  let params:any

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
    let arrow = body.map((arrow:any) => buildElement(arrow, module, params))

    // TODO arrow extract from pipe fn
    fn = new ftl.FunctionFn(f_name, params, new ftl.PipeFn(params, ... arrow))
   }

  module.addFn(fn)
  return fn
}

function buildPrefixOperatorExpression(details:any, module:any) {
    let op = `${details.operator} `
    let f = module.getAvailableFn(op)
    let expr = buildElement(details.expr, module)
    if (!f) {
      throw new PrefixOperatorNotFoundError(`Prefix operator "${op}" not found!`, op, expr)
    }

    if (expr instanceof ftl.TupleFn && expr.fns.length == 1) {
      return new ftl.PipeFn(expr.fns[0], f)
    } else {
      return new ftl.PipeFn(expr, f)
    }
}

function buildPostfixOperatorExpression(details:any, module:any) {
  let operator = ` ${details.operator}`
  let f = module.getAvailableFn(operator)
  let expr = buildElement(details.expr, module)
  if (!f) {
    throw new PostfixOperatorBuildError(`Postfix operator "${operator}" not found!`, operator, expr)
  }
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
    let f:ftl.FunctionBaseFn|ftl.RefFn = module.getAvailableFn(name)
    if (!f) {
      f = prev && prev.hasName(name) && new ftl.RefFn(name, module)
      if (!f)
        throw new Error(`${name} not found!`)
    }

    let params = details.params.map((p:any) => buildElement(p, module, prev))
    if (f instanceof ftl.FunctionBaseFn) {
      let minParamCount = f.params.fns.filter((p:ftl.NamedExprFn) => p.wrapped instanceof ftl.TupleSelectorFn).length
      if (params[0].size < minParamCount) {
        throw new FtlBuildError(`At least ${minParamCount} arguments are needed to call ${f.name}`)
      }
    }

    return new ftl.CallExprFn(name, f, params)
  }

  
function buildArrayLiteral(details:any, module:any) {
  let elms = buildElement(details.list, module)
  let consts = elms.filter((e:any) => {
    e instanceof ftl.ConstFn
  })
  if (consts.length == elms.length) {
    var res:any[] = []
    for (let i = 0; i < elms.length; i++) {
      if (elms[i] instanceof ftl.ConstFn) {
        var val = elms[i].apply()
        if (Array.isArray(val)) {
          res.splice(res.length, 0, ... val)
        } else {
          res.push(val)
        }
      } else {

      }
    }
  
    return new ftl.ConstFn(res)  
  }

  else {
    return new ftl.ArrayInitializerFn(... elms)
  }
}
  
function buildListLiteral(details:any, module:any) {
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
  try {
    let index = typeof details.index == 'string' ? parseInt(details.index) : buildElement(details.index, module)
    if (index instanceof ftl.ArrayInitializerFn) {

      // TODO allow ArrayElementSelectorFn takes multiple values
      if (index.values.length != 1) {
        throw new Error('ArrayElementSelectorFn not supporting multiple values yet!')
      }
      return new ftl.ArrayElementSelectorFn(name, index.values[0])
    }
    return new ftl.ArrayElementSelectorFn(name, index)
  }
  catch(e) {
    if (e instanceof N_aryOperatorBuildError) {
      if (e.op == ': :') {
        let end = e.operands.length == 2 ? -1 : e.operands[2].apply()
        return new ftl.ArrayRangeSelectorFn(name, e.operands[0].apply(), end, e.operands[1].apply())
      }
    }
    throw e
  }
}
  
function buildTuple(details:any, module:any, prev?:any) {
  let all_elms = details.elements.map((element:BuildInfo) => {
    return buildElement(element, module, prev)
  })

  let all_names = new Set<string>()

  all_elms.forEach((element:any) => {
    if (element instanceof ftl.NamedExprFn) {
      let name = element.name
      if (all_names.has(name)) {
        throw new FtlBuildError(`${name} already exists!`)
      }
      all_names.add(element.name)
    }
  })

  for (var i = 0; i < all_elms.length; i++) {
    let elm = all_elms[i]
    if (elm instanceof ftl.RefFn && !all_names.has(elm.name)) {
      all_elms[i] = new ftl.NamedExprFn(elm.name, elm)
    }
  }

  return new ftl.TupleFn(... all_elms)
}

function buildTupleElement(details:any, module:any, prev?:any) {
  let name = buildElement(details.name, module)
  let expr = buildElement(details.expr, module, prev)
  return name && new ftl.NamedExprFn(name.name, expr) || expr
}

function buildIdentifier(details:any, module:any) {
  return new ftl.RefFn(details.name, module)
}

// builds function parameter
function build_function_parameters(params:ftl.TupleFn) {
  let fns = params.fns.map((p:any, i:number) => {
    if (p instanceof ftl.RefFn) {
      return new ftl.NamedExprFn(p.name, new ftl.TupleSelectorFn(i))
    }
    else if (p instanceof ftl.NamedExprFn && p.wrapped instanceof ftl.RefFn) {
      p.wrapped = new ftl.TupleSelectorFn(i)
      return p
    }
    else if (p instanceof ftl.FunctionInterfaceFn)
      return new ftl.NamedExprFn(p.name, p)
    else
      return p
  })
  return new ftl.TupleFn(... fns)
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
  constructor(message:string) {
    super(message);
  }
}

class PrefixOperatorNotFoundError extends FtlBuildError {
  op:string
  operand:any
  constructor(message:string, op:string, operand:any) {
    super(message);
    this.op = op
    this.operand = operand
  }
}

class N_aryOperatorBuildError extends FtlBuildError {
  op:string
  operands:any[]
  constructor(message:string, op:string, operands:any[]) {
    super(message)
    this.op = op
    this.operands = operands
  }
}

class PostfixOperatorBuildError extends FtlBuildError {
  op:string
  operand:any
  constructor(message:string, op:string, operand:any) {
    super(message)
    this.op = op
    this.operand = operand
  }
}
