//
// basic arithmetic operators
//

// unary -

fn -val { return -val }

fn x + y { return x + y }
fn x - y { return x - y }
fn x * y { return x * y }
fn x / y { return x / y }
fn x % y { return x % y }

//
// basic logic operators
//
fn x == y {
  function arrayIdentical(a, b) {
    var i = a.length;
    if (i != b.length) return false;
    while (i--) {
        if (a[i] != b[i]) return false;
    }
    return true;
  }

  return x == y
    || x instanceof Array && y instanceof Array && arrayIdentical(x, y)
    || x instanceof ftl.Tuple && x.equals(y)
}

fn x != y { return x != y }
fn x < y { return x < y }
fn x <= y { return x <= y }
fn x > y { return x > y }
fn x >= y { return x >= y }

// logical operator '||' and '&&' with second parameter as tail
fn x || y$() { return x || y() }
fn x && y$() { return x && y() }

// ternary operator
fn condition ? if_true() : otherwise() { return condition ? if_true() : otherwise() }

// ternary operator with if_true and otherwise as tail functions
fn condition ?? if_true$() :: otherwise$() { return condition ? if_true() : otherwise() }

// Function that captures while loop in such a form
// that it checks condition first, and if true, do the loop.
//
// The two parameters are in form of tail function. Inside they are not
// actually used as tail function though. This is the way to pass
// tuple functions inside a native implementation for an operator.
fn condition$() ?< loop$() {
  let [loop_f, res] = loop().wrapped.unwrap()
  let [condition_f] = condition().wrapped.unwrap()

  while (condition_f.apply(res)) {
    res = loop_f.apply(res)
  }

  return res
}

// Function that captures do ... while loop in such a form
// that it computes the first statement, then the loop.
// After loop is computed, check if condition is true. If true,
// keep going back to first and then loop until condition is false.
fn loop$() <? condition$() {
  let [loop_f, res] = loop().wrapped.unwrap()
  let [condition_f] = condition().wrapped.unwrap()

  do {
    res = loop_f.apply(res)
  } while (condition_f.apply(res))

  return res
}
