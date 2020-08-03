import ftl/lang[*, ==]
import ftl/math.cos

// raise '*' operator
[1, 2] .* 2 == [2, 4]

// raise cos function
([1, 2] -> .cos) == [cos(1), cos(2)]

// So far the raise operator has to be wrapped properly with tuple brackets
// as above. Otherwise it will not work as below:
//   [1, 2] -> .cos == [cos(1), cos(2)]
// This will be fixed once the raise operator is included in grammar.


