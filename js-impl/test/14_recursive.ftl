fn x <= y {
  return x <= y;
}

fn x - y {
  return x - y;
}

fn x * y {
  return x * y;
}

fn condition ? if_true() : otherwise() {
  return condition ? if_true() : otherwise()
}

fn fractorial(x) -> x <= 0 ? 1 : (x * fractorial(x - 1))

fractorial(3)