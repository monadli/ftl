import fs from 'fs'
import * as ftl from './ftl-core'
import * as  ftl_parser from './ftl-parser'

var runPath: string

Error.stackTraceLimit = Infinity

export function setRunPath(path: string) {
  runPath = path
}

const OPERATOR_SYMBOLS = '!%&*+\-./:<=>?^|\u00D7\u00F7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283'

type BuildInfo = ftl_parser.BuildInfo

/**
 * Error for module not found.
 */
export class ModuleNotFoundError extends Error {
  moduleName: string

  constructor(moduleName: string) {
    super()
    this.moduleName = moduleName
    this.message = 'Module not exist!'
  }
}

function buildingFor(context:string) {
  let stack = new Error().stack
  return stack?.includes(`at build${context} (`)
}

export function buildModuleWithContent(path:string, content:string) {
  let module = new ftl.Module(path)
  return buildToModule(content, module)
}

export function buildModule(path:string, ftlFile:string) {
  let content = fs.readFileSync(`${runPath}/${ftlFile}.ftl`, 'utf-8')
  return buildModuleWithContent(ftlFile, content)
}

export function buildToModule(ftl_content:string, module:ftl.Module) {
  let parsed = ftl_parser.peg$parse(ftl_content)
  if (!parsed)
    return undefined
  buildElement(parsed, module)
  return module
}

function buildElement(buildInfo:any, module:any, input:any=null):any {
  if (buildInfo instanceof ftl_parser.BuildInfo) {
    let builder = getBuilder(buildInfo.name)
    return builder(buildInfo.details, module, input)
  }
  else if (Array.isArray(buildInfo) && buildInfo.some(e => e instanceof ftl_parser.BuildInfo)) {
    return buildInfo.map(e => buildElement(e, module, input))
  }
  else
    return buildInfo
}

function getBuilder(name:string) {
  let builder =  eval(`build${name}`) //buildElements[name]
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

function buildImportSingleItem(details: any, module: any) {
  function getModulePath() {
    let last_slash = module._name.lastIndexOf('/')
    return last_slash == -1 ? '' : module._name.substring(0, last_slash)
  }

  let path: string = details.path
  if (path.endsWith('.')) path = path.substring(0, path.length - 1)

  let name_elm = buildElement(details.name, module)
  var name:string|null = name_elm.name || name_elm

  let asName = buildElement(details.item, module)?.name

  if (path.endsWith('/')) {
    path += name
    name = null
  }

  if (path.startsWith('.')) {
    path = getModulePath() + path.substring(1)
  }

  // absolute import
  else {
    path = `lib/${path}`
  }

  var mod = ftl.getModule(path)

  if (!mod) {
    mod = buildModule(runPath, path)
    if (!mod)
      throw new ModuleNotFoundError(path)

    ftl.addModule(mod)
  }

  // import all
  if (!name) {
    if (asName != null)
      throw new Error("Importing * (all) can not have alias name!")

    mod.functionNames.forEach((n: string) => {
      module.addImport(n, mod!.getExportableFn(n))
    })
  }
  else
    module.addImport(asName || name, mod.getExportableFn(name))
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
    var f = module.getAvailableFn(name)

    // TODO: buildFunctionCall
    if (f)
      built = f
  }

  return raise ? new ftl.RaiseFunctionForArrayFn(built) : built
}

function buildOperatorExpression(details:any, module:any, input?:any) {
  try {
    return buildElement(details.unit, module, input)
  } catch (e) {

    // array initializer
    if (e instanceof N_aryOperatorBuildError && (e.op == ':' || e.op == ': :')) {
      let start = e.operands[0]
      let interval = e.op == ':' ? new ftl.ConstFn(1) : e.operands[1]
      let end = e.op == ':' ? e.operands[1] : e.operands[2]
      if (end == undefined) {
        end = new ftl.ConstFn(-1)
      }
      return new ftl.ArrayInitializerWithRangeFn(start, end, interval)
    }

    // array selector
    else if (e instanceof PostfixOperatorBuildError && e.op == ' :') {
      let start = e.operand
      let interval = new ftl.ConstFn(1)
      let end = new ftl.ConstFn(-1)
      return new ftl.ArrayInitializerWithRangeFn(start, end, interval)
    }

    // tuple element selector
    else if (e instanceof N_aryOperatorBuildError && (e.op == '.' || e.op == '. .')) {
      return new ftl.PropertyAccessorFn(e.operands[0], ... e.operands.slice(1).map(o => o.name))
    }

    else {
      throw e
    }

  }
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
function buildN_aryOperatorExpression(details:any, module:ftl.Module, input:any=null) {
  let operands = []
  for (let i = 0; i < details.operands.length; i++) {
    let operand = details.operands[i]
    try {
      let operand_build = buildElement(operand, module, input)
      if (operand_build instanceof ftl.RefFn && module
        && (!input
          || (input instanceof ftl.NamedExprFn && input.name != operand_build.name)
          || (input instanceof ftl.TupleFn && !input.hasName(operand_build.name)))
      ) {
        let f = module.getAvailableFn(operand_build.name)
        if (f) {
          operands.push(f)
          continue
        }
      }
      operands.push(operand_build)
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
    function parse_operators(module:ftl.Module, inputFn:any, ops:string[], operands:any[], index:number, full:boolean, extra:any): any {

      // operand at index 1 is for operator at 
      var op = index == 1 ? ops[0] : ops.slice(0, index).join(' ')
      var f = module.getAvailableFn(op)
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
        
        index--

        try {
          var reduced = parse_operators(module, inputFn, ops, operands, index, false, extra)

          if (extra.current_index == extra.stop_index)
            return reduced

          ops = ops.slice(index, ops.length)
          operands = [reduced].concat(operands.slice(index + 1, operands.length))
          return parse_operators(module, inputFn, ops, operands, ops.length, true, extra)
        } catch(e) {
          throw new N_aryOperatorBuildError(`N-ary operator ${ops} not found!`, op, operands)
        }
      }

      for (var i = 0; i < f.params.size; i++) {
        var fn = f.params.getFnAt(i)
        if (fn instanceof ftl.NamedExprFn && fn.wrapped instanceof ftl.FunctionInterfaceFn) {
          //fnode.wrapped.isNative = f instanceof ftl.NativeFunctionFn
          console.debug(inputFn)

          // wrap functional interface and input function with ExprRefFn.
          // This can be done only here with inputFn available
          operands[i] = new ftl.ExprRefFn(fn.wrapped, operands[i])
        }
      }

      extra.current_index += index
      var operands_tuple = new ftl.TupleFn(... operands.slice(0, f.params.size))

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
      operand.seq = i
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
    name = name.substr(0, name.length - 1)
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
  let signature = buildElement(details.signature, module, null)

  let f_name
  let params:ftl.TupleFn

  // prefix operator or infix operator
  if (signature.operator || signature.operators) {
    params = signature.operand && build_function_parameters(new ftl.TupleFn(signature.operand))
            || build_function_parameters(new ftl.TupleFn(... signature.operands))
    f_name = signature.postfix ? ` ${signature.operator}` : signature.operators || (params.size == 1 ? `${signature.operator} ` : signature.operator)
  } else {
    f_name = signature.name
    params = signature.params
  }

  let body = details.body

  let param_list = params.map((p:any) => p.name)
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

    if (expr instanceof ftl.TupleFn && expr.size == 1) {
      return new ftl.PipeFn(expr.first, f)
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

  let call_args:ftl.TupleFn[] = details.params.map((p:any) => buildElement(p, module, prev))

  // lambda calculus
  if (name == '$') {
    if (call_args.length == 1) {
      return build_function_parameters(call_args[0])
    }
    else {
      throw new FtlBuildError('Lambda calculus not supporting curry yet')
    }
  }

  let f:ftl.FunctionBaseFn|ftl.RefFn = module.getAvailableFn(name)
  if (!f) {
    f = prev && prev.hasName(name) && new ftl.RefFn(name, module)
    if (!f) {
      if (!buildingFor('FunctionDeclaration')) {
        throw new Error(`${name} not found!`)
      }

      return new ftl.FunctionInterfaceFn(name, call_args)
    }
  }

  if (f instanceof ftl.FunctionBaseFn && f.params.size == 0) {
    if (call_args.length > 1) {
      throw new FtlBuildError(`${name} has no parameters and more than one calls is found!`)
    }

    if (call_args[0].size > 0) {
      throw new FtlBuildError(`${name} has no parameters and ${call_args[0].size} arguments are provided!`)
    }

    return new ftl.CallExprFn(name, f, [new ftl.TupleFn()])
  }

  let new_params:any[]
  if (f instanceof ftl.FunctionBaseFn) {
    new_params = Array.from(f.params.fns)

    var positional_args = new Set<string>()
    var named_args = new Set<string>()
    var unproced_named_args = new Map<string, any>()

    if (call_args[0].size == 0 && (f.params.first! as any).wrapped instanceof ftl.TupleSelectorFn) {
      throw new FtlBuildError(`At least 1 argument is needed to call ${f.name}`)
    }

    for (var n = 0; n < call_args.length; n++) {
      if (n > 0 && call_args[n].size == 0) {
        throw new Error('Currying with no arguments!')
      }

      let left_params = new_params.filter((p:ftl.Fn) => p instanceof ftl.NamedExprFn && p.wrapped instanceof ftl.TupleSelectorFn)
      if (left_params.length == 0) {
        throw new Error('Currying with excessive arguments!')
      }

      let index = 0
      for (var i = 0; i < new_params.length; i++) {
        if (!(new_params[i] instanceof ftl.NamedExprFn)) continue

        if (index == call_args[n].size) {
          break
        }

        let param = new_params[i]
        let arg = call_args[n].getFnAt(index)
       
        // named arg
        // excluding simple RefFn wrapped as NamedExprFn which share the smae name
        if (arg instanceof ftl.NamedExprFn && (!(arg.wrapped instanceof ftl.RefFn) || arg.wrapped.name != arg.name)) {
          named_args.add(param.name)
          if (arg.name == param.name) {
            new_params[i] = arg
          }
          else if (positional_args.has(arg.name)) {
            throw new FtlBuildError(`${name} is already taken as positional argument!`)
          } 
          else {
            unproced_named_args.set(arg.name, arg)
            let existing_named = unproced_named_args.get(param.name)
            if (existing_named) {
              new_params[i] = existing_named
              unproced_named_args.delete(param.name)
            }
          }
        }

        // non-named /positional arg
        else {
          if (named_args.size > 0) {
            throw new FtlBuildError(`positional argument after named argument!`)
          }
          positional_args.add(new_params[i].name)
          new_params[i] = arg
        }
        index++
      }
    }

    if (unproced_named_args.size > 0) {
      for (var i = 0; i < new_params.length; i++) {
        let param = new_params[i]
        if (param instanceof ftl.NamedExprFn && param.wrapped instanceof ftl.TupleSelectorFn) {
          let existing_named = unproced_named_args.get(param.name)
          if (existing_named) {
            new_params[i] = existing_named
            unproced_named_args.delete(param.name)
            if (unproced_named_args.size == 0) break
          }
        }
      }

      if (unproced_named_args.size > 0) throw new FtlBuildError(`Some names do not match parameter names`)
    }
  }

  // recursive function call with function not resolved yet
  // assume the calling is correct
  // TODO passing parameters to check
  else if (f instanceof ftl.FunctionHolder) {
    new_params = call_args
  }
  else {
    // function is passing from prev
    let f_def = prev.getNamedFn(name).wrapped
    if (f_def instanceof ftl.FunctionInterfaceFn && call_args.length < f_def.paramSize) {
      throw new Error(`Reference for ${name} is not a fucntional interface!`)
    }
    if (call_args.length < f_def.params.length) {
      throw new Error(`Parameter counts for ${name} is less than expected!`)
    }
    new_params = call_args
  }

  // re-sequence unresolved parameters
  let newSeq = 0
  for (var i = 0; i < new_params.length; i++) {
    let param = new_params[i]
    if (param instanceof ftl.NamedExprFn && param.wrapped instanceof ftl.TupleSelectorFn) {
      if (param.wrapped instanceof ftl.SeqSelectorOrDefault) {
        new_params[i] = new ftl.NamedExprFn(param.name, new ftl.SeqSelectorOrDefault(newSeq++, new ftl.ConstFn(param.wrapped.defaultValue)))
      } else {
        new_params[i] = new ftl.NamedExprFn(param.name, new ftl.TupleSelectorFn(newSeq++))
      }
    }
  }

  return new ftl.CallExprFn(name, f, [new ftl.TupleFn(... new_params)])
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
  let index = typeof details.index == 'string' ? parseInt(details.index) : buildElement(details.index, module)
  if (index instanceof ftl.ArrayInitializerFn) {

    // TODO allow ArrayElementSelectorFn takes multiple values
    if (index.size != 1) {
      throw new Error('ArrayElementSelectorFn not supporting multiple values yet!')
    }

    let index_info = index.first
    if (index_info instanceof ftl.ArrayInitializerWithRangeFn) {
      return new ftl.ArrayRangeSelectorFn(name, index_info.startValue.apply(), index_info.endValue.apply(), index_info.interval.apply())
    }
    return new ftl.ArrayElementSelectorFn(name, index_info)
  }
  return new ftl.ArrayElementSelectorFn(name, index)
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
    } else if (elm instanceof ftl.FunctionInterfaceFn) {
      elm.seq = i
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

function buildExpressionCurry(details:any, module:any, prev?:any) {
  let expr = buildElement(details.expr, module, prev)
  let params_list = buildElement(details.list, module)

  params_list.forEach((params:ftl.TupleFn) => {
    if (params.size == 0) {
      throw new FtlBuildError('At least one argument for expression currying has to be provided!')
    }

    if (params.filter(param => param instanceof ftl.NamedExprFn).length != params.size) {
      throw new FtlBuildError('All arguments for expression currying have to be named!')
    }
  })

  return new ftl.CurryExprFn(expr, params_list)
}

// builds function parameter
function build_function_parameters(params:ftl.TupleFn) {
  let fns = params.map((p:any, i:number) => {
    if (p instanceof ftl.RefFn) {
      return new ftl.NamedExprFn(p.name, new ftl.TupleSelectorFn(i))
    }
    else if (p instanceof ftl.NamedExprFn) {
      return new ftl.NamedExprFn(p.name, p.wrapped instanceof ftl.RefFn
        ? new ftl.TupleSelectorFn(i)
        : new ftl.SeqSelectorOrDefault(i, p.wrapped))
    }
    else if (p instanceof ftl.FunctionInterfaceFn)
      return new ftl.NamedExprFn(p.name, p)
    else
      return p
  })

  var has_default = false
  fns.forEach((p:ftl.NamedExprFn, i:number) => {
    if (p.wrapped instanceof ftl.SeqSelectorOrDefault) {
      has_default = true
    } else if (has_default) {
      throw new FtlBuildError(`Parameter ${p.name} is after a parameter with default value!`)
    }
  })

  return new ftl.TupleFn(... fns)
}

function validate_tuple_elements(elms:any[]) {

}

//function addbuilder<D extends FtlBuilder>(builder:new(props?:any) => D) {
//  buildElements[builder.name] = builder
//}


// this is for building function / operator parameters
var dummy_param_tuple = new ftl.TupleFn()

  // The following functions are used for parsing

function join(value:any) {
  return Array.isArray(value) ? value.join("") : value
}

function optionalList(value:any) {
  if (value == null)
    throw new Error('catching null')
  return value || []
}

class FtlBuildError extends Error {
  constructor(message:string) {
    super(message)
  }
}

class PrefixOperatorNotFoundError extends FtlBuildError {
  op:string
  operand:any
  constructor(message:string, op:string, operand:any) {
    super(message)
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
