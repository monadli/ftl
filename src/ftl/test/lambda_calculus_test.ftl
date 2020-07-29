import ftl/lang[*, ==]

// Any tuple form prefixed with '$' is treated as a lambda calculus.
// Lambda calculus is in essence an anonymous function, which can be copied to anywhere.
(1, 2, 3) -> $(x, y, z) -> x * y * z == 6

// The above is equivalent to:
(x:1, y:2, z:3) -> x * y * z == 6

// Lambda calculus may be wrapped in a closed prantheses to form a clean boundary.
// Otherwise all the rest is treated as part of the lambda
(1, 2, 3) -> ($(x, y, z) -> x * y * z) == 6