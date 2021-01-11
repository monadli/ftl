import ftl/lang[+, ==]
import ftl/math.sin

// Expression can be computed in form passing arguments
// same as in passing arguments to a function with arguments
// wrapped in prantheses () in the end of the expression, such as:
(x + y + z)(x:1, z:3, y:2) == 6

// or
(x:1, y:2) -> (x + y + z)(z:3) == 6

// This makes an expression similar to an anonymous function.

// The arguments passing can be chained like:
(x + y + z)(x:1, z:3)(y:2) == 6

// If passing of each argument is by itself, it will be in form
// of currying:
(x + y + z)(x:1)(z:3)(y:2) == 6

// The requirement for passing arguments to an expression is that
// each argument needs to be named and compute to a constants
// (can be an expression but not relying on other inputs).
// This is for ease of reading and reasoning.
(x + y + z)(x:sin(3.14))(z:3)(y:2) == (sin(3.14) + 5)
