fn a + b {
  return a + b
}

fn x == y {
  return x == y
}

fn condition ? if_true$() : otherwise$() {
  return condition ? if_true() : otherwise()
}

fn len(list) {
  return list.length;
}

fn reduce(accu, list, index, reducer) -> index == len(list) ? accu : reduce(reducer(accu, list[index]), list, index + 1, reducer)
fn list =|> reducer(i1, i2) -> (list[0], list, 1, reducer) -> reduce

[1, 2, 3, 4] =|> (i1 + i2)
