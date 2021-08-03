import ftl/lang[+, *, /, <, ==, ?<]

// creates an list with n elements
fn list(n) { return new Array(n) }

// returns list length
fn len(list) { return list.length }

// return last item in a list
fn last(list) { return list[list.length - 1] || null }

// return list of size N with 0's.
fn zeros(N) { return new Array(N).fill(0) }

// return list of size N with 1's.
fn ones(N) { return new Array(N).fill(1) }

// appends item to the end of list (with list modified)
fn list += item {
  list.push(item)
  return list
}

/**
 * mapping operator =>
 * This operator takes a list and a function to map each item in the list into another list.
 *
 * @input list - any array with any type
 * @input mapper - a function/expression taking one item and the result is put into the output list
 * @output a list containing mapped items.
 */
fn list => mapper(item)
  -> (list, mapper, mapped: [], i: 0)
  -> i < len(list) ?< ((list, mapper, mapped: mapped += mapper(list[i]), i) -> (list, mapper, mapped, i: i + 1))
  -> mapped


/**
 * This function takes a list and reducer function/expression taking "accu" and "item" to perform reduce.
 *
 * The computation involves in loop with operator "?<".
 * Please see the comments for operator "=>" defined in map how the for loop
 * operator is used.
 *
 * @input list - a list of elements that will be reduced
 * @input reducer - a function/expression that passes accumulation and each item and reduces to a single item
 * @output - a single reduced item
 */
fn list |> reducer(accu, item)
  -> (list, reducer, i: 1, accu: list[0])
  -> (i < len(list)) ?< (list, reducer, i: i + 1, accu: reducer(accu, list[i]))
  -> accu

fn ∑ list -> list |> (accu + item)

fn ∏ list -> list |> (accu * item)

fn mean(list) -> ∑list / len

// max of list
fn ∨ list -> list |> max(accu, item)

// min of list
fn ∧ list -> list |> min(accu, item)
