import ftl/lang

// tuple element selector
// Reserved names _0, _1, ... are for selection of tuple value element:
(3.14159, -1) -> _0 == 3.14159

// swap
(3.14159, -1) -> (_1, _0) == (-1, 3.14159)

// Result of no-named single element tuples will be flatted into containing tuple.
// Here (a:3.14159) is a single element tuple and it is contained in parent tuple
// without a name. But (c:-1) has name "b" in the container, thus it will
// not flatted into container.
((a:3.14159), b:(c:-1)) == (a:3.14159, b:(c:-1))

