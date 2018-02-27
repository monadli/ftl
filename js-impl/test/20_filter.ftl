fn a > b {
  return a > b
}

fn a + b {
  return a + b
}

fn condition ? if_true$() : otherwise$() {
  return condition ? if_true() : otherwise()
}

fn x == y {
  return x == y
}

fn len(list) {
  return list.length;
}

fn list += item {
  list.push(item)
  return list
}

fn _filter(list, filtered, index, predicate) ->
 index == len(list) ? filtered : _filter(list, (list[index], predicate, filtered) -> _1(_0) ? (_2 += _0) : _2, index + 1, predicate)

// another option
//fn _filter(list, filtered, index, predicate) ->
// index == len(list) ? filtered : _filter(list, predicate(list[index]) ? (filtered += list[index]) : filtered, index + 1, predicate)

/**
 * Filter that takes a list and predicate.
 *
 * @input 
 */
fn list |=> predicate(item) -> _filter(list, [], 0, predicate)

[-1, 2, 3, 0, -4, 5] |=> (item > 0)
