import ftl/lang[==, '- ', <, +, -, *, '?? ::']

// Unary (prefix, postfix), binary, or n-ary operators can be defined with any combination
// of the following characters:
//
//     !%&*+\-./:<=>?^|\u00D7\u00F7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283
//
// This list may be extended to include more.
//
// All operators are defined with the keyword "fn".

// Prefix operator is defined  with the single argument following the operator:
fn --x { return x - 1}

// Postfix operator is defined with the operator postfixed to the single argument without brackets:
fn n! -> n < 2 ?? 1 :: (n * (n - 1)!)

// Binary or n-ary operators are defined just with operands and operator symbols interleaved.
fn a + b - c -> a * b - c

// Using the operators the same way they are defined (except for prefix operator where brackets
// are not necessarily needed).
--3
-(1 + 2)
5!

// this does 3 * 4 - 5 according to implemenaion of '+ -' above
3 + 4 - 5 == 7

// Very important: user defined operators are left associative and do not have precedence.
// Thus,
//
//     a - b * c == (a - b) * c
// Use brackets to specify precedence.

3 - 1 * 5 == ((3 - 1) * 5)

// Look at the definition of fn x! above, you will find that we wrapped (x * (x - 1)!)
// for needed precedence, and for x < 2 ?? 1 :: ..., we did not wrap x < 2.
// This is because during parsing, we know there is no any n-ary operator '< ??' or '< ?? ::'
// thus there is no ambiguilty there. Hence by the rule of left association of operators,
// by default it is equivalent to:
//
//     (x < 2) ?? 1 :: (x * (x - 1)!)

