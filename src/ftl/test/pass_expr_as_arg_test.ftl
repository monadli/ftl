import ftl/lang[+, *, ==]

// 1. Function or expression can be passed as argument of a function
// provided that argument is specified as a function.

// here b is declared as a function form f(x)
fn a(b(y), x) -> b(x + 1)

fn test(z) -> z * 2

// pass test as b(x)
a(test, 3) == 8

// Or passing an expression that contains the original argument y.
// This is a short form of passing a function body with the arguments
// have be declared in calling function a.
a(y * 2, 3) == 8

// 2. The same can be expressed in operator form:
fn x => b(y) -> b(x + 1)

3 => test == 8

// 3. Not only function shown above, but expression can also be passed as
// argument for such function parameter as:
3 => y + 1 == 5
(a:3) => y + 1 == 5

// for the pipe, the previous tuple is passed as closure:
(a:3, b:2) -> a => y + b == 6
(a:3, b:2) -> a => (b + y) == 6
(a:3, b:2) -> a => (_1 + y) == 6

// Notice that
//   (a:3, b:2) -> a => y + b
// is eqivalent to
//   (a:3, b:2) -> ((a => y) + b)
// according to operators being left associative.

// For the same reason,
//   (a:3, b:2) -> a => b + y
// is eqivalent to
//   (a:3, b:2) -> ((a => b) + y)
// with which result is undefined because y is not in the right context.

// This is why above second expression has y + b enclosed in prantheses
// to put them in the right context.

// More examples:
4 -> (a:3, b:_0 * 2) -> a => (b + y) == 12
