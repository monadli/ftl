import ftl/lang[+, ==, '?? ::']

fn len(list) {
  return list.length
}

fn _reduce(list, accu, index, reducer(accu, item)) -> index == len(list) ?? accu :: _reduce(list, reducer(accu, list[index]), index + 1, reducer)

/**
 * Reduce that takes a list and reducer function.
 *
 * @input list - a list of elements that will be reduced
 * @input reducer - a function that passes accumulation and each item value and reduces to a single item
 * @output - a single reduced item
 */
fn list =|> reducer(accu, item) -> _reduce(list, list[0], 1, reducer)

[1, 2, 3, 4] =|> (accu + item) == 10
