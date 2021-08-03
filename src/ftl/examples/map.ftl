import ftl/lang[+, <, ==, ?<]
import ftl/list[len, +=]

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

// an array containing number that are mapped into another number with 2 added.
[1, 2, 3] => (item + 2) == [3, 4, 5]
