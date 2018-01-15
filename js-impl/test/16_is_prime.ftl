fn x % y {
  return x % y
}

fn x > y {
  return x > y
}

fn x < y {
  return x < y
}

fn x == y {
  return x == y
}

fn x || y() {
  return x || y()
}

fn x + y {
  return x + y
}


fn x - y {
  return x - y
}

fn condition ? if_true$() : otherwise$() {
  return condition ? if_true() : otherwise()
}

/**
 * Internal recursive function computing if a number n is prime number based on a divisor. 
 */
fn _is_prime(n, divisor) -> (divisor == (n - 1)) ? true : ((n % divisor == 0) ? false : _is_prime(n, divisor + 1))

// test if a number is a prime number
fn is_prime(n) -> (n < 2) ? false : ((n == 2) ? true : _is_prime(n, 2))

// apply is_prime to 31 to test if 31 is a prime number
is_prime(31)
