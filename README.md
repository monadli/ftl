# Functional Tuple Language (FTL)

## Introduction
`FTL` is a very simple programming language that is composed of tuple mapping operator `->` and `functional tuple` in form of (t<sub>0</sub>, t<sub>1</sub>, ...).

Tuple as a data structure is well known and used in many programming languages. We make it functional by extending each element into a function, hence `functional tuple`. We also introduce a topology for mapping operator `->` between two `functional tuples`. Such topology defines rules between functional elements of tuples when connected by `->`. We call this `tupology` (tu-ple + to-pology).

`FTL` iss such a imple language that it only has a very few types of elements as follows: 

1. Functional tuple in form of (t<sub>0</sub>, t<sub>1</sub>, ...) with `0` based index;
2. Operator `->` between tuples;
3. Stateless pure function or operator definition statements with keyword `fn`;
4. Import statements with keyword `import` allowing grouping and importing functions across modules;
5. Application statements for performing computations composed of all above.

## Modules
Expressions can be grouped into a module and imported into other modules. A module is represented as a file with extension "`.ftl`".

Any function or operator in a module can be imported, except the ones with name prefixed with `_`, which is regarded as private to the module.

When a module is imported by another module, the already imported elements by that module are not automatically/implicitly get imported. In other words, any elements of a module have to be explicitly imported anywhere it is needed. 

### Indentations
With functional tuples and mapping operator, a complex algorithm may be expressed in a long statement spanning across many lines, which may be hard to read. Because of this, we adopt a very special form of indentation. All statements start from a new line without any leading space, and a statement may span many lines with each continuation line at least one leading space or tab. You have freedom of choosing any number of space or tab characters for indentation.
## Language Elements
### Key Words
1. `import` - for importing other modules;
2. `fn` - for defininig a function;
3. `true`, `false` - constant value for logical true and false.

### Importing Functions/Operators
Using `import` or `import ... as` to import functions from the other modules.

### Libraries
A module can be defined as a library in `lib` directory.

When importing all functions/operators from a library, such as `lib/lang.ftl`, import as:
```
import ftl/lang
```

### Application Modules
Often an application may be split into many modules in the same directory or in hierarchical directories.

When importing from such application modules, use relative directory, such as:
```
import ./submodule1
```

If you just want to import a number of functions/operators, use square brackets enclosing them with comma delimited, such as:
```
import ftl/lang[+, -, /, >]
```

For prefix/postfix/n-ary operators, they have to be quoted as:
```
import ftl/lang['- ', '? :']
```
where `'- '` refering to prefix `-` has to append a space so to distinguish from binary `-`.

For postfix operator, a space has to be prepended, such as factorial postfix operator `!`, which has to be imported as:
```
import ftl/lang[' !']
```

### Basic Data Types
1. number
2. string
3. boolean - `true`, `false`
4. list with elements separated by comma and wrapped in paired square brackets

### Functional Tuple
A functional tuple is composed of a pair of parantheses enclosing elements separated by comma as follows:

(t<sub>0</sub>, t<sub>1</sub>, ..., t<sub>n-1</sub>)

There is no dependency among the elements in one such tuple, thus each element can be computed independently and concurrently.

The element t<sub>i</sub> can be of the following:
1. constants with basic data types
2. functional tuple
3. named function or inline anonymous function (lambda expression)
4. function with partial arguments
5. unary (pre or post), binary, or n-ary operator expression

## Tupology (Tu-ple to-pology)
All computation can be expressed as tuple mapping. A tuple in one domain is mapped to second tuple in another domain via the mapping operator `->`.

For example,

(a<sub>0</sub>, t<sub>1</sub>, ..., a<sub>m</sub>) -> (b<sub>0</sub>, b<sub>1</sub>, ..., b<sub>n</sub>)

maps from domain `A` of dimension `m` to domain `B` of dimension `n`.

For operator `->`, we call the left side tuple as the input tuple and the right side as mapping tuple. In essence, the input tuple is first computed before feeding to the mapping tuple, thus at time of actual mapping, it is:
```
<...> => (...)
```
Here we use `=>` as the symbol representing the actual comutation of a `value tuple` denoted by <...> to the mapping tuple. This symbol only appears in this document for explanation and it is not an operator in FTL, even though it can be used to define an operator for any computation.

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
(pi:3.14159, e:2.71828) -> _0
```
will result in `3.14159`.

2. A tuple element may be selected by the name of input tuple element, e.g.:
```
(pi:3.14159, e:2.71828) -> e
```
will result in `2.71828`.

3. Otherwise, the whole input tuple will be applied to the expression of each tuple element when it is not an element selector.

For example:
```
(pi:3.14159, e:2.71828) -> sin
```
is equivalent to `sin(pi:3.14159, e:2.71828)`.

The computation of an expession in FTL is the process of applying the above rules to each tuple and feed the result `value tuple` to the next tuple.

Lastly but most importantly: a tuple can only see its immediate input tuple, not any other tuples beyond. Because of this, each tuple in an expression is ultimately a lamba expession.

We call such unique topoloty between tuples as `tupology` which is combination of first part of `tu-ple` and second part of `to-pology`.

## Functions
Any explicit function declaration has the following form:
```
fn name([argument list])
```

where `fn` is the reserved word, and arguments are names delimited by comma.

A function has to be declared before it can be referenced/used. Thus there is no way to define functions circularly referenced.

A function can be recursive though (such as in `fft.ftl`) in its own definiton.

### Lazy Argument Computation
A parameter can be in form of function. When a parameter is in form of a function, the actual passing argument will be wrapped as a function for delayed invocation inside the function implementation depnding on the needs.

For example, the ternary operator `? :` is written in such a way that at time of computation, either `is_true()` or `otherwise()` is computed based on the result of `if_true` but never will they be computed both. This will reduce unnecessary computation.

### Tail Function for Reducing Call Stack Depth
A parameter can be defined as a tail function as well. At runtime the corresponding expression will be wrapped as a tail function and returned to calling stack without being invoked. Such mechanism is specially designed to reduce depth of call stacks when dealing with recursive functions. In the end, no matter how many recursives, the call stack depth can be maintained as a constant.

You have to make sure that when writing a function with tail parameter, it is really a tail.

Example is in operator `?? ::`, where either `is_true$()` or `otherwise$()` will not be computed within the operator. Instead, one of them will be returned to the calling stack, reducing one level of call stack depth.

Other examples are operator `||` and `&&`, where computation y$() can be deferred into the calling stack.

### Parameter Default Value
A parameter can have default value which will be used when not provided at time of invocation.

### Extra Arguments
With parameters defined, a function may be invoked with extra arguments which will not be passed to the function.

For example:
```
(3.14, 2.718) -> sin
```
will be `sin(3.14)` at runtime.

This makes it very easy for tuple composition as well as extending existing tuples without functionality change.

## Operators
Not like other languages with many pre-defined operators such as arithmetic operators, this language does not have any intrinsic operators except `->`. However, it gives freedom of defining arbitrary operators out of a character set. For example, all arithmetic operators in `lib/lang.ftl` are defined as external operators, not intrinsic ones. The syntax allows definition of not only binary, but also prefix or postfix or n-ary operators.

### Operator Symbols
Operator can be defined with one or more characters from the following:

     ! % & * + \ - . / : < = > ? ^ | × ÷ ∏ ∑ ∕ ∗ ∙ √ ∛ ∜ ∧ ∨ ∩ ∪ ∼ ≤ ≥ ⊂ ⊃

### Operator Precedence and Associativity

When multiple operators are involved in an expression, parantheses `(` and `)` can be used to specify precedence. Otherwise, each type of operator follow the rules in the corresponding subsections below.

Overall, user defined unary operator has highest level precedence than binary/n-ary operators.

#### Unary Operators
When multiple prefix or postfix operators are applied to the same expression, most inner one has hightest precedence and most outer one has lowest precedence.

When both prefix and postfix operators are present, prefix operator has higher precedence.

In other words,

`pre-op1 pre-op2 pre-op3 expr post-op1 post-op2 post-op3 expr`

is equivalent to

`(((pre-op1 (pre-op2 (pre-op3 expr))) post-op1) post-op2) post-op3`.

#### Binary Operators

User defined binary operators have left associativity, which reflects the computation sequence and precedence as well.

Thus,
`expr1 op1 expr2 op2 expr3`
means
`(expr1 op1 expr2) op2 expr3`

In other words, when an expression involves in multiple binary operators, the most left operator has highest precedence and most right one has lowest precedence.

Example:
```
5 - 2 * 3
```
Since this expression involves in two operators `-` and `*` and operators are left associative, it is equivalent to:
```
(5 - 2) * 3
```

If `2 * 3` needs to be computed first, do this:
```
5 - (2 * 3)
```

#### N-ary Operators
`FTL` allows definiton of n-ary operators. For example, the ternary operator `? :` is defined in `ftl/lang.ftl` library.

N-ary operators cannot be nested in the middle without parantheses. Using `? :` as an example, we can have `1 < 2 ? (2 < 3 ? true : false) : false` but `1 < 2 ? 2 < 3 ? true : false : false` will give error as `ERROR: N-ary operator '< ? < ? : :' not found!`

This is because the process of resolving operator is to search from the longest posible n-ary operator `< ? < ? : :`, then starts by removing one from right and search again for `< ? < ? :`, and repeat the same process until it goes down to `<`.

If `<` is found, it will repeat the same process for `? < ? : :`, etc, where `? <` will not resolve to any know operator combinations.

This process is actually used to resolve unary/binary operators as well.

For example, the process of resolving `5 - 2 * 3` is as follows:

1. Does n-ary operator `- *` exist?
2. If not, does binary operator `-` exist?
3. If yes, then does binary operator `*` exist?

If one defineds a ternary operator ` - *` as follows:

```
fn a - b * c -> a - (b * c)
```

Then `5 - 2 * 3` will be resolved using this operator and stop at step 1 above.

With the above n-ary operator `- *` defined, one can write the following using this operator in a concatenate way (not nesting in the middle):
```
5 - 2 * 3 - 4 * 5
```
which will actually be resolved as:
```
(5 - 2 * 3) - 4 * 5
```

and the result will be `-21`.

#### Intrinsic Operator ->
Please note that all user defined operators are in form of functions with strict evaluation except the ones with parameters in form of functions or tail functions. The intrinsic mapping operator `->`, however, has the form of binary operator but in essence does not do strict evaluation.

This is because it will evaluate the left hand side first then pass the result to the right hand side before doing evaluation there. In other words, the right hand side evaluation dependes on result of left hand side evaluation.

To achieve this, the intrinsic operator`->` always has lowest precedence when user defined operators appear at the same level.

For example,

```
(a:3.14159, b:2) -> a * b + b -> _0 + 2
```

is equivalent to:
```
(a:3.14159, b:2) -> (a * b + b) -> (_0 + 2)
```

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
fn val++ -> val + 1
```

Remember in FTL, all functions are pure and stateless, `val++` does not mean the `val` itself has value changed, but just its value incremented and pass to next functioanl tuple.

#### N-ary operator
An n-ary operator is declared with operand name followed by the first operator and repeat with the same pattern for all rest operands and operators and end with the last operand:

```
fn operand1 op1 operand2 op2 operand3 
```

For example, consecutive comparison:
```
fn x < y < z
```
#### Lambda Expression
Lambda exprerssion (anonymous function) is supported in tupology expressions.

A lambda in an expression is in form of a function with a very special name `$`.

For example:
```
(1, 2, 3) -> ($(x, y, z) -> x * y * z)
```
where `($(x, y, z) -> x * y * z)` is a lambda expression.

### Array operations
Array is defined and backed by javascript array.

##### Array initializer
Array elements can be initialized as: `[1, 2, 3, 4, 5]`, or with interval such as `[1:2:5]` which results in `[1, 3, 5]`, etc.

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

For details, see implementation in `lang.ftl`, and usage in `biomial-coeff.ftl`, `map.ftl`, `reduce.ftl`, and `square-root.ftl`, etc.

#### Function/operator implementation with Javascript
Any function/operator can be implemented with javascript wrapped with curly brackets. Remember all javascript lines needs to start with at least one space except the end curly bracket.

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

### Examples and Demos
Examples and demos can be found [here](examples.html).
