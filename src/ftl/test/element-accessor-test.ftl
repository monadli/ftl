// Tuple element acecssor is a short cut to access tuple element
// which is normally achieved with pipe.
//
// For example:
//   (1, 2) -> _0
// returns 0'th element of the tuple with selector _0.
//
// This can be achieved using element accessor operator `.->`.
// This operator and any other operators defined with `->` postfixed
// is such a special operator that acts as `->` with your control.
//
// In other words, any binary operator postfixed with `->` is a custom
// pipe operator with your own implementation.
//
// In such operator, a is always a tuple, and b is a function in form of
// any Fn.
//
// For this `.->` operator, b is an `RefFn` carrying a tuple name or tuple
// sequential selector, such `_0`, etc.
//
// Even though such operator has `->` postfixed, you actually don't need to
// include it in your expression.

import ftl/lang

// named elment access from a tuple
(a:1, b:2).b == 2
(c:(a:1, 2), d:(3, b:4)) -> (c.a, d.b) == (1, 4)

// elment access with index from a tuple
(1, 2)._1 == 2
((a:1, 2), a:3) -> _0._0 == 1
((1, 2), (3, 4)) -> (_0._0, _1._1) == (1, 4)

// optional element
(a:(b:1, c:(d:3, 2)), b:1)?.a?.c?.d == 3
(a:(b:1, c:(d:3, 2)), b:1) -> a?.c?.d == 3

// Here element name "c" to be accessed existing in
// both previous and current tuple then will return
// from current one:
(c:3) -> (h:1, c:2)?.c == 2

// However if not existing in current tuple, it will
// get it from previous one.
//
// In the follwoing expression, "d" does not exist in
// current tuple but in previous one referring "c"
(d:c) -> (h:1, c:2)?.d == 2

// if element access via tuple element selector such as _0, _1, etc.,
// it will assume accessing element from current tuple:
(c:3) -> (h:1, c:2)?.c == 2
(c:3) -> (h:1, c:2)?._0 == 1


// returns empty tuple for non-exist element
(a:(b:1, c:(d:3, 2)), b:1) -> a?.d?.e == ()

// a nested tuple structure with nested field extracted
(
  name: "My Name", 
  address: (
      street:"123 Fake St.",
      city:"Springfield"
  )
 )
 -> (name, address.city) == ('My Name', 'Springfield')
