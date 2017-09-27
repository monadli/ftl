fn out(val) { console.info('res:' + val)} 

// binary operator
fn $a + $b {
  return a + b
}

// ternary operator
fn $a - $b - $c {
  return a - b - c
}

// quadruple operator
fn $a - $b + $c - $d {
  return a - b + c - d
}

// the following is equivalent to (1 - 2 + 4 - 9) + (4 - 5 - 7) 
1 - 2 + 4 - 9 + 4 - 5 - 7 -> out
