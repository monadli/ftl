import ftl/lang

// simple array selector
([1, 2, 3], 1) -> _0[_1] == 2

// array initializer
[1:5] == [1, 2, 3, 4, 5]
[1:2:5] == [1, 3, 5]
[1:2:6] == [1, 3, 5]

// select from a begining to an end with an interval
[1,2,3,4,5] -> _0[1:2:4] == [2, 4]

// select from a begining to the end with an interval
[1,2,3,4,5] -> _0[1:2:] == [2, 4]

[1,2,3,4,5] -> _0[2:3] == [3, 4]
[1,2,3,4,5] -> _0[3:] == [4, 5]


// property accessor
((1, 2), (3, 4)) -> (_0._0, _1._1) == (1, 4)
