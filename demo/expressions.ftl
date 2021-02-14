// Any expression (import, function declaration, application expression)
// starts from begining of line without any leading space.
//
// If a line is too long and needs to continue into second line or multiple lines,
// add any leading space in front of any continuous line.

import ftl/lang[+, -, *]
import ftl/math[sin, cos]

// Defining a function in one line: 
fn a + b + c -> a + b + c

// Defining a function in two lines:
fn a + b - c
 -> (a + b) - c

// One special exception is for native implementation of a function in javascript
// where the ending curly bracket has to be at begining of the line marking end of
// the function.
fn add(x, y) {
  return x + y 
}

// expression in one line
2 + 3 -> sin -> cos


// expression in three lines
3 * 4 -> sin
 -> _0 + 1
 -> _0 * 2

1 + 2 - 3
add(1, 2)