import ftl/lang['- ', ==]
import ftl/math.sin

/**
 * The arror operator -> is the only intrinsic one defined in language.
 * It has the form of a binary operator taking left and right operands as:
 *
 *     (a) -> (b)
 *
 * where both (a) and (b) are functional tuples.
 *
 * When b is a single element, it is equivalent to:
 *
 *     b(<a>)
 *
 * where <a> is the result of computation of a.
 *
 * When b is a tuple of multiple elements, it is equivalent to:
 *
 *     (b0(<a>), b1(<a>), ...)
 *
 * where b0, b1, ..., are elements of (b).
 *
 * Multiple functional tuples can be chained chained as:
 *
 *     (a) -> (b) -> (c)
 *
 * where result of (a) as <a> is sent to (b), and its result <b> sent to (c), etc.
 *
 * The -> operator is associative:
 *
 *     (a) -> (b) -> (c)
 *     ((a) -> (b)) -> (c)
 *     (a) -> ((b) -> (c))
 *
 * are all the same.
 */

// constant function with an explicit empty tuple as explicit input
() -> 3.14159

// constant function with an implicit empty tuple as input at time of computation
3.14159

// arrow operator with a constant function as left constant operand
// and sin function as right operand
3.14159 -> sin

// For any function which takes a number of parameters, any excessive arguments will be ignore:
(3.14159, -1) -> sin == (3.14159 -> sin)

// the above is equivalent to
sin(3.14159)

// tuple element selector
// Reserved names _0, _1, ... are for selection of tuple value element:
(3.41159, -1) -> _0 -> sin
