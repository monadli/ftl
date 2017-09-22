fn out(val) { console.info('res:' + val)} 

fn $a + $b {
  return a + b
}

// map
fn $list => &mapper {
  var ret = []
  for (var i = 0; i < list.length; i++)
    ret.push(mapper(list[i]))
  return ret
}

[1, 2, 3] => (_ + 2) -> out
