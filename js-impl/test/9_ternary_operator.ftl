fn out(raw) { console.info('result: ' + raw)} 

fn a > b {
  return a > b
}

fn a * b {
  return a * b
}

/**
 * Ternary operator for
 *    predicate ? if_true() : otherwise()
 *  where output of if_true() and otherwise() should have the same type
 *
 * @input condition - a predicate that returns true or false
 * @input if_true() - an expression that will be computed when condition is true
 * @input otherwise() - an expression that will be computed when condition is false
 * @output output of either &if_true or &otherwise
 */
fn condition ? if_true() : otherwise() {
  return condition ? if_true() : otherwise()
}

// if 4 > 0 return 5 * 2 = 10 otherwise return 3 * 3 = 9
(1, 3, 4, 5) -> _2 > 0 ? (_3 * 2) : (_1 * 3) -> out
