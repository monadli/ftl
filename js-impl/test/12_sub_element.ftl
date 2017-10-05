fn out(raw) { console.info('result: ' + raw)}

/**
 * Operator "." for sub-element resolution.
 */
fn a . b(raw) {
  return b(a);
}

// a tuple with b which is another tuple
var tuple = (b:(4.3, 4.5), c:"test", d:4, e:true)

// using operator '.' to retrieve the second element (with ._1) of b (with .b)
tuple.b._1 -> out