import ftl/lang.==

// select from a begining to an end with an interval
[1,2,3,4,5] -> _0[1:2:4] == [2, 4]

// select from a begining to the end with an interval
[1,2,3,4,5] -> _0[1:2:] == [2, 4]
