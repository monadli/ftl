fn a + b {
  return a + b
}

/**
 * Reduce that takes a list and reducer function.
 *
 * @input list - a list of elements that will be reduced
 * @input reducer - a function that passes item1 and item2 and reduces to a single item
 * @output - a single reduced item
 */
fn list =|> reducer(i1, i2) {
  var ret = list[0];
  for (var i = 1; i < list.length; i++)
    ret = reducer(ret, list[i]);
  return ret
}

[1, 2, 3] =|> (i1 + i2)
