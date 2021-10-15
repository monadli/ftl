import ftl/lang[+, -, /, >, ?<]

//https://www.geeksforgeeks.org/square-root-of-a-perfect-square/

/**
 * Compute square root.
 * It involves in for loop operator "?<" in more complicated form
 * where loop tuple after "?<" is a pipe of tuples where the second one has
 * the same named elements as the intial tuple, which is the basic
 * requirement for a for loop.
 */
fn square_root(n)
  -> (x:n, y:1, n, e:0.000001)
  -> (x - y > e) ?< ((x:(x + y)/2, n, e) -> (x, y: n / x, n, e))
  -> x

square_root(50)