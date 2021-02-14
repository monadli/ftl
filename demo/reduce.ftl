import ftl/lang[+, <, ==, ?<]
import ftl/math.max
import ftl/list.len

/**
 * This function takes a list and reducer function/expression taking "accu" and "item" to perform reduce.
 *
 * @input list - a list of elements that will be reduced
 * @input reducer - a function/expression that passes accumulation and each item and reduces to a single item
 * @output - a single reduced item
 */
fn list =|> reducer(accu, item)
  -> (list, reducer, i: 1, accu: list[0])
  -> (i < len(list)) ?< ((list, reducer, i: i + 1, accu: reducer(accu, list[i])) -> (list, reducer, i, accu))
  -> accu

// accumulation with a lambda expression
[1, 2, 3] =|> ($(accu, item) -> accu + item) == 6

// or with just a simple expression which acts as an implicit
// lambda expession without parameter list
[1, 2, 3] =|> (accu + item) == 6

// find max number with a simple expression
[1, 3, 10, 5] =|> max(accu, item)
