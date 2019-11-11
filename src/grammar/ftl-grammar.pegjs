/**
 * ftl grammar
 *
 * This grammar is in form of peg, parsable by pegjs (https://pegjs.org)
 *
 * Javascript in this file is for validating grammar using pegjs online (https://pegjs.org/online)
 *
 * Jian Li
 */

{

class BuildInfo {
    constructor(name, details) {
        this.name = name
        this.details = details
    }
}

function buildElement(name, buildInfo) {
  return new BuildInfo(name, buildInfo)
}

function buildApplication(app) {
  console.log('in buildApplication')
  if (!(app instanceof BuildInfo)) {
    return app
  }

  let ret = {}
  for (let [key, value] of Object.entries(app.details)) {
    if (Array.isArray(value)) {
      let arr = []
      for (let i = 0; i < value.length; i++) {
        let elm = {}
        let v = value[i]
        if (v instanceof BuildInfo) {
          elm[`_${i}:${v.name}`] = buildApplication(v)
        } else {
          elm[`_${i}`] = v
        }
        arr.push(elm)
      }
      ret[key] = arr
    }
    else if (value instanceof BuildInfo) {
      ret[`${key}:${value.name}`] = buildApplication(value)
    } else {
      ret[key] = value
    }
  }

  return ret
}

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
Start =
  ___ ModuleDeclaration? ___ application:Declarations? ___
  {
      return {application: buildApplication(application)}
  }

// Module declaration may be used in ftl content loaded not via importing from files,
// such as loaded via http where module structure is not present.
ModuleDeclaration =
  ModuleToken _ module_name:(ModulePath NamespaceIdentifier)
  {
    return buildElement('ModuleDeclaration', { name: module_name.text() })
  }

ModulePath =
  (NamespaceIdentifier ("." / "/"))*
  {
    return buildElement('ModulePath', text())
  }

ImportModulePath =
  ((".")+ "/")* ModulePath
  {
    return buildElement('ImportModulePath', { path: text() })
  }

// all allowed declarations
Declarations =
  first:Declaration rest:(__ Declaration)*
  {
    return buildElement('Declarations', {declarations: buildList(first, rest, 1)})
  }

Declaration =
  ImportDeclaration
  / VariableDeclaration
  / FunctionDeclaration
  / Executable

ImportDeclaration =
  ImportToken _ items:ImportMultiItems
  {
    return buildElement('ImportDeclaration', { items: items })
  }

ImportSingleItem =
  name:(ImportModulePath (Identifier / Operator (" " Operator)*)) as:(_ "as" _ (Identifier / Operator))?
  {
    return buildElement('ImportSingleItem', { name: name.text(), item: extractOptional(as, 3) })
  }

ImportMultiItems =
  first:ImportItem rest:(_ "," _ ImportItem)*
  {
    return buildElement('ImportMultiItems', { items: buildList(first, extractList(rest, 3)) })
  }

ImportList =
  path:(ImportModulePath NamespaceIdentifier { return text() }) _ "[" _ list:ImportMultiItems? _ "]"
  {
    return buildElement('ImportList', { path: path, list: list })
  }

ImportItem =
  ImportList
  / ImportSingleItem

// Variable or constant declaration at module level, which can be referenced in any functions within the same module or outside the module.
VariableDeclaration =
  modifier:(ConstToken / VarToken) _ id:Identifier _ "=" _ expr:PrimaryExpression
  {
    return buildElement('VariableDeclaration', { modifier: modifier, name: id, expr: expr })
  }

// Function declaration
// A function can be n-ary operator as well
FunctionDeclaration =
  FunctionToken _ id:(OperatorDeclaration / Identifier / Operator) _ params:Tuple? _ body:FunctionBody
  {
    return buildElement('FunctionDeclaration', {
      id: id,
      params: params,
      body: body}
    )
  }

Tuple =
  "(" _ elms:TupleElementList? _ ")"
  {
    return buildElement('Tuple', {elements: elms || []})
  }

ExpressionCurry =
  expr:Tuple params:(_ Tuple)+
  {
    return buildElement(
      'ExpressionCurry',
      {
        expr:expr,
        list: extractList(params, 1)
      }
    )
  }

TupleElementList =
  first:TupleElement rest:(_ "," _ TupleElement)*
  {
    return buildElement(
      'TupleElementList',
      { elements: buildList(first, rest, 3) }
    )
  }

TupleElement =
  id:(Identifier _ ":")? _ expr:MapExpression
  {
    return buildElement(
      'TupleElement',
      {
        name: extractOptional(id, 0),
        expr: expr
      }
    )
  }

FunctionBody =
  NativeBlock
  / ArrowExpression+

MapOperand =
  annotations:(Annotation _ )* expr:(OperatorExpression / PrimaryExpression)
  {
    return buildElement(
      'MapOperand',
      {
          annotations: extractList(annotations, 0),
          expr: expr
      }
    )
  }

ArrowExpression =
  "->" _ ex:MapOperand
  {

    //# PipeExpression
    console.log('ex', ex)
    return ex
  }

MapExpression =
  first:(MapOperand) rest:(_ ArrowExpression)*
  {
    return buildElement(
      'MapExpression',
      {
        elements: buildList(first, extractList(rest, 1))
      }
    )
  }

Executable =
  expr:MapExpression {

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

PrimaryExpression =
  Literal
  / ArrayElementSelector
  / CallExpression
  / MemberExpression
  / Identifier
  / ArrayLiteral
  / ExpressionCurry
  / Tuple
  / TupleSelector
  / UnaryOperatorExpression

Operator =
  !"//" !"->" first:OperatorSymbol rest:OperatorSymbol* {

    //# Operator

    return text();
  }

OperandValueDeclaration =
  id:Identifier {

    //# OperandValueDeclaration

    return id;
  }

OperandFunctionDeclaration =
  id:Identifier params:Tuple
  {
    return buildElement(
      'OperandFunctionDeclaration',
      {
        name: id.name,
        params: params
      }
    )
  }

OperandDeclaration =
  OperandFunctionDeclaration
 / OperandValueDeclaration

/**
 * Operator declaration with form of:
 *   operand (op operand)+
 * @return type:'OperatorDeclaration', id, operands
 */
OperatorDeclaration =
  PreInfixOperatorDeclaration
  / PostfixOperatorDeclaration

PreInfixOperatorDeclaration =
  first:OperandDeclaration rest:(_ Operator _ OperandDeclaration)+
  {
    return buildElement(
      'PreInfixOperatorDeclaration',
      {
        operator: extractList(rest, 1),
        operands: buildList(first, extractList(rest, 3))
      }
    )
  }

PostfixOperatorDeclaration =
  operand:OperandDeclaration _ op:Operator
  {
    return buildElement(
      'PostfixOperatorDeclaration',
      {
        operator: op,
        operand: operand
      }
    )
  }

OperatorExpression =
  unit: (N_aryOperatorExpression / PostfixOperatorExpression)
  {
    return buildElement('OperatorExpression', { unit: unit })
  }

// unary prefix operator expression
// It is expected that result of unary operator generates single element, not a tuple.
UnaryOperatorExpression =
  op:Operator _ expr:PrimaryExpression
  {
    return buildElement('UnaryOperatorExpression', { operator: op, expr: expr})
  }

// postfix operator
// It is expected that result of postfix operator generates single element, not a tuple.
PostfixOperatorExpression =
  expr:PrimaryExpression _ op:Operator
  {
    return buildElement('PostfixOperatorExpression', { operator: op, expr: expr })
  }

N_aryOperandExpression =
  operand:(PrimaryExpression / "(" _ PostfixOperatorExpression _ ")")

// N-ary operator expression supports any number of n operands and n - 1 operators, binary, ternary, etc.
//
// Any operand as expression with postfix operator has to be wrapped with parantheses,
// except when it apprear as last element. Otherwise there is no way to distinguish
// whether an intermediate operator is a postfix one or n-ary one.
N_aryOperatorExpression =
  first:N_aryOperandExpression rest:(_ Operator _ N_aryOperandExpression)+ last: (_ Operator)?
  {
    var params = buildList(first, extractList(rest, 3));
    if (last) {
      let post_op = extractOptional(last, 1)
      params[params.length - 1] = buildElement('PostfixOperatorExpression', { operator: post_op, expr: params[params.length - 1] })
    }
    return buildElement('N_aryOperatorExpression', { ops: extractList(rest, 1), operands: params })      
  }

TupleSelector =
  "_" ("0" / (NonZeroDigit DecimalDigit* !IdentifierStart))
  {
    return buildElement('TupleSelector', { selector: text().substring(1) })
  }

ArrayElementSelector =
  id: Identifier _ "[" index:("0" / (NonZeroDigit DecimalDigit* {return text()}) / Identifier) _ "]"
  {
    return buildElement('ArrayElementSelector', { id: id, index: index })
  }

Literal =
  NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

ArrayLiteral =
  "[" elms:(_ LiteralList)? _ "]"
  {
    return buildElement('ArrayLiteral', { list: extractOptional(elms, 1) })
  }

LiteralList =
  first:PrimaryExpression rest:(_ "," _ PrimaryExpression)*
  {
    return buildElement('LiteralList', { list: buildList(first, rest, 3) })
  }

// expression for getting member of variable
MemberExpression =
  Identifier _ "[" _ ( TupleElementList)+ _ "]"

CallExpression =
  id: Identifier params:(_ Tuple)+
  {
    var extracted_params = extractList(params, 1)

    // lambda declaration
    if (id.name == '$') {
      if (extracted_params.length > 1)
        throw new Error("FTL0001: lambda's arguments followed by calling arguments!");
      return buildElement('ParamTupleBuilder', { params:extracted_params[0] })
    }

    return buildElement('CallExpression', { name: id, params: extracted_params })
  }

// Native javascript block wrapped with "{" and "}"
NativeBlock =
  "{" _ ((!("{" / "}") SourceCharacter)* {return text()})
    NativeBlock* _
    ((!("{" / "}") SourceCharacter)* {return text()}) "}" {

    //# NativeBlock
    return {type:'native', script: text()}
  }

SourceCharacter =
  .

Identifier =
  !ReservedWord name:IdentifierName
  {
    return buildElement('Identifier', { name: name })
  }

IdentifierName "identifier" =
  first:IdentifierStart rest:IdentifierPart*
  {
    return first + rest.join("")
  }

IdentifierStart =
  AsciiLetter
  / "$"
  / "_"

/// non-start of identifier
IdentifierPart =
  IdentifierStart
  / DecimalDigit

NamespaceIdentifier =
  LowerLetter (LowerLetter / "_")*
  {
    return buildElement('NamespaceIdentifier', { text: text() })
  }

// Tokens
FalseToken =
  "false" !IdentifierPart

FunctionToken =
  "fn" !IdentifierPart

NullToken =
  "null" !IdentifierPart

TrueToken =
  "true" !IdentifierPart

ModuleToken =
  "module" !IdentifierPart

ImportToken =
  "import" !IdentifierPart

VarToken =
  "var" !IdentifierPart

ConstToken =
  "const" !IdentifierPart

AsciiLetter =
  UpperLetter
  / LowerLetter

UpperLetter =
  [\u0041-\u005A]

LowerLetter =
  [\u0061-\u007A]

DecimalDigit =
  [0-9]

OperatorSymbol =
  [!%&*+\-./:<=>?^|\u00D7\u00F7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283]

ReservedWord =
  VarToken
  / ConstToken
  / FunctionToken
  / ModuleToken
  / ImportToken
  / NullToken
  / BooleanLiteral

NullLiteral =
  NullToken

BooleanLiteral =
  TrueToken
  {
    return buildElement('TrueToken', { value: true })
  }

  / FalseToken
  {
    return buildElement('FalseToken', { value: false })
  }

NumericLiteral =
  literal:HexIntegerLiteral !(IdentifierStart / DecimalDigit)
  / literal:DecimalLiteral !(IdentifierStart / DecimalDigit)
  {
    return buildElement('NumericLiteral', { value: literal })
  }

DecimalLiteral =
  DecimalIntegerLiteral "." DecimalDigit* ExponentPart?
  / [-]? "." DecimalDigit+ ExponentPart?
  / DecimalIntegerLiteral ExponentPart?
  {
    return parseFloat(text())
  }

DecimalIntegerLiteral =
  "0"
  / [-]? NonZeroDigit DecimalDigit*

NonZeroDigit =
  [1-9]

ExponentPart =
  ExponentIndicator SignedInteger

ExponentIndicator =
  "e"i

SignedInteger =
  [+-]? DecimalDigit+

HexIntegerLiteral =
  "0x"i digits:$HexDigit+

HexDigit =
  [0-9a-f]i

StringLiteral =
  '"' chars:DoubleStringCharacter* '"'
  / "'" chars:SingleStringCharacter* "'"
  {
    let str = text();
    return buildElement('StringLiteral', { value: str.substr(1, str.length - 2) })
  }

DoubleStringCharacter =
  !('"' / "\\" / LineTerminator) SourceCharacter
  / "\\" sequence:EscapeSequence
  / LineContinuation

SingleStringCharacter =
  !("'" / "\\" / LineTerminator) SourceCharacter
  / "\\" sequence:EscapeSequence
  / LineContinuation

LineContinuation =
  "\\" EOL

EscapeSequence =
  CharacterEscapeSequence
  / "0" !DecimalDigit
  / HexEscapeSequence

CharacterEscapeSequence =
  SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter =
  "'"
  / '"'
  / "\\"
  / "b"
  / "f"
  / "n"
  / "r"
  / "t"
  / "v"

NonEscapeCharacter =
  !(EscapeCharacter / LineTerminator) SourceCharacter

EscapeCharacter =
  SingleEscapeCharacter
  / DecimalDigit
  / "x"
  / "u"

HexEscapeSequence =
  "x" digits:$(HexDigit HexDigit)

LineTerminator =
  [\n\r]

// End of line
EOL =
  "\n"
  / "\r\n"
  / "\r"

WhiteSpace =
  "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"

Comment "comment" =
  MultiLineComment
  / SingleLineComment

SingleLineComment =
  "//" (!LineTerminator SourceCharacter)*

MultiLineComment =
  "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator =
  "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

// any white space, comment, with end of line
_ =
  (WhiteSpace / Comment)* (EOL+ (WhiteSpace / Comment)+)*

// at least one end of line with optional white space or comment preceding it
__ =
  ((WhiteSpace / Comment)* EOL)+

// any white space, comment, or end of line
___ =
  (WhiteSpace / EOL / Comment)*
