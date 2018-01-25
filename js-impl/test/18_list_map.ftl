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

fn append(list, item) {
  list.push(item)
  return list
}

fn _map(src, mapped, index, mapper) -> index == len(src) ? mapped : _map(src, append(mapped, mapper(src[index])), index + 1, mapper)

fn list => mapper(item) -> _map(list, [], 0, mapper)

[1, 2, 3] => (item + 2)