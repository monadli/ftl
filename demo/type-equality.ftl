// importing operator == from standard module lang in ftl
import ftl/lang

// basic type equality
0 == 0
1 == 1
-1 == -1
3.14159 == 3.14159

true == true
false == false
null == null

// Paired single quotes and double quotes are exchangiable.
"" == ""
'' == ''
"" == ''
'' == ""

"hello" == "hello"
"Hello, ftl!" == 'Hello, ftl!'

[] == []
[1, 2, 3.14159, 'hello'] == [1, 2, 3.14159, 'hello']

() == ()
(3.14159) == (3.14159)

// A tuple with single element is comparable with a standalone not enclosed in a tuple.
// In other words, any non-tuple item is emplicitly a tuple containing just one element.
(3.14159) == 3.14159
-1 == (-1)
('test') == 'test'

// A tuple with no-named elements are comparable to a tuple with named elements, or names are not part of equality.
(1, 2, 3.14159, 'hello') == (a:1, b:2, 3.14159, 'hello')

// Run this program will result in true for all above expressions.
