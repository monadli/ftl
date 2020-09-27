import ftl/lang[*, ==]

// Function or expression can be passed as argument of a function
// provided that argument is specified as a function.

// here b is declared as a function form f(x)
fn a(b(y), x) -> b(x)

fn test(z) -> z * 2

// pass test as b(x)
a(test, 3) == 6

// Or passing an expression that contains the original argument y.
// This is a short form of passing a function body with the arguments
// have be declared in calling function a.
a(y * 2, 3) == 6
