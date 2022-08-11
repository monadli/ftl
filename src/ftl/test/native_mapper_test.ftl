import ftl/lang[+, ==]

/**
 * mapping operator =>
 * This operator takes a list and a function to map each item in the list into another list.
 *
 * @input list - any array with any type
 * @input mapper - a function taking one item and the result is put into the output list
 * @output a list containing mapped items.
 */

fn list => mapper(item) {
  var ret = []
  for (var i = 0; i < list.length; i++) {
    let v = await mapper(list[i])
    ret.push(v)
  }
  return ret
}

// an array containing number that are mapped into another number with 2 added.
[1, 2, 3] => (item + 2) == [3, 4, 5]

// achieve the same using function
fn map(list, mapper(item)) {
  var ret = []
  for (var i = 0; i < list.length; i++) {
    let v = await mapper(list[i])
    ret.push(v)
  }
  return ret
}

map([1, 2, 3], (item + 2)) == [3, 4, 5]