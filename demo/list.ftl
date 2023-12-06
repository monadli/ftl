// list is natively supported with elements wrapped by pair of '[' and ']'.
// There are a number of functions for lists.

import ftl/lang
import ftl/list

// negative for all elements
-[1, -4, 2]

// sum
∑[1, -4, 2] -> 'sum: ' + _

// multiplication
∏[1, -4, 2]

// mean
mean([1, -4, 2])

// min
∧[1, -4, 2]

// max
∨[1, -4, 2]

// length
len([1, -4, 2])

// concatenate two lists into one
[[1, 2], [3, 4]]

// last element
[1, -4, 2] -> _[-1]

// selector with reverse index for -4
[1, -4, 2] -> _[-2]

// selector for range of whole list
[1, -4, 2] -> _[0:2]
[1, -4, 2] -> _[0:]

// selector for subrange of [-4, 2]
[1, -4, 2] -> _[1:2]
[1, -4, 2] -> _[1:]

// selector for subrange of [-4, 2] with reverse indices
[1, -4, 2] -> _[-2:]
[1, -4, 2] -> _[-2:-1]
