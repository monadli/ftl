import ftl/lang[+, -, /, >, '| <-']

//https://www.geeksforgeeks.org/square-root-of-a-perfect-square/

fn squareRoot(n)
  -> (x:n, y:1, n, e:0.000001)
  -> (x - y > e) ? (x:(x + y)/2, n, e) <- (x, y: n / x, n, e)
  -> x

squareRoot(50)