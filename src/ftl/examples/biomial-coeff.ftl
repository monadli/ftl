import ftl/lang[+, -, *, /, <, >, ==, '? :', '? <-']

// https://www.geeksforgeeks.org/space-and-time-efficient-binomial-coefficient/
fn binomialCoeff(n, k)
  -> (k > n - k) ? (n, k: n - k) : (n, k)
  -> (i: 0, n, k, res: 1)
  -> (i < k) ? (i: i + 1, n, k, res: res * (n - i)) <- (i, n, k, res: res / i)
  -> res

binomialCoeff(5, 2)