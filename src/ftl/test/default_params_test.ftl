import ftl/lang[==]

// A function declaration can have consecutive default parameters towards the end of the parameter list.
// Any default parameter can refer to the default parameters on the left hand side,
// or default parameters declared earlier.

fn test(x, y:1, z:3) { return x + y + z }

// x
test(1) == 5

// x, y
test(1, 2) == 6

// x, y, z
test(1, 2, 4) == 7
