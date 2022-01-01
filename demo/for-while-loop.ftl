import ftl/lang
import ftl/sideffect

// The for loop is modeled as operator ?< which takes a boolean expression
// and incremental expression as:
//
//     (initial variables) -> (boolean expression) ?< (incremental expression) -> (results)
//
// 
// The while loop is modeled as operator <? which can be used as:
//
//     (initial variables) -> (incremental expression) ?< (boolean expression) -> (results)

// 1. simple loop without computation but just output i in the end
(i: 0) -> (i < 10) ?< (i: i + 1) -> i

// 2. same simple loop with intermediate results displayed:
(i: 0)
 -> @info('i starts with', i)
 (i < 10) ?< (i: @info('i in loop', i) i + 1)
 -> @info('i ends with', i) i

// 3. More complicated loop with computation
//    summation of 1 to 100
//    with (i: 0, sum: 0) as initialization
//    and in the end output sum as result
(i: 0, sum: 0)
 -> @info('sum starts with', sum)
 (i <= 100) ?< (i: i + 1, sum: sum + i)
 -> @info('sum ends with', sum) sum

// 4. Same computation in while loop:
(i: 0, sum: 0)
 -> @info('sum starts with', sum)
 (i: i + 1, sum: sum + i) <? (i <= 100)
 -> @info('sum ends with', sum) sum
