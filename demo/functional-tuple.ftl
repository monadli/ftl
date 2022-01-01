import ftl/lang['- ', +, ==]
import ftl/math.*

/**
 * Functional tuple (tuple for short) is the most basic building block in FTL.
 */

// 1. Empty tuple
()

// 1. A tuple can be with just one element:
(3.14159)

// 2. Tuple with one element
// is equivalent to the element alone:
(3.14159) == 3.14159


// 3. Tuple of multiple elements
(3.14159, 'Hello ftl!')

// 4. Tuple element can be either constants, functions, or expressions
3.14159 -> (sin, -cos, sin + cos)

// 5. In essence, each element in a tuple is a function, even if it
// is in form of a constant:
3.14159 == (() -> 3.14159)