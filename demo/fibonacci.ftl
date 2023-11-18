import ftl/lang[+, -, <, <=, ==, '? :', '?? ::', ?<]

// The algorithms are from https://www.geeksforgeeks.org/program-for-nth-fibonacci-number/

// direct computation
(n:9) ->
  n <= 1
  ? n
  : (i:2, a:0, b:1, n)
    -> (i <= n) ?< (i: i + 1, a: b, b: a + b, n)
    -> b

// function with space optimized
fn fib2(n) ->
  n <= 1
  ?? n
  :: (i:2, a:0, b:1, n)
    -> (i <= n) ?< (i: i + 1, a: b, b: a + b, n)
    -> b

// function with recursion implementation of Fibonacci number
fn fib(n) -> (n <= 1) ?? n :: (fib(n - 1) + fib(n - 2))

fib(9)

fib2(9)
