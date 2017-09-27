/**
 * ftl grammar
 *
 * This grammar is in form of peg, specifically parsable by pegjs (https://pegjs.org)
 *
 * Jian Li
 */

{
  var functions = {};

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

  function getValueString(value) {
    if (Array.isArray(value))
      return '[' + value.toString() + ']'
    else
      return value.toString()
  }

  function function_ref(arg) {
    return this.apply(arg);
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

      var iterator = list.entries();
      for (let e of iterator)
        t.addValue(e)

      return t;
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

    get(key) {
//      if (key.startsWith('_')) {
//        var ind = parseInt(key.substring(1))
//        return ind < this._list.length ? this._list[ind] : null
//      }
      var ret = this._map.get(key);
      if (ret)
        return ret
      else if (key == '_' && this._size == 1)
        return this._map.get('_0');
      else
        return null;
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

  class Fn {
    apply(input) {
      return null;
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
      if (functions[name] != null)
        throw { message: "'" + name + "' exists and can not be declared again for var/const!"}
      functions[name] = this; 
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
  class NamedExpressionFn {
    constructor(id, expr) {
      this.id = id;
      this.expr = expr;
    }

    get id() {
        return this.id;
    }

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
      this._params = params instanceof TupleFn ? ins.list : [ins];
      param_list = this.extractParams(this._params);

      for (var i = 0; i < ins.length; i++) {
        param_list.push('_' + (i + 1));
      }
      console.log("parameter list:", param_list) 
      console.log("script:", script) 
      
      this.internal = eval("(function(" + param_list.join(',') + ")" + script + ")");
      this._param_list = param_list
    }

    // extracts parameter names
    // @params array of parameter list
    extractParams(params) {
      var param_list = [];
      if (params == null)
        return param_list;
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        if (param instanceof RefFn)
          param_list.push(param.name);
        else
          param_list.push(param.id);
      }
      return param_list;
    }

    get name() {return this._name}

    /**
     * Parameters in list
     */
    get params() { return this._params; }

    apply(input) {
      console.log("tuple to native function: ", input)
      if (this._param_list.length == 1 && this._param_list[0] == 'varargs')
        var res = this.internal.apply(null, [input])
      else
      	var res = this.internal.apply(null, (input instanceof Tuple)? input.toList() : [input]);

   	  console.log("output of native function: ", res)
      return res
    }
  }

  /**
   * Function function.
   */  
  class FunctionFn {
    constructor(name, params, expr) {
      this._name = name;
      this.expr = expr;
      var ins = params.in;
      console.log("in:", params.in)
      console.log("out:", params.out)
      var param_list = [];
      for (var i = 0; i < ins.length; i++) {
        param_list.push(ins[i].id);
      }
      for (var i = 0; i < ins.length; i++) {
        param_list.push('_' + (i + 1));
      }
      console.log("parameter list:", param_list) 
      console.log("expr:", expr) 
    }

    get name() {return this._name}

    apply(input) {
      return this.expr.apply(null, input);
    }
  }

  /**
   * Tuple function.
   */
  class TupleFn extends Fn {
    constructor(tp) {
      super()
      this.tp = tp;
      console.log("arg to TupleFn constructor", tp)
      this._type="TupleFn"
    }

    static createTupleFn(elms) {
      if (elms.length == 1 && elms[0] instanceof Fn)
        return elms[0];
      return new TupleFn(elms);
    }

    get list() {
      return this.tp;
    }

    apply(input) {
      var tuple = new Tuple()
      if (this.tp == null)
        return tuple
      for (var i = 0; i < this.tp.length; i++) {
        var tpl = this.tp[i];
        console.log("tuple type: ", tpl)
        if (tpl instanceof ConstFn || tpl instanceof CompositionFn)
          tuple.addValue(tpl.apply(input)); 
        else if (tpl instanceof ExprFn) {
          var res = tpl.apply(input);
          tuple.addKeyValue(tpl.id, res);
        }

        else {
          var res = tpl.apply(input);
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
  class ExprFn {
    constructor(id, elm) {
      this.id = id;
      this.elm = elm;
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

    get elements() {
      return this.funs;
    }

    apply(tuple) {
      console.log("composition input:", tuple);
      var res = this.funs[0].apply(tuple);
      console.log("result of first item:", res);

      for (var i = 1; i < this.funs.length; i++) {
        res = this.funs[i].apply(res)
        if (res)
          console.log("result of item " + i + ":", res);
      }

      return res;
    }
  }

  /**
   * Reference function.
   */
  class RefFn extends Fn {
    constructor(name) {
      super()
      this._type = "RefFn"
      this._name = name;
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

    isValueType() {
      return this._refType == 'value'
    }

    isRefType() {
      return this._refType == 'ref'
    }
    
    apply(input) {
      console.log("calculating ref for '" + this._name)
      console.log("input to RefFn:" + input)
      var e = null;

      // find name from scoped tuple first
      if (input && input instanceof Tuple)
        e = input.get(this._name);

      if (e)
      	return e;

      // must be a function
      e = functions[this._name];
      if (e) {
        console.log("actual f ", e)
        console.log("tuple to " + this._name, input)
        var res = e.apply(input);
        console.log("result of RefFn: ", res)
        return res;
      }
      else if (this._name == '_' && input && !(input instanceof Tuple))
        return input;
      else
        throw { message: "no ref for '" + this._name + "' found as identifier or function!" }
    }
  }

  /**
   * This is a functional tuple reference, which returns a function.
   */
  class ExprRefFn extends Fn {
    constructor(fn) {
      super()
      this._type = "ExprRefFn"
      this._fn = fn;
    }

    apply(input) {
      return function_ref.bind(this._fn);
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
}


// start
Start
  = ___ program:Declarations? ___ { return program } 

// all allowed declarations
Declarations
  = first:Declaration rest:(__ Declaration)* {
    return buildList(first, rest, 1)
  } 

Declaration
  = VariableDeclaration / FunctionDeclaration / Executable

// Variable or constant declaration at module level, which can be referenced in any functions within the same module.
VariableDeclaration
  = modifier:(ConstToken / VarToken) _ id:Identifier _ "=" _ expr:PrimaryExpression {
    return modifier=='const' ? new ImmutableValFn(id.name, expr) : new VarFn(id.name, expr)
  }

// Function declaration
// A function can be n-ary operator as well
FunctionDeclaration
  = FunctionToken _ id:(OperatorDeclaration / Identifier / Operator) _ params:Tuple? _ body:FunctionBody {
    console.log('function id: ', id.name)
    console.log('expr: ', body)

    var is_operator = id.type == 'OperatorDeclaration';
    if (is_operator)
    	console.log('parameter list from operator: ', id.operands)
  	console.log('parameter list from function: ', optionalList(params))

    var param_list = is_operator ? id.operands : optionalList(params);
    console.log('parameter list: ', param_list)
    var name = id.name
    var ret = body.script ? new NativeFunctionFn(name, param_list, body.script) :
        new FunctionFn(name, param_list, body);

    functions[name] = ret;
    return ret;
  }

Tuple = "(" _ elms:ParameterList? ")" { return TupleFn.createTupleFn(elms) }

ParameterList
  = first:Parameter rest:(_ "," _ Parameter)* {
    console.log("first", first);console.log("rest", rest);
    console.log("param list:", buildList(first, rest, 3));
    return buildList(first, rest, 3) }

Parameter
  = id:(Identifier _ ":")? _ expr:Expression {
      var iid = extractOptional(id, 0);
      if (iid != null)
        iid = iid.name;
      if (iid == null)
        return expr;
      return new ExprFn(iid, expr)
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
    
    return CompositionFn.createCompositionFn(first, t);
  }

Executable
  = expr:Expression {
      var res = expr.apply()
      if (res)
        console.log('executable result: ', expr.apply())
      return expr
    }

PrimaryExpression
  = CallExpression
  / MemberExpression
  / Identifier
  / Literal
  / ArrayLiteral
  / Tuple
  / TupleSelector
  / ArrayElementSelector

Operator
  = !"->" first:OperatorSymbol rest:OperatorSymbol* { return text() }

OperandValueDeclaration
  = "$" id:Identifier { id.setAsValueType(); return id }

OperandReferenceDeclaration
  = "&" id:Identifier { id.setAsRefType(); return id }

OperandDeclaration
 = OperandValueDeclaration
 / OperandReferenceDeclaration

/**
 * Operator declaration with form of:
 *   operand (op operand)+
 * @return type:'OperatorDeclaration', id, operands
 */
OperatorDeclaration
  = first:OperandDeclaration rest:(_ Operator _ OperandDeclaration)+ {
      var ops = extractList(rest, 1);
      var name = ops.length == 1 ? ops[0] : ops.join(' ');
      console.log("operators in operator declaration:", ops)
      var operands = [first].concat(extractList(rest, 3))
      console.log("operands in operator declaration:", operands)
      return {
        type: 'OperatorDeclaration',
        name: name,
        operands: TupleFn.createTupleFn(operands)
      }
    }

OperatorExpression
  = UnaryOperatorExpression
  / N_aryOperatorExpression

// unary prefix operator expression 
UnaryOperatorExpression
  = op:Operator _ expr:PrimaryExpression {
      console.log('op', op)
      console.log('expr', expr)
      return CompositionFn.createCompositionFn(expr, functions[op.name]);
    }

// conditional ternary expression
N_aryOperatorExpression
  = operand:PrimaryExpression rest: (_ Operator _ PrimaryExpression)+ {
  
      var current_index = 0;
      var stop_index = 0;
      var lookupoperators = function(ops, operands, index, full) {
        var op = index == 1 ? ops[0] : ops.slice(0, index).join(' ')
   	    var f = functions[op];

        // no corresponding function found for single op
  	    if (!f) {
  	      if (index == 1)
  	        throw new Error("No function with name '" + op + "' found!");

          index--;
          var reduced = lookupoperators(ops, operands, index, false);
          
          if (current_index == stop_index)
            return reduced;

          ops = ops.slice(index, ops.length)
          operands = [reduced].concat(operands.slice(index + 1, operands.length))
          return lookupoperators(ops, operands, ops.length, true)
  	    }

  	    for (var i = 0; i < f.params.length; i++) {
  	      if (f.params[i] instanceof RefFn && f.params[i].isRefType()) {
  	        operands[i] = new ExprRefFn(params[i]);
  	      }
        }

        current_index += index;
        return CompositionFn.createCompositionFn(TupleFn.createTupleFn(operands.slice(0, f.params.length)), f);
      }

  	  var ops = extractList(rest, 1);
  	  var params = [operand].concat(extractList(rest, 3));
  	  if (ops.length == 0)
  	    throw new Error('No ops found!')
      console.log('ops:', ops)
  	  console.log('operands', params)
  	  stop_index = ops.length;
  	  return lookupoperators(ops, params, ops.length, true);
  }

TupleSelector
  = "_" ("0" / (NonZeroDigit DecimalDigit* !IdentifierStart)) { return new RefFn(text()) }

ArrayElementSelector
  = "[" ("0" / (NonZeroDigit DecimalDigit* !IdentifierStart)) + "]" { return new RefFn(text()) }

Literal
  = NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

ArrayLiteral
  = "[" elms:(_ LiteralList)? "]" {
    var lst = extractOptional(elms, 1);
    return lst == null ? new ConstFn([]) : lst
  }

LiteralList
  = first:PrimaryExpression rest:(_ "," _ PrimaryExpression)* {
    var elms = buildList(first, rest, 3);
    var ret = [];
    for (var i = 0; i < elms.length; i++)
      ret.push(elms[i].value);
    return new ConstFn(ret)
  }

// expression for getting member of variable
MemberExpression
  = Identifier _ "[" _ ( ParameterList)+ _ "]"

CallExpression
  = Identifier _ "(" _ ( ParameterList)+ _ ")"

// Native javascript block wrapped with "{" and "}"
NativeBlock
  = "{" _ ((!("{" / "}") SourceCharacter)* {return text()})
    NativeBlock* _
    ((!("{" / "}") SourceCharacter)* {return text()}) "}"
    {return {type:'native', script: text()}}

SourceCharacter
  = .

Identifier
  = !ReservedWord name:IdentifierName {return new RefFn(name)}

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

// Tokens
FalseToken      = "false"
FunctionToken   = "fn"
NullToken       = "null"
TrueToken       = "true" !IdentifierStart
VarToken        = "var" !IdentifierStart
ConstToken      = "const"

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
  = [!%&*+\-/:<=>?^|\u00D7\u00F7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283]

ReservedWord
  = Keyword
  / NullLiteral
  / BooleanLiteral

Keyword
  = VarToken
  / ConstToken
  / FunctionToken

NullLiteral
  = NullToken

BooleanLiteral
  = TrueToken { return new ConstFn(true) }
  / FalseToken { return new ConstFn(false) }

NumericLiteral
  = literal:HexIntegerLiteral !(IdentifierStart / DecimalDigit)
  / literal:DecimalLiteral !(IdentifierStart / DecimalDigit) { return literal }

DecimalLiteral
  = DecimalIntegerLiteral "." DecimalDigit* ExponentPart? {
      return new ConstFn(parseFloat(text()));
    }
  / [-]? "." DecimalDigit+ ExponentPart? {
      return new ConstFn(parseFloat(text()));
    }
  / DecimalIntegerLiteral ExponentPart? {
      return new ConstFn(parseFloat(text()));
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
  = '"' chars:DoubleStringCharacter* '"' { return new ConstFn(text()) }
  / "'" chars:SingleStringCharacter* "'" { return new ConstFn(text()) }

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