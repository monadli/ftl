/* All types are currently implicit. Specifically for this implimentation based on
 * javascript, it directly uses types from javascript.
 * Explicit type declaration may be introduced in future release.
 */

// 1. A number is any real number.
0
1
-1

// 2. A boolean constant is either true or false.
true
false

// 3. Strings are enclosed with either single or doule quotes.
'hello'
"ftl"

// 4. An array may be empty or containing any of above typed constants.
[]
[1, 2, 3]

// 5. A tuple may be empty, containg one or more of above typed constants,
//    or functions or expressions.
//    Result of a tuple is shown with computed elements in angle brackets <>
//    representing value tuples.
()
('test')
(1, 2, 3.14159, 'hello')

// An element of a tuple may have a name:
(a: "Hallo", b:'ftl!')
