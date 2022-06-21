import ftl/lang
import ftl/list
import ftl/math

// 1. With the same mechanism used creating element accessor in
// extending-mapping-operator.ftl, an operator is created
// for raising a scalar function to take array as input.

// The operator is defined as ".->->" in list.ftl and can be
// easily used. Remember the ending "->" can be omitted in
// actual use.

// raise array to cos function
[1, 2] .-> cos == [cos(1), cos(2)]

// expression can be raised for array as well
// where _0 in expression is passed as individual
// element from the array 
[1, 2] .-> (_0 * 2) == [2, 4]

// when scalar is passed to ".->", it works as well:
1 .-> (_0 + 2) == 3

// More complicated expression where the first _0
// on the left side of .-> refers to the array in
// previous tuple and the _0 on the right hand side
// refers to elements in the first _0:
([1, 2, 3], b:2) -> (_0 .-> (_0 + b)) == [3, 4, 5]

// 2. Raise binary operators for arrays
// FTL allows defining binary operator prefix (not prefix operator)
// to extend functionality of a binary operator.
//
// Binary operator prefix is defined in the following form:
//
// fn a [prefix]<op> b
//
// One specific prefix "." is defined as
//
// fn a .<op> b
//
// which can be used to raise any scaler binary operator for array:
[1, 2] .+ [3, 4] == [4, 6]
[1, 2] .* 3 == [3, 6]
3 .* [1, 2] == [3, 6]
