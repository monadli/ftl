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
      return this._map.get(key)
    }

    toList() {
      return this._list
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
          last = value
        } else {
          if (Array.isArray(value))
            buf.push(key + ':[' + value.toString() + ']')
          else
            buf.push(key + ':' + value)

          i++
          last = null
        }
        if (i == this._size)
          break
      }
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
        throw name + " exists and can not be used for var/const!"
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
      var ins = params;
      var param_list = [];
      if (params instanceof TupleFn) {
        param_list = this.extractParams(ins.list);
      } else {
        param_list = this.extractParams(ins);
      }
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

    apply(input) {
      console.log("tuple to native function: ", input)
      if (this._param_list.length == 1 && this._param_list[0] == 'varargs')
        var res = this.internal.apply(null, [input])
      else
      	var res = this.internal.apply(null, (input instanceof Tuple)? input.toList() : [input]);

      if (res) {
      	console.log("output of native function: ", res)
        if (Array.isArray(res))
          return Tuple.fromList(res)
        else {
       	  console.log("no output from native function")
          return Tuple.fromValue(res)
        }
      }
      else
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

    get list() {
      return this.tp;
    }

    apply(input, provided_names) {
      var tuple = new Tuple()
      for (var i = 0; i < this.tp.length; i++) {
        var tpl = this.tp[i];
        console.log("tuple type: ", tpl)
        if (tpl instanceof ConstFn || tpl instanceof CompositionFn)
          tuple.addValue(tpl.apply(input, provided_names)); 
        else if (tpl instanceof ExprFn) {
          var res = tpl.apply(input);
          tuple.addKeyValue(tpl.id, res);
        }

        else if (tpl instanceof RefFn) {
          var res = null;
          var name = tpl.name;
          console.log('name:', res)

          // to do: get ref from input tuple
          if (provided_names != null && provided_names[name] != null) {
            res = provided_names[name];
          }
          else if (functions[name] != null)
            res = functions[name].apply(input);
          console.log('res:', res)
          tuple.addValue(res);
        }
      }
      return tuple
      console.log("provided_names", provided_names)
      var tuple = [];
      var names = {};
      for (var i = 0; i < this.tp.length; i++) {
        var tpl = this.tp[i];
        console.log("tuple type: ", tpl)
        if (tpl instanceof ConstFn || tpl instanceof CompositionFn)
          tuple.push(tpl.apply(input, provided_names)); 
        else if (tpl instanceof ExprFn) {
          var res = tpl.apply(input);
          tuple.push(res);
          var id = tpl.id;
          if (id != null)
          	names[tpl.id] = res;
        }

        else if (tpl instanceof RefFn) {
          var res = null;
          var name = tpl.name;
          console.log('name:', res)
          if (provided_names != null && provided_names[name] != null) {
            res = provided_names[name];
          }
          else if (functions[name] != null)
            res = functions[name].apply(input);
          console.log('res:', res)
          tuple.push(res);
        }
      }
      console.log("list", tuple); 
      console.log("map", names)
      return {type: "tuple", list: tuple, map: names}; 
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

    apply(input, provided_names) {
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
        console.log("result of RefFn: ", e.apply(input))
        return e.apply(input);
      }
      else
        throw "no ref for '" + this._name + "' found as identifier or function!"
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
          throw input + " does not match pattern";
        }
        return this.internal.apply(null, match);
      }
    }
  }
}


// start
Start
  = __ program:Declarations? __ { return program } 

// all allowed declarations
Declarations
  = variables:(__ VariableDeclaration)* functions:(__ FunctionDeclaration)* statements:(__ Executable)* {
      return {variables: extractList(variables, 1), functions:extractList(functions, 1), statements: extractList(statements, 1)}
    }

// Variable or constant declaration at module level, which can be referenced in any functions within the same module.
VariableDeclaration
  = modifier:(ConstToken / VarToken) __ id:Identifier __ "=" __ expr:PrimaryExpression {
    return modifier=='const' ? new ImmutableValFn(id.name, expr) : new VarFn(id.name, expr)
  }

// Function declaration
FunctionDeclaration
  = __ FunctionToken __ id:(Identifier / Operator) __ params:Tuple __ body:FunctionBody {
    console.log('function id: ', id.name)
    console.log('expr: ', body)
    if (body.script) {
      var ret = new NativeFunctionFn(id.name, optionalList(params), body.script);
      functions[id.name] = ret;
      console.log("functions: ", functions)
      return ret;
    } else {
      var ret = new FunctionFn(id.name, optionalList(params), body);
      functions[id.name] = ret;
      return ret;
    }
  }

Tuple = "(" __ elms:ParameterList? ")" {return new TupleFn(elms)}

ParameterList
  = first:Parameter rest:(__ "," __ Parameter)* {return buildList(first, rest, 3)}

Parameter
  = id:(Identifier __ ":")? __ expr:Expression {
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
  = "->" __ ex:Expression __ { return ex }

Expression
  = first:(PrimaryExpression / OperatorExpression) rest:(__ PipeExpression)? {
    var t = extractOptional(rest, 1);
    if (rest)
      console.log("rest is ", t)
    if (t == null)
      return first;
    
    if (t instanceof CompositionFn) {
      [first].concat(t.elements)
      return new CompositionFn([first].concat(t.elements));
    }

    return new CompositionFn([first, t]);
  }

Executable
  = __ expr:Expression {
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

Operator
  = __ !"->" first:OperatorSymbol rest:OperatorSymbol*

OperatorExpression
  = UnaryOperatorExpression
  / BinaryOperatorExpression
  / TernaryOperatorExpression

// unary prefix operator expression 
UnaryOperatorExpression
  = __ op:Operator __ expr:Expression 

// binary infix operator expression
BinaryOperatorExpression
  = __ preop:PrimaryExpression __ op:Operator postop:Expression 

// conditional ternary expression
TernaryOperatorExpression
  = __ "(" conditon:Expression ")" __ "?" __ then:Expression otherwise:(__ ":" __ Expression)?

TupleSelector
  = __ "_" ("0" / (NonZeroDigit DecimalDigit* !IdentifierStart))

Literal
  = NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

ArrayLiteral
  = __ "[" elms:(__ LiteralList)? "]" {
    var lst = extractOptional(elms, 1);
    return lst == null ? new ConstFn([]) : lst
  }

LiteralList
  = first:PrimaryExpression rest:(__ "," __ PrimaryExpression)* {
    var elms = buildList(first, rest, 3);
    var ret = [];
    for (var i = 0; i < elms.length; i++)
      ret.push(elms[i].value);
    return new ConstFn(ret)
  }

// expression for getting member of variable
MemberExpression
  = __ Identifier __ "[" __ ( ParameterList)+ __ "]"

CallExpression
  = __ Identifier __ "(" __ ( ParameterList)+ __ ")"

// Native javascript block wrapped with "{" and "}"
NativeBlock
  = "{" __ ((!("{" / "}") SourceCharacter)* {return text()})
    NativeBlock* __
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
  = [\u0021\u0025\u0026\u002A\u002B\u002D\u002F\u003A\u003C\u003D\u003E\u005E\u007C\u00D7\u00F7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283]

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

// white spaces
__
  = (WhiteSpace / EOL / Comment)*
