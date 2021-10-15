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
  // initialization tuple with list and mapper as is,
  // and "mapped" and "i" with initial values 
  -> (list, mapper, mapped: [], i: 0)

  // loop with the tuple after  operator "?<" computed,
  // and result value tuple is fed back into the same tuple
  // until condition before operatpr "?<" is satisfied
  -> i < len(list) ?< (list, mapper, mapped: mapped += mapper(list[i]), i:i + 1)

  // finally, mapped contains final result
  -> mapped

// an array containing number that are mapped into another number with 2 added.
[1, 2, 3] => (item + 2) == [3, 4, 5]
