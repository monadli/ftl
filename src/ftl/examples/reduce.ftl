import ftl/lang[+, <, ==, '? <-']
import ftl/math.max

fn len(list) {
  return list.length
}

/**
 * This function takes a list and reducer function to perform reduce.
 *
 * @input list - a list of elements that will be reduced
 * @input reducer - a function that passes accumulation and each item and reduces to a single item
 * @output - a single reduced item
 */
fn list =|> reducer(accu, item)
  -> (list, reducer, i: 1, accu: list[0])
  -> (i < len(list)) ? (list, reducer, i: i + 1, accu: reducer(accu, list[i])) <- (list, reducer, i, accu)
  -> accu

// sum up
[1, 2, 3] =|> (accu + item) == 6

// find max number
[1, 3, 10, 5] =|> max(accu, item)