import ftl/lang
import ftl/list

// With => operator
[1, 2, 3] => (item + 2) == [3, 4, 5]

// With raise .-> operator that raises regular expression
// to be applicable to array.
[1, 2, 3] .-> (_0 + 2) == [3, 4, 5]

// The same lift operator can be used for non-array as well
1 .-> (_0 + 2) == 3
// which behaves the same as non-raise operator
1 -> (_0 + 2) == 3

// Thus raise operator is such an operator that raises regular
// expression to be applicable to array.

// More complicated expression where some element
// refers to another element in previous tuple
([1, 2, 3], b:2) -> (_0 .-> (_0 + b)) == [3, 4, 5]