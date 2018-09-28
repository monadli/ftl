fn contains(str, sub) {
  return str.includes(sub);
}

// creates an inline partial function
//   contains('test')
// with one last parameter provided.
// 
// When calling this partial function, only the first one argument
// needs to be provided. 
'this is a test' -> contains('test')