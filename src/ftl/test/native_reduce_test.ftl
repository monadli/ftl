import ftl/lang[+, ==]

/**
 * Reduce that takes a list and reducer function.
 *
 * @input list - a list of elements that will be reduced
 * @input reducer - a function that passes accumulation and each item and reduces to a single item
 * @output - a single reduced item
 */
fn list =|> reducer(accu, item) {
  var ret = list[0];
  for (var i = 1; i < list.length; i++)
    ret = reducer(ret, list[i]);
  return ret
}

[1, 2, 3] =|> (accu + item) == 6