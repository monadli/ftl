// any function can take a tuple resulted from previous functional tuple and takes only consecutive parameters it needs
var t = (2.34, b:4.3, c:"test", d:4, e:true, f:[1, 3], g:[])

fn out(varargs) { console.info('res:' + varargs)}

fn sin(x) { return Math.sin(x) }

// a functional tuple can contain element selector from result of previous functional tuple
// for variable t, its member is queryable in next ft 
t -> (_0 -> sin, c -> sin) -> out

(3.13, 2.12) -> sin -> out