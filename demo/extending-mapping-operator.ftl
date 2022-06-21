import ftl/lang

// Mapping operator -> is intrinsic to FTL which cannot be changed.
//
// However, FTL allow you to extend it by providing custom operator
// in form of an operator ending with "->".
//
// The usage of such operator is very special: the ending "->"
// does not need to appear where it is used.

// 1. Explicit element accessor "."
// Besides reserved tuple element accesssor such as "_0", "_1",
// or named accessor that can be found in "tupology.ftl",
// there is an extra element accessor ".->" defined in "lang.ftl",
// which can be used as follows:

// 1.1 Named elment access from a tuple 
(a:1, b:2).b == 2
(c:(a:1, 2), d:(3, b:4)) -> (c.a, d.b)

// 1.2 Elment access with index from a tuple
(1, 2)._1 == 2
((a:1, 2), a:3) -> _0._0 == 1
((1, 2), (3, 4)) -> (_0._0, _1._1)

// 2. Conditional element accesor "?."
// This oeprator "?.->" is similar to ".->"
// except it returns empty tuple instead of null
// if the element does not exist. Because of
// this, it can be chained as follows:
(a:(b:1, c:(d:3, 2)), b:1)?.a?.c?.d == 3
(a:(b:1, c:(d:3, 2)), b:1) -> a?.c?.d == (1, 4)

// 2.1 Returns empty tuple for non-exist element
(a:(b:1, c:(d:3, 2)), b:1) -> a?.d?.e == ()

// 2.2 Get element from the immediate tuple
// If element exists in both current and previous
// tuple, it returns from current tuple:
(c:3) -> (h:1, c:2)?.c == 2

// It will return from previous tuple if current
// one does not have it:
(d:c) -> (h:1, c:2)?.d == 2

// Tuple element selector always return from
// current tuple:
(c:3) -> (h:1, c:2)?._0 == 1
