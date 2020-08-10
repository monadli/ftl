import ftl/lang[+, ==, '?? ::']

fn len(list) {
  return list.length;
}

fn list += item {
  list.push(item)
  return list
}

fn _map(src, mapped, index, mapper) -> index == len(src) ?? mapped :: _map(src, mapped += mapper(src[index]), index + 1, mapper)

/**
 * mapping operator =>
 * This operator takes a list and a function to map each item in the list into another list.
 *
 * @input list - any array with any type
 * @input mapper - a function taking one item and the result is put into the output list
 * @output a list containing mapped items.
 */
fn list => mapper(item) -> _map(list, [], 0, mapper)

[1, 2, 3] => (item + 2) == [3, 4, 5]


// We can also use function to achieve the same:
fn map(list, mapper(item)) -> _map(list, [], 0, mapper)

map([1, 2, 3], (item + 2)) == [3, 4, 5]
