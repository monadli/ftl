fn x < y {
  return x < y;
}

fn x - y {
  return x - y;
}

fn x * y {
  return x * y;
}

fn condition ? if_true$() : otherwise$() {
  return condition ? if_true() : otherwise()
}

fn fractorial(x) -> x < 2 ? 1 : (fractorial(x - 1) * x)

fractorial(4)