/**
 * ftl grammar
 *
 * This grammar is in form of peg, specifically parsable by pegjs (https://pegjs.org)
 *
 * Jian Li
 */

// start
Start
  = __ program:Declarations?

// all allowed declarations
Declarations
  = (__ VariableDeclaration)* (__ FunctionDeclaration)* (__ Executable)*

// Variable or constant declaration at module level, which can be referenced in any functions within the same module.
VariableDeclaration
  = (ConstToken / VarToken) __ Identifier __ "=" __ PrimaryExpression

// Function declaration
FunctionDeclaration
  = __ FunctionToken __ Identifier __ Tuple __ FunctionBody

Tuple = "(" __ elms:ParameterList? ")"

ParameterList
  = first:Parameter rest:(__ "," __ Parameter)*

Parameter
  = id:(Identifier __ ":")? __ expr:Expression

FunctionBody
  = NativeBlock
  / PipeExpression

PipeExpression
  = "->" __ ex:Expression __

Expression
  = first:PrimaryExpression rest:(__ PipeExpression)?

Executable
  = __ expr:Expression

PrimaryExpression
  = CallExpression
  / MemberExpression
  / Identifier
  / Literal
  / ArrayLiteral
  / Tuple

Literal
  = NullLiteral
  / BooleanLiteral
  / NumericLiteral
  / StringLiteral

ArrayLiteral
  = "[" (__ elms:LiteralList)? "]"

LiteralList
  = first:PrimaryExpression rest:(__ "," __ PrimaryExpression)*

// expression for getting member of variable
MemberExpression
  = __ Identifier __ "[" __ ( ParameterList)+ __ "]"

CallExpression
  = __ Identifier __ "(" __ ( ParameterList)+ __ ")"

// Native javascript block wrapped with "{" and "}"
NativeBlock
  = "{" __ ((!("{" / "}") SourceCharacter)* ) NativeBlock* __ ((!("{" / "}") SourceCharacter)* ) "}"

SourceCharacter
  = .

Identifier
  = !ReservedWord name:IdentifierName

IdentifierName "identifier"
  = head:IdentifierStart tail:IdentifierPart*

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
FunctionToken   = "function"
NullToken       = "null"
TrueToken       = "true"
VarToken        = "var"
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
  = TrueToken
  / FalseToken

NumericLiteral
  = literal:HexIntegerLiteral !(IdentifierStart / DecimalDigit)
  / literal:DecimalLiteral !(IdentifierStart / DecimalDigit)

DecimalLiteral
  = DecimalIntegerLiteral "." DecimalDigit* ExponentPart?
  / [-]? "." DecimalDigit+ ExponentPart?
  / DecimalIntegerLiteral ExponentPart?

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

// white spaces
__
 
  = (WhiteSpace / EOL / Comment)*
