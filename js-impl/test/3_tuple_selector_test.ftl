var t = (2.34, b:4.3, c:"test", d:4, e:true, f:[1, 3], g:[])

fn out(raw) { console.info('result: ' + raw)}

// a functional tuple can contain element selector from result of previous functional tuple 
t -> (_0, a:c, _6) -> out
