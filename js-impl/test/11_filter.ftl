fn out(val) { console.info('res:' + val)} 

fn a > b {
  return a > b
}

/**
 * Filter that takes a list and predicate.
 *
 * @input 
 */
fn list |=> predicate(item) {
  var ret = [];
  for (var i = 0; i < list.length; i++) {
    var itm = list[i];
    if (predicate(itm))
      ret.push(itm);
  }
  return ret;
}

[-1, 2, 3, 0, -4, 5] |=> (item > 0) -> out
