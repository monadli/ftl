import ftl/lang[+, -, <=, ==, '?? ::', '<- |']

// The algorithms are from //https://www.geeksforgeeks.org/program-for-nth-fibonacci-number/

// recursion implementation of Fibonacci number
fn fib(n) -> (n <= 1) ?? n :: (fib(n - 1) + fib(n - 2))

// space optimized
fn fib2(n) ->
  n == 0
  ? 0
  : (
    n == 1
    ? 1
    : (i:2, a:0, b:1, n)
      -> (i, a:b, b:a + b, n) <- (i:i + 1, a, b, n) | (i <= n)
      -> b
  )

fib(9)

fib2(9)
