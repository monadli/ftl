## Introduction
Tuple with form (t<sub>0</sub>, t<sub>1</sub>, ...) as a data structure is well known and used in many programming languages. We make it functional by extending each element into a function and call it `functional tuple`. We also introduce a topology between two functional tuples with mapping rules denoted with operator `->`.

Based on the functional tuple and topology operator `->`, we define a very simple language, functional tuple language, or `ftl`. This language contains very small number of intrinsic elements as follows:

1. `Functional tuple` in form of `(t<sub>0</sub>, t<sub>1</sub>, ...)` with `0` based index. Each element is implicitly a function;
2. Topology operator `->` between functional tuples;
3. Function definition statement with keyword `fn`;
4. Import statements with keyword `import` allowing grouping and importing functions in modules;
5. Application statements composed of tuples and mapping operators.

The implementation of `ftl` in this repo is based on `typescript`/`javascript` with support of native function implementation using `javascript` besides using `ftl`. This language may also be implemented and run with the other languages.

Except operator `->`, this language does not have any other pre-defined operators. It does allow definition of your own operators though, which can be prefix, postfix, binary, or n-ary operators.

The most commonly used arithmetic operators and logic operators are defined in a library module `lang.ftl` for convenience. They can be overriden though in your own application modules.

All statements start from begininig of a line without any trailing space, and can span across multiple lines with at least one space on each subsequent line indicating continuation of the statements.


## Everythng is a Function

In `ftl`, everything is represented as a function, starting from constants to `for loops`.

### Functional Tuple
Any collection of elements wrapped into the form of a tuple `(...)` is called a `functional tuple`, where each element is implicitly a function.

For example,
```
(3,14159, 2,71828)
```

is a functional tuple that results in a `value tuple` <3,14159, 2,71828> with any arguments.

Unless we explicitly use the term `value tuple`, anywhere when we mention tuple, we mean `functional tuple`.

#### Named elements
Any element in a tuple can optionally have a name, such as:
```
(pi:3,14159, e:2,71828)
```
and the result of its computation is a value tuple <pi:3,14159, e:2,71828>.

#### Constants as functions
Any constant is implicitly a function returning the constant itself with any input.

For exmple,
```
() -> 3.14159
0 -> 3.14159
f(x) -> 3.14159
```
all returns 3.14159 regardless of input.

With constant as function, elements of a tuple are all homogenously functions, hence the name `functional tuple`.

## Tupology (Tu-ple to-pology)
All computation can be expressed as tuple mapping. Each tuple represents a vector in a space with dimension of the tuple, which can be mapped to another space of different dimention via the mapping operator `->`.

For example,
```
(a<sub>0</sub>, t<sub>1</sub>, ..., a<sub>m</sub>) -> (b<sub>0</sub>, b<sub>1</sub>, ..., b<sub>n</sub>)
```
maps from space `A` of dimension `m` to space `B` of dimension `n`.

For operator `->`, we call the left side tuple as the input tuple and the right side one as mapping tuple. In essence, the input tuple is first computed before feeding to the mapping tuple, thus at time of actual mapping, it is:
```
<...> => (...)
```
Here we use `=>` as the symbol representing the actual comutation of a `value tuple` to the mapping tuple. This symbol only appears in this document for explanation and it is not an operator in ftl, even though it can be used to define an operator for any computation.

If there is another pair of `-> (...)` following, such as:
```
(...) -> (...) -> (...)
```

then the second tuple is the input tuple for the third one, etc.

The same mapping process is repeated until all tuples in the chain is exhausted.

With tuple and mapping operator, an expression of arbitrary length can be created. Or, a complex computation can be written into one such algbraic expression.

The `src/ftl/example/fft.ftl` is an example, where fast Fourier transform (FFT) is expressed in one expression.

The mapping operator has the following simple rules:

1. A tuple element may be selected by a tuple element selector, which is expressed as `_` followed by the sequence of the input tuple, e.g.:
```
(pi:3,14159, e:2,71828) -> _0
```
will result in `3.14159`.

2. A tuple element may be selected by the name of input tuple element, e.g.:
```
(pi:3,14159, e:2,71828) -> e
```
will result in `2,71828`.

3. Otherwise, the whole input tuple will be applied to the expression of each tuple element which is not an element selector.

For example:
```
(pi:3,14159, e:2,71828) -> sin
```
is equivalent to `sin(pi:3,14159, e:2,71828).

The computation of an expession in `ftl` is the process of applying the above rules to each tuple and feed the result `value tuple` to the next tuple.

We call such unique topoloty between tuples as `tupology` which is combination of first part of `tu-ple` and second part of `to-pology`.

### Function definition
Any explicit function declaration has the following form:
```
fn name([argument list])
```

where `fn` is the reserved word, and arguments are names delimited by comma `,`.

A functions has to be declared before it can be referenced.

A function can be recursive though (such as in `fft.ftl`).

A parameter can be in form of function. When a parameter is a function, the actual passing argument will be wrapped as a function for delayed invocation inside the function implementation depnding on the needs.

For example, the operator `? :` is written in such form thus at time of computation, either `is_true()` or `otherwise()` is computed based on the result of `if_true` but never will they be computed both. This will reduce unnecessary computation.

A parameter can be defined as a tail function as well. At runtime the correspond expression will be wrapped as a tail function and returned to calling stack without being invoked. Such mechanism is specially designed to reduce depth of call stacks when dealing with recursive function. In the end, no matter how many recursives, the call stack depth can be maintained constant.

One has to make sure that write a function defining tail argument, make sure it is really a tail.

Example is in operator `?? ::`, where either `is_true()` or `otherwise()` will not be computed within the operator. Instead, one of them will be returned to the calling stack, reducing one level of calling stacks.

Another example is operator `||`, where computation of either x or y can be deferred into the calling stack.

A parameter can have default value which will be used when not provided at time of invocation.

With parameters defined, a function may be invoked with extra arguments which will not be passed to the function.

For example:
```
(3.14, 2.718) -> sin
```
will be `sin(3.14)` at runtime.

### Operators

The `ftl` supports prefix (unary), postfix, and n-ary operators.

Combinations of any characters from the following subset can be used as an operator:

! % & * + \ - . / : < = > ? ^ | × ÷ ∏ ∑ ∕ ∗ ∙ √ ∛ ∜ ∧ ∨ ∩ ∪ ∼ ≤ ≥ ⊂ ⊃

`//`, `/*`, and `*/` as exceptions are used for comments.

#### Prefix operator
A prefix operator is declared with operator followed by the operand name.

For example, unary minus operator:
```
fn -val
```

#### Postfix operator
A postfix operator is declared with operand name followed by the operator.

For example, increment operator:
```
fn val++
```

#### N-ary operator
An n-ary operator is declared with operand name followed by the first operator and repeat with the same pattern for all rest operands and operators and end with the last operand:

```
fn operand1 op1 operand2 op2 operand3 
```

For example, consecutive comparison:
```
fn x < y < z
```
#### Lambda
Lambda (anonymous function) is supported in tupology expressions.

A lambda in an expression is in form of a function with a very special name `$`.

For example:
```
(1, 2, 3) -> ($(x, y, z) -> x * y * z)
```
where `($(x, y, z) -> x * y * z)` is a lambda.

#### Array operation
There are special array operations
##### Array initializer
Array elements can be initialized for each element as: `[1, 2, 3, 4, 5]`, or with interval such as `[1:2:5]` which results in `[1, 3, 5]`, etc.

##### Array selector
Array elements can be selected in the following way:

1. Select singe element:
`[m]` means selecting mth element.
2. Select a sub-array with range specified:
`[m:n]` means selecting from mth element inclusive to nth element inclusive.
3. Select a sub-array with `begin` specified:
`[3:]` means selecting a subarray starting from 3rf element to the end of the array.
4. Select a sub-array with `interval` specified as well:
`[3:2:]` means selecting a subarray starting from 3rf element with interval of 2 to the end of the array.

Example:
```
[1,2,3,4,5] -> _0[1:2:]
```
returns `[2, 4]`.

#### Raising function for each array element
Any function/operator defined for non-array can be raised for array with `.` prefixing the operator.

For example:
```
[1, 2] -> .cos
```
is equivalent to:
```
[cos(1), cos(2)]
```

`[1, 2] .* 2` will result in `[2, 4]`.

#### For loop as a function
The `for` and `while ... do` loops can be easily expressed as functions. Same is `do ... while` loop.

For details, see implementation in `lang.ftl`, and usage in `biomial-coeff.ftl`, `mao.ftl`, `reduce.ftl`, and `square-root.ftl`.

#### Function/operator implementation with Javascript
For any function/operator, it can be implemented with javascript wrapped with curly brackets. Remember all javascript lines needs to start with at least one space except the end curly bracket.

For example:
```
fn -val { return -val }
```

Or
```
fn -val {
  return -val
}
```

#### Function/operator implementation with ftl
When implementing with ftl, it starts wtih operator `->`.

For example:
```
fn x! -> x < 2 ?? 1 :: (x * (x - 1)!)
```

#### Application
Statements for application are all in form of ftl in tuples `(...)` and mapping operators `->`.
