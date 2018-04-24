/**
 * ftl grammar
 *
 * This grammar is in form of peg, specifically parsable by pegjs (https://pegjs.org)
 *
 * Jian Li
 */

// start
Start
  = ___ ModuleDeclaration? ___ program:Declarations? ___ 

ModuleDeclaration
  = ModuleToken _ ModulePath NamespaceIdentifier 

// all allowed declarations
Declarations
  = first:Declaration rest:(__ Declaration)*

Declaration
  = ImportDeclaration / VariableDeclaration / FunctionDeclaration / Executable

ModulePath
  = (NamespaceIdentifier ".")*

ImportSingleItem
  = ModulePath id:(Identifier / Operator) as:(_ "as" _ (Identifier / Operator))?

ImportMultiItems
  = ImportItem (_ "," _ ImportItem)*

ImportList
  = ModulePath NamespaceIdentifier _ "[" _ ImportMultiItems? _ "]"

ImportItem
  = ImportList
  / ImportSingleItem

ImportDeclaration
  = ImportToken _ ImportMultiItems

// Variable or constant declaration at module level, which can be referenced in any functions within the same module.
VariableDeclaration
  = modifier:(ConstToken / VarToken) _ id:Identifier _ "=" _ expr:PrimaryExpression

// Function declaration
// A function can be n-ary operator as well
FunctionDeclaration
  = FunctionToken _ id:(OperatorDeclaration / Identifier / Operator) _ params:Tuple? _ body:FunctionBody

Tuple = "(" _ elms:ParameterList? ")"

ParameterList
  = first:Parameter rest:(_ "," _ Parameter)*

Parameter
  = id:(Identifier _ ":")? _ expr:Expression

FunctionBody
  = NativeBlock
  / PipeExpression

PipeExpression
  = "->" _ ex:Expression _

Expression
  = first:(OperatorExpression / PrimaryExpression) rest:(_ PipeExpression)?

Executable
  = expr:Expression

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
  = !"->" first:OperatorSymbol rest:OperatorSymbol*

OperandValueDeclaration
  = id:Identifier

OperandReferenceDeclaration
  = id:Identifier params:Tuple

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
  = first:OperandDeclaration rest:(_ Operator _ OperandDeclaration)+

PostfixOperatorDeclaration
  = operand:OperandDeclaration _ op:Operator

OperatorExpression
  = UnaryOperatorExpression
  / N_aryOperatorExpression
  / PostfixOperatorExpression

// unary prefix operator expression 
UnaryOperatorExpression
  = op:Operator _ expr:PrimaryExpression

// postfix operator
PostfixOperatorExpression
  = expr:PrimaryExpression _ op:Operator

// n-ary operator expression
N_aryOperatorExpression
  = operand:PrimaryExpression rest: (_ Operator _ PrimaryExpression)+

TupleSelector
  = "_" ("0" / (NonZeroDigit DecimalDigit* !IdentifierStart))

ArrayElementSelector
  = id: Identifier _ "[" index:("0" / (NonZeroDigit DecimalDigit*) / Identifier) _ "]"

Literal
  = NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

ArrayLiteral
  = "[" elms:(_ LiteralList)? _ "]"

LiteralList
  = first:PrimaryExpression rest:(_ "," _ PrimaryExpression)*

// expression for getting member of variable
MemberExpression
  = Identifier _ "[" _ ( ParameterList)+ _ "]"

CallExpression
  = id: Identifier _ params:Tuple

// Native javascript block wrapped with "{" and "}"
NativeBlock
  = "{" _ ((!("{" / "}") SourceCharacter)*)
    NativeBlock* _
    ((!("{" / "}") SourceCharacter)*) "}"

SourceCharacter
  = .

Identifier
  = !(ReservedWord WhiteSpace) name:IdentifierName

IdentifierName "identifier"
  = first:IdentifierStart rest:IdentifierPart*

IdentifierStart
  = AsciiLetter
  / "$"
  / "_"

/// non-start of identifier
IdentifierPart
  = IdentifierStart
  / DecimalDigit

NamespaceIdentifier
  = LowerLetter (LowerLetter / "_")*

// Tokens
FalseToken      = "false"
FunctionToken   = "fn"
NullToken       = "null"
TrueToken       = "true" !IdentifierStart
ModuleToken     = "module" !IdentifierStart
ImportToken     = "import" !IdentifierStart
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
  = [!%&*+\-./:<=>?^|\u00D7\u00F7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283]

ReservedWord
  = Keyword
  / NullLiteral
  / BooleanLiteral

Keyword
  = ModuleToken
  / ImportToken 
  / VarToken
  / ConstToken
  / FunctionToken

NullLiteral
  = NullToken

BooleanLiteral
  = TrueToken
  / FalseToken

NumericLiteral
  = literal:HexIntegerLiteral !(IdentifierStart / DecimalDigit)
  / literal:DecimalLiteral !(IdentifierStart / DecimalDigit)
  / literal:DecimalIntegerLiteral

DecimalLiteral
  = DecimalIntegerLiteral "." DecimalDigit* ExponentPart?

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
  / "'" chars:SingleStringCharacter* "'"

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