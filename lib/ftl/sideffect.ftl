// A function designed for side effect may be used as regular function as well.
// Thus output from them can be provided even though they will be discarded
// when used as sideffect.

// Within sideffect implementation in javascript, all exported classes
// in ftl-core.ftl is available under ftl namespace, such as Tuple being
// referred as ftl.Tuple.

// Wraps native console's info().
fn info(message, input) {
  console.info(`${message}: ${input}`)
}

// Throws error if result of condition is false.
// The condition can be any logical expression against input.
fn assert(condition, error) {
  if (!condition) {
    throw new Error(error)
  }
}

// General logger that has log function.
// Example is passing console as context.
fn logger(context, input) {
  context.log(input)
}
