// creates an list with n elements
fn list(n) { return new Array(n) }

// returns list length
fn len(list) { return list.length }

// appends item to the end of list
fn list += item {
  list.push(item)
  return list
}
