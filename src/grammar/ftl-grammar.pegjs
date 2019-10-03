/**
 * ftl grammar
 *
 * This grammar is in form of peg, specifically parsable by pegjs (https://pegjs.org)
 *
 * Content in this file is for validating grammar using pegjs online (https://pegjs.org/online)
 *
 * Jian Li
 */

{

class FtlBuilder {
  constructor(props) {
    Object.defineProperty(this, '_', { enumerable: true, value: this.constructor.name})
    for (let key in props) {
      Object.defineProperty(this, key, { enumerable: true, value: props[key]})
    }
    console.log(`trying ${this._} with ${JSON.stringify(this)}`)
  }
}

var ftl_builder = {
  ConstBuilder: class extends FtlBuilder {
    constructor(val) {
      super({val: val});
    }
  },

  RefBuilder: class extends FtlBuilder {
    constructor(name) {
      super({name: name});
    }
  },

  TupleBuilder: class extends FtlBuilder {
    constructor(elms) {
      super({elms: elms})
    }
  },

  PipeBuilder: class extends FtlBuilder {
    constructor(... elements) {
      super({elements: elements});
    }
  },

  ExprCurryBuilder: class extends FtlBuilder {
    constructor(f, ... paramtuples) {
      super({f: f, paramtuples: paramtuples});
    }
  },

  ParameterList: class extends  FtlBuilder {
    constructor(... params) {
      super({params: params});
    }
  },

  ParamTupleBuilder: class extends FtlBuilder {
    constructor(... params) {
      super({params: params});
    }
  },

  TupleElementBuilder: class extends FtlBuilder {
    constructor(id, expr) {
      super({id: id, expr: expr})
    }
  },

  FunctionBuilder: class extends FtlBuilder {
    constructor(id, params, body) {
      super({id: id, params: params, body: body})
    }

    build() {

    }
  },

  Expression: class extends FtlBuilder {
    constructor(first, rest1) {
      super({first: first, rest1: rest1})
    }
  },

  OperandExpression: class extends FtlBuilder {
    constructor(operand) {
      super({operand: operand})
    }
  },

  UnaryOperatorExpression : class extends FtlBuilder {
    constructor(op, expr) {
      super({expr: expr, op: op})
    }
  },

  PostfixOperatorExpression : class extends FtlBuilder {
    constructor(expr, op) {
      super({ expr: expr, op: op});
    }
  },

  N_aryOperatorExpression: class extends FtlBuilder {
    constructor(ops, operands) {
      super({ops: ops, operands: operands})
    }
  },

  OperatorExpression: class extends FtlBuilder {
    constructor(unit) {
      super({unit: unit});
    }
  },

  CallExprBuilder: class extends FtlBuilder {
    constructor(name, params) {
      super({name: name, params: params});
    }
  },

  FunctionInterfaceBuilder: class extends FtlBuilder {
    constructor(name, params) {
      super({name: name, params: params});
    }
  },

  ArrayElementSelectorBuilder: class extends FtlBuilder {
    constructor(id, index) {
      super({id: id, index: index});
    }
  }
}

let ftl = {
  Module: class {
    addExecutable(exec) {
      console.log(`Module.addExecutable(${exec})`)
    }

    getAvailableFn(name) {
      return undefined;
    }
  }
}

var module = new ftl.Module('')

function join(value) {
  if (Array.isArray(value))
    return value.join("")
  return value
}

function extractOptional(optional, index) {
  return optional ? optional[index] : null;
}

function extractList(list, index) {
  var result = new Array(list.length);

  for (var i = 0; i < list.length; i++) {
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
  = ___ ModuleDeclaration? ___ program:Declarations? ___ {

    //# Start

    return program;
  } 

ModuleDeclaration
  = ModuleToken _ module_name: (ModulePath NamespaceIdentifier { return text() }) {

    //# ModuleDeclaration

    module.name = module_name;
  } 

ModulePath
  =  (NamespaceIdentifier ("." / "/"))* {

    //# ModulePath

    return text();
  }

ImportModulePath
  = ((".")+ "/")* ModulePath {

    //# ImportModulePath

    return text();
  }

// all allowed declarations
Declarations
  = first:Declaration rest:(__ Declaration)* {

    //# Declarations

    return buildList(first, rest, 1);
  }

Declaration
  = ImportDeclaration / VariableDeclaration / FunctionDeclaration / Executable

ImportDeclaration
  = ImportToken _ importItems:ImportMultiItems {

    //# ImportDeclaration

    try {
      module.importStatement(scriptPath, importItems)
    } catch (e) {
      if (e instanceof ftl.ModuleNotLoadedError) {
        let m = peg$parse(e.moduleName, rootPath, module, options)
        m.name = e.moduleName
        ftl.addModule(m)
        module.importStatement(scriptPath, importItems)
      }
      else
        throw e
    }
  }

ImportSingleItem
  = name: (ImportModulePath (Identifier / Operator (" " Operator)*) { return text() }) as:(_ "as" _ (Identifier / Operator))? {

    //# ImportSingleItem

    return {
      type: "single",
      name: name,
      asName: extractOptional(as, 3)
    };
  }

ImportMultiItems
  = first:ImportItem rest:(_ "," _ ImportItem)* {

    //# ImportMultiItems

    var ret = extractList(rest, 3);
    ret.unshift(first);
    return ret;
  }

ImportList
  = path:(ImportModulePath NamespaceIdentifier { return text() }) _ "[" _ list:ImportMultiItems? _ "]" {

    //# ImportList

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

    //# VariableDeclaration
    var ret = modifier =='const' ? new ftl.ImmutableValFn(id.name, expr) : new ftl.VarFn(id.name, expr)
    module.addFn(ret); 
    return ret
  }

// Function declaration
// A function can be n-ary operator as well
FunctionDeclaration =
  FunctionToken _ id:(OperatorDeclaration / Identifier / Operator) _ params:Tuple? _ body:FunctionBody {

    //# FunctionDeclaration

    return new ftl_builder.FunctionBuilder(id, params, body)
  }

Tuple =
  "(" _ elms:ParameterList? _ ")" {

    //# Tuple

    return elms == null ? new ftl_builder.TupleBuilder() : new ftl_builder.TupleBuilder(elms)
  }

ExpressionCurry
  = expr:Tuple params:(_ Tuple)+ {

    //# ExpressionCurry

    return new ftl_builder.ExprCurryBuilder(expr, ... extractList(params, 1))
  }

ParameterList
  = first:Parameter rest:(_ "," _ Parameter)* {

    //# ParameterList
    return new ftl_builder.ParameterList(buildList(first, rest, 3))
  }

Parameter
  = id:(Identifier _ ":")? _ expr:MapExpression {

    //# Parameter

    return new ftl_builder.TupleElementBuilder(extractOptional(id, 0), expr)
  }

FunctionBody
  = NativeBlock
  / ArrowExpression+

MapOperand =
  annotation:(Annotation _ )* ex:(OperatorExpression / PrimaryExpression)

ArrowExpression
  = "->" _ ex:MapOperand  {

    //# PipeExpression
    console.log('ex', ex)
    return ex
  }

MapExpression =
  first:(MapOperand) rest:(_ ArrowExpression)* {

    //# Expression
    console.log('MapExpression')
    return new ftl_builder.Expression(first, extractList(rest, 1))
  }

Executable
  = expr:MapExpression {

      return expr;
    }

// Annotation is such expression that it takes input to underneath expression
// and does any side effect to it, such as writing it into log, etc., and does
// not return anything, or the return is simply ignored.
//
// In other words, there is no way for an annotation to affect the fucntionality
// of underneath expression.
Annotation =
  '@' annotation:(CallExpression / Identifier) {
    console.log('in annotation')
    return annotation
  }

PrimaryExpression
  = Literal
  / ArrayElementSelector
  / CallExpression
  / MemberExpression
  / Identifier
  / ArrayLiteral
  / ExpressionCurry
  / Tuple
  / TupleSelector
  / UnaryOperatorExpression

Operator
  = !"//" !"->" first:OperatorSymbol rest:OperatorSymbol* {

    //# Operator

    return text();
  }

OperandValueDeclaration
  = id:Identifier {

    //# OperandValueDeclaration

    return id;
  }

OperandFunctionDeclaration
  = id:Identifier params:Tuple {

    // #OperandFunctionDeclaration
    return new ftl_builder.FunctionInterfaceBuilder(id.name, new ftl_builder.ParamTupleBuilder(params))
  }

OperandDeclaration
 = OperandFunctionDeclaration
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

    //# PreInfixOperatorDeclaration

    var ops = extractList(rest, 1);
    var name = ops.length == 1 ? ops[0] : ops.join(' ');
    var operands = [first].concat(extractList(rest, 3))
    return {
      type: 'OperatorDeclaration',
      name: name,
      operands: new ftl_builder.TupleBuilder(... operands)
    }
  }

PostfixOperatorDeclaration
  = operand:OperandDeclaration _ op:Operator {

    //# PostfixOperatorDeclaration

    return {
      type: 'PostfixOperatorDeclaration',
      name: op,
      operands: operand
    }
  }

OperatorExpression
  = unit: (N_aryOperatorExpression / PostfixOperatorExpression) {
    return new ftl_builder.OperatorExpression(unit)
  }

// unary prefix operator expression
// It is expected that result of unary operator generates single element, not a tuple.
UnaryOperatorExpression
  = op:Operator _ expr:PrimaryExpression {

    //# UnaryOperatorExpression

    return new ftl_builder.UnaryOperatorExpression(op, expr)
  }

// postfix operator
// It is expected that result of postfix operator generates single element, not a tuple.
PostfixOperatorExpression
  = expr:PrimaryExpression _ op:Operator {

    //# PostfixOperatorExpression

    return new ftl_builder.PostfixOperatorExpression(expr, op)
  }

N_aryOperandExpression =
  operand:(PrimaryExpression / "(" _ PostfixOperatorExpression _ ")")
  {
    // OperandExpression
    return new ftl_builder.OperandExpression(operand)
  }

// N-ary operator expression supports any number of n operands and n - 1 operators, binary, ternary, etc.
//
// Any operand as expression with postfix operator has to be wrapped with parantheses,
// except when it apprear as last element. Otherwise there is no way to distinguish
// whether an intermediate operator is a postfix one or n-ary one.
N_aryOperatorExpression =
  first:N_aryOperandExpression rest:(_ Operator _ N_aryOperandExpression)+ last: (_ Operator)?
  {
    // N_aryOperatorExpression
    var ops = extractList(rest, 1);
    var params = [first].concat(extractList(rest, 3));
    if (last) {
      let post_op = extractOptional(last, 1)
      params[params.length - 1] = new ftl_builder.PostfixOperatorExpression(params[params.length - 1], post_op)
    }
    return new ftl_builder.N_aryOperatorExpression(ops, params)      
  }

TupleSelector
  = "_" ("0" / (NonZeroDigit DecimalDigit* !IdentifierStart)) {

    //# TupleSelector

    return new ftl.TupleSelectorFn(text().substring(1));
  }

ArrayElementSelector
  = id: Identifier _ "[" index:("0" / (NonZeroDigit DecimalDigit* {return text()}) / Identifier) _ "]" {

    //# ArrayElementSelector
    return new ftl_builder.ArrayElementSelectorBuilder(id, index)
  }

Literal
  = NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

ArrayLiteral
  = "[" elms:(_ LiteralList)? _ "]" {

    //# ArrayLiteral

    var lst = extractOptional(elms, 1);
    return lst == null ? new ftl_builder.ConstBuilder([]) : lst
  }

LiteralList
  = first:PrimaryExpression rest:(_ "," _ PrimaryExpression)* {

    //# LiteralList

    return new ftl_builder.ConstBuilder(buildList(first, rest, 3))
  }

// expression for getting member of variable
MemberExpression
  = Identifier _ "[" _ ( ParameterList)+ _ "]"

CallExpression
  = id: Identifier params:(_ Tuple)+ {

    //# CallExpression

    var extracted_params = extractList(params, 1);

    // lambda declaration
    if (id.name == '$') {
      if (extracted_params.length > 1)
        throw new Error("FTL0001: lambda's arguments followed by calling arguments!");
      return new ftl_builder.ParamTupleBuilder(... extracted_params[0])
    }

    return new ftl_builder.CallExprBuilder(id.name, extracted_params)
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

    //# Identifier
    return new ftl_builder.RefBuilder(name)
  }

IdentifierName "identifier"
  = first:IdentifierStart rest:IdentifierPart* {

    //# IdentifierName

    return first + rest.join("");
  }

IdentifierStart
  = AsciiLetter
  / "$"
  / "_"

/// non-start of identifier
IdentifierPart
  = IdentifierStart
  / DecimalDigit

NamespaceIdentifier
  = LowerLetter (LowerLetter / "_")* {

    //# NamespaceIdentifier
    return text();
  }

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
  = TrueToken {

    //# TrueToken
    return new ftl_builder.ConstBuilder(true)
  }
  / FalseToken {

    //# FalseToken
    return new ftl_builder.ConstBuilder(false)
  }

NumericLiteral
  = literal:HexIntegerLiteral !(IdentifierStart / DecimalDigit)
  / literal:DecimalLiteral !(IdentifierStart / DecimalDigit) {

    //# NumericLiteral
    return literal
  }

DecimalLiteral
  = DecimalIntegerLiteral "." DecimalDigit* ExponentPart?
  / [-]? "." DecimalDigit+ ExponentPart?
  / DecimalIntegerLiteral ExponentPart? {

    // DecimalLiteral
    return new ftl_builder.ConstBuilder(parseFloat(text()))
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
  = '"' chars:DoubleStringCharacter* '"'
  / "'" chars:SingleStringCharacter* "'" {

    //# StringLiteral
    var str = text();
    return new ftl_builder.ConstBuilder(str.substr(1, str.length - 2))
  }

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
