import ftl/lang[==, '- ', <, +, -, *, '?? ::']
import ftl/list['∑ ', '∏ ']

// Unary (prefix, postfix), binary, or n-ary operators can be defined with any combination
// of the following characters:
//
//     !%&*+\-./:;<=>?^|×÷∏∑∕²³⁴√∛∜∗∙∧∨∩∪∼≤≥⊂⊃¬∀
//
// This list may be extended to include more in the future.
//
// All operators are defined with the keyword "fn".

∑[1, 2, 3] == 6

∏[1, 2, 4] == 8

// Prefix operator is defined with single argument following the operator:
fn --x { return x - 1}

// Postfix operator is defined with the operator postfixed to the single argument without brackets:
fn n! -> n < 2 ?? 1 :: (n * (n - 1)!)

// Please note above, (x * (x - 1)!) is wrapped for needed precedence,
// but in x < 2 ?? 1 :: ... , x < 2 is not wrapped. This is because
// there is no any n-ary operator '< ??' or '< ?? ::' thus there is no
// ambiguilty there. By the rule of left association of operators,
// by default it is equivalent to:
//
//     (x < 2) ?? 1 :: (x * (x - 1)!)


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
