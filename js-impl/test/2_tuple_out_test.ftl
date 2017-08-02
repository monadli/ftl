// define a tuple with optional named elements with primitive values or array
var t = (2.34, b:4.3, c:"test", d:4, e:true, f:[1, 3], g:[])

fn out(varargs) { console.info('res:' + varargs)}

t -> out 
