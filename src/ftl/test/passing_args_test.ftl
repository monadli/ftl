// There are a number of ways of passing arguments to a function.
// when calling a function in form of f(x, y, z), the parameters
// are basically name selectors with optionally
// default values.

// example:
fn contains(str, sub) {
    return str.includes(sub)
}

// 1. When the arguments do not have names, they are passed sequentially
// to parameters.

contains('this is a test', 'test')

// 2. If arguments contains names, the names has to be in
// the end. the names will be matched. Once a name is matched, all
// names after that parameter have to be matched as well. Otherwise,
// error is raised.

contains(str:'this is a test', sub:'test')
contains(sub:'test', str:'this is a test')

// This is not allowed because 'a' and 'b' does not match any parameter name.
//   contains(a:'this is a test', b:'test')
//   contains(a:'test', str:'this is a test')
//   contains(str:'this is a test', b:'test')

// 3. If arguments are less than required, partial function is formed
// where the remaining parameters becomes new parameters of the partial
// function.

'this is a test' -> contains(sub:'test')
'test' -> contains('this is a test')
'test' -> contains(str:'this is a test')
