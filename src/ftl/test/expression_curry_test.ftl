import ftl/lang[+, ==]

// Expression can be computed in form of currying.
// The only difference from function currying is that each argument needs to be named.
// This is because ease of reading and reasoning.
(x + y + z)(x:1)(z:3)(y:2) == 6
(x + y + z)(x:1, z:3)(y:2) == 6

// Expression computation can be combined with
// passing partial arguments with arrow -> as well
((x:1, y:2) -> x + y + z)(z:3) == 6
