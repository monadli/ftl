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

  let cond = await condition_f.applyAndResolve(res)
  while (cond) {
    res = await loop_f.apply(res)
    cond = await condition_f.applyAndResolve(res)
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
    res = await loop_f.apply(res)
  } while (await condition_f.applyAndResolve(res))

  return res
}

// Element accessor, a short cut to get specific tuple elements
// which is normally achieved with pipe.
//
// If element does not exist, it returns an empty tuple.
//
// For example:
//   (1, 2)._1    // analogous to (1, 2) -> _1
//   (a:1, b:2).a // analogous to (a:1, b:2) -> a
//
// @parameters:
//   a: a tuple
//   b: a name in form of RefFn
// @return tuple element or empty tuple
fn a .-> b {
  if (!b instanceof ftl.RefFn) {
    throw new Error('b has to be a name of a tuple element or _0, _1, etc.')
  }
  return a.get(b.name)
}

// Conditional element accessor, similar to element acecssor,
// but returns empty tuple if element does not exist, thus
// the same operator can be chained wtihout throwing error.
//
// For example:
//   (a:(b:a, c:(d:1, 2)), b:1) -> a?.f?.e
// returns an empty tuple.
//
// @parameters:
//   a: a tuple
//   b: a name in form of RefFn
//
fn a ?.-> b -> a.b || ()
