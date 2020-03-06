import ftl/lang.==

[1, 2, 3.14159, "hello"] -> _0[2] == 3.14159

// equivalent
[1, 2, 3.14159, "hello"] -> (_0[2] == 3.14159)

// formal test case
([1, 2, 3.14159, "hello"] -> _0[2]) == 3.14159

[1, 2, 3.14159, "hello"] -> (_0[1], _0[0]) == (2, 1)

// TODO: _6 not working
(2.34, b:4.3, c:"test", d:4, e:true, f:[1, 3], g:[]) -> (_0, a:c, _6) == (2.34, 'test', [])
