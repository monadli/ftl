import ftl/lang[+, <, ==, '? <-']
import ftl/list[list, len, +=]

/**
 * mapping operator =>
 * This operator takes a list and a function to map each item in the list into another list.
 *
 * @input list - any array with any type
 * @input mapper - a function taking one item and the result is put into the output list
 * @output a list containing mapped items.
 */
fn list => mapper(item)
  -> (list, mapper, mapped: [], i: 0)
  -> (i < len(list)) ? (list, mapper, mapped: mapped += mapper(list[i]), i) <- (list, mapper, mapped, i: i + 1)
  -> mapped

// an array containing number that are mapped into another number with 2 added.
[1, 2, 3] => (item + 2) == [3, 4, 5]


import ftl/lang[+, <, ==, '? <-']
//import ftl/list[len, +=]

fn len(list) { return list.length }

// appends item to the end of list
fn list += item {
  list.push(item)
  return list
}

fn condition$() ?< loop$() {
  var loop_wrapped = loop()._wrapped
  var loop_f = loop_wrapped.f
  var condition_f = condition()._wrapped.f

  var res = loop_wrapped.closureParams
  while (condition.applyAndUnwrap(res)) {
    res = loop_f.applyAndUnwrap(res)
  }

  return res
}

/**
 * mapping operator =>
 * This operator takes a list and a function to map each item in the list into another list.
 *
 * @input list - any array with any type
 * @input mapper - a function taking one item and the result is put into the output list
 * @output a list containing mapped items.
 */
fn list => mapper(item)
  -> (list, mapper, mapped: [], i: 0)
  -> i < len(list) ?< ((list, mapper, mapped: mapped += mapper(list[i]), i) -> (list, mapper, mapped, i: i + 1))
  -> mapped

// an array containing number that are mapped into another number with 2 added.
[1, 2, 3] => (item + 2) == [3, 4, 5]
