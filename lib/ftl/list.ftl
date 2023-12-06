import ftl/lang[+, *, /, <, ==, ?<, '? :']
import ftl/math

// creates an list with n elements
fn list(n) { return new Array(n) }

// returns list length
fn len(list) { return list.length }

// return last item in a list
fn last(list) { return list[list.length - 1] || null }

// return list of size N with 0's.
fn zeros(N) { return new Array(N).fill(0) }

// return list of size N with 1's.
fn ones(N) { return new Array(N).fill(1) }

// appends item to the end of list (with list modified)
fn list += item {
  list.push(item)
  return list
}

/**
 * mapping operator =>
 * This operator takes a list and a function to map each item in the list into another list.
 *
 * @input list - any array with any type
 * @input mapper - a function/expression taking one item and the result is put into the output list
 * @output a list containing mapped items.
 */
fn list => mapper(item)
  -> (list, mapper, mapped: [], i: 0)
  -> i < len(list) ?< (list, mapper, mapped: mapped += mapper(list[i]), i: i + 1)
  -> mapped


/**
 * This function takes a list and reducer function/expression taking "accu" and "item" to perform reduce.
 *
 * The computation involves in loop with operator "?<".
 * Please see the comments for operator "=>" defined in map how the for loop
 * operator is used.
 *
 * @input list - a list of elements that will be reduced
 * @input reducer - a function/expression that passes accumulation and each item and reduces to a single item
 * @output - a single reduced item
 */
fn list |> reducer(accu, item)
  -> (list, reducer, i: 1, accu: list[0])
  -> (i < len(list)) ?< (list, reducer, i: i + 1, accu: reducer(accu, list[i]))
  -> accu

/**
 * This is a filter operator which takes a list and passes each element
 * through the predicate and in the end return a list containing all
 * passed elements.
 */
fn list >| predicate(item)
  -> (list, predicate, filtered: [], i: 0)
  -> i < len(list) ?< (list, predicate, filtered: predicate(list[i]) ? (filtered += list[i]) : filtered, i: i + 1)
  -> filtered

fn ∑ list -> list |> (accu + item)

fn ∏ list -> list |> (accu * item)

fn mean(list) -> ∑list / len

// max of list
fn ∨ list -> list |> (accu ∨ item)

// min of list
fn ∧ list -> list |> (accu ∧ item)

/**
 * Apply each element of the list to f, which can be a function or an
 * expression.
 *
 * This has the same effect as operator =>, except the list item passing
 * to f does not have an explicit name, instead it has implicit tuple selector _0.
 *
 * For example:
 *   [3.14, 6.28] .-> sin            // to a function, where _0 not need to be referred
 *   [3.14, 6.28] .-> (sin, cos)     // to a tuple of functions, where _0 not need to be referred
 *   [3.14, 6.28] .-> (1 + sin(_0))  // to an expression, where _0 has to be used
 */
fn list .->-> f {
  if (Array.isArray(list)) {
    if (f instanceof ftl.TupleFn) {
      let ret = new ftl.Tuple()
      for (let elm of f.fns) {
        let val = []
        for (let e of list) {
          let v = await elm.apply(e)
          val.push(v)
        }
        if (elm instanceof ftl.NamedExprFn)
          ret.addNameValue(elm.name, val)
        else
          ret.addValue(val)
      }
      return ret
    }
    else {
      let val = []
      for (let e of list) {
        let v = await f.apply(e)
        val.push(v)
      }
      return val
    }
  } else
    return await f.apply(list)
}

/**
 * Operator prefix for array on any binary operators.
 *
 * For example:
 *   [1, 2] .+ [3, 4] == [4, 6]
 *   [1, 2] .* 3 == [3, 6]
 *
 * @parameters
 *   a - scalar or list operand
 *   op binary operator to be raised
 *   b - scalar or list operand
 */
fn a .<op> b {
  let b_is_arr = Array.isArray(b)
  if (Array.isArray(a)) {
    let ret = []
    let i = 0
    for (let elm of a) {
      let v = await op.apply(ftl.Tuple.fromValues(elm, b_is_arr ? b[i] : b))
      ret.push(v)
      i++
    }
    return ret
  } else if (b_is_arr) {
    let ret = []
    for (let elm of b) {
      let v = await op.apply(ftl.Tuple.fromValues(a, elm))
      ret.push(v)
    }
    return ret
  } else
      return await op.apply(ftl.Tuple.fromValues(a, b))
}
