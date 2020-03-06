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

// logical operator || and && with tail declaration
fn x || y$() { return x || y() }
//fn x && y$() { return x && y() }

// ternary operator
fn condition ? if_true() : otherwise() { return condition ? if_true() : otherwise() }

// ternary operator with if_true and otherwise marked as tail functions
//fn condition ?? if_true$() :: otherwise$() { return condition ? if_true() : otherwise() }
