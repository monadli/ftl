import ftl/lang['- ', ==]
import ftl/math.sin

/**
 * The arror operator -> is the only intrinsic one defined in FTL.
 * It has the form of a binary operator taking left and right operands as:
 *
 *     a -> b
 *
 * where both a and b are functional tuples.
 *
 * When b is a single element, it is equivalent to:
 *
 *     b(<a>)
 *
 * where <a> is the result of computation of functional tuple a.
 *
 * When b is a tuple of multiple elements, it is equivalent to:
 *
 *     (b0(<a>), b1(<a>), ...)
 *
 * where b0, b1, ..., are elements of functional tuple b.
 *
 * Multiple functional tuples can be chained as:
 *
 *     a -> b -> c
 *
 * where result of a as <a> is sent to b, and its result <b> sent to c, etc.
 *
 * The -> operator is associative:
 *
 *     a -> b -> c
 *     (a -> b) -> (c)
 *     a -> (b -> c)
 *
 * are all the same.
 */

// constant function 3.14159 with an explicit empty tuple as explicit input
() -> 3.14159

// constant function 3.14159 with an implicit empty tuple as input at time of computation
3.14159

// arrow operator with a constant function 3.14159 as left operand
// and sin function as right operand
3.14159 -> sin

// For any function which takes a number of parameters, any excessive arguments will be ignore:
(3.14159, -1) -> sin == (3.14159 -> sin)

// tuple element selector
// Reserved names _0, _1, ... are for selection of tuple value element:
((3.14159, -1) -> _0 -> sin) == sin(3.14159)

// swap is very simple
(3.14159, -1) -> (_1, _0) == (-1, 3.14159)

// Result of no-named single element tuples will be flatted into containing tuple.
// Here (a:3.14159) is a single element tuple and it is contained in parent tuple
// without a name. But (c:-1) has name "b" in the container, thus it will
// not flatted into container.
((a:3.14159), b:(c:-1)) == (a:3.14159, b:(c:-1))
