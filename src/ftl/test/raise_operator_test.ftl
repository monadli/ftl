import ftl/lang
import ftl/list
import ftl/math

// Using binary operator prefix '.' to raise '*' operator
([1, 2] .* 2) == [2, 4]

// Combination of raised arithmetic operators.
// The precedence of the operators follow the precedence
// of regular operators, meaning left one has the highest
// precedence.
1 .+ [1, 2] .* 2 == [4, 6]
((1 .+ [1, 2]) .* 2) == [4, 6]

// The operator prefix can be used for scalars as well,
// which is not needed though:
1 .+ 2 == 3

// Operator .->-> to raise a function for array.
// The last -> can be ommitted when used in expression.
//
// The same expression above can be expressed with it as:
[1, 2] .-> (_0 * 2) == [2, 4]

// Using .-> to raise array to cos function
[1, 2] .-> cos == [cos(1), cos(2)]
