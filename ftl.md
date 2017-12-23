# ftl - Functional Tuple Language (FTL)

Functional Tuple Language is a computer program language based on functional tuple lambda expression.

## Introduction
FTL is a language based on *functional tuple expression*. It comes with an intrinsic tuple mapping topology. This mapping topology can be depicted as a chain of functional tuples. Computation results at each functional tuple are directly passed to next functional tuple through mapping topology, eliminating the  intermittent state variables. 

## Lambda Expression
Many programming languages support lambda expression (anonymous function) with the following form (in BNF) as:

  `<`lambda-expression`>` ::= **(** `<`parameter-list`>` **) ->** `<`expression`>`

where
  `<`parameter-list`>` ::= `<`identifier`>` | `<`identifier`>` **,** `<`parameter-list`>` 

For definitions of all other symbols please see Appendix.

When actual value parameters are passed to a lambda expression, there is an implicit mapping rule that the values are mapped to the parameter list sequentially.

Example:
  (x, y) -> x + y

## Tuple
A tuple is a finite ordered sequence of 0-indexed elements separated by comma and wrapped by brackets as follows:

  `<`tuple`>` := **(** `<`tuple-elements`>` **)**
where
  `<`tuple-elements`>` ::= `<`expression`>` | `<`expression`>` , `<`tuple-elements`>`

Example:
  (1, 2, 'foo', 'bar', x + y)
  The first 4 elements are constant expressions and the fifth is an algebra expression.

The definition of a tuple has exactly the same form as the parameter list in lambda expression above, except that the elements are different: they are just identifiers in a parameter list while they are expressions in a tuple.

Since identifier is a special case of expression, parameter list is a subset of tuple.

When N = 1, the tuple is equivalent to a single element:

  ('foo') &equiv; 'foo'
  and vice versa.

## Tuple Elements with Optional Names
Let us add an optional name to elements in a tuple by redefining tuple-elements:

  `<`tuple-elements`>` ::= `<`named-expr`>` | `<`named-expr`>` , `<`tuple-elements`>`

where
  `<`named-expr`>` ::= [ `<`identifier`>` **:** ] `<`expression`>`

Example:
  (*a*:1, 2, *b*:true, 'test') where the 0th and 2nd elements have names *a* and *b*, respectively.

## Tuple Element Selector
Let us define tuple selector as:

`<`tuple-element-selector`>` ::= [ `<`identifier`>` **:** ] **_** `<`non-negative-integer`>`

The tuple element selector is a special expression which selects an elements from a tuple.

Example:
  _2 will select 2nd elements from a tuple when applied to a tuple.

## Rewrite Lambda Expression with Tuple
With definition of tuple named element and element selector, we can rewrite lambda expression with tuple as

  `<`lambda-expression`>` ::= `<`tuple-parameters`>` **->** `<`expression`>`

where
  `<`tuple-parameters`>` ::= **(** `<`tuple-parameter-elements`>` **)**
  `<`tuple-parameter-elements`>` ::= `<`tuple-element-selector`>` | `<`tuple-element-selector`>` **,** `<`tuple-parameter-elements`>` 

Example:
  For lambda expression
  (x, y) -> x + y
  the left hand side can be rewritten as a tuple with tuple-parameters as:
  (x:\_0, y:\_1) -> x + y

This makes applying actual values to the lambda expression very explicit.

Now it is time to define application of value tuple as actual arguments to a lambda expression.

The tuple actual parameter values when applied to tuple can also be written as tuple with value elements.
  For example: (4, 5)
When this tuple is applied to the lambda expression as a whole, we can 
  Not only that, we can reuse the same symbol to denote applying the actual values to the lambda as:
  (1, 2) -> (x:\_0, y:\_1) -> x + y

##Application of Lambda Expression##
In most programming languages, application of actual arguments to a lambda expression are written as

  ((x, y) -> x + y)(1, 2)

The symbol **->** can be viewed as an infix operator between parameter list and expression.

With rewrite of lambda expression with named tuple element and tuple selector, we can use the same infix operator **->** to denote how to apply the actual  arguments to the lambda expression:

  (1, 2) -> ((x:\_0, y:\_1) -> x + y)

Since the parentheses around the lambda expression is actually a tuple of one element, which is equivalent to the element itself, the parentheses thus can be removed, resulting in:

  (1, 2) -> (x:\_0, y:\_1) -> x + y

The operator **->** has left associativity. Thus the computation always starts from left to right. For the example above, the actual computation steps will be:

  (1, 2) -> (x:\_0, y:\_1) -> x + y
  &equiv; ((x:(1, 2) -> \_0, (1, 2) -> y:\_1) -> x + y // apply (1, 2) to each element of next tuple
  &equiv; (x:1, y:2) -> x + y
  Now repeat the same steps for the next ->:
  (x:1, y:2) -> x + y
  &equiv; 1 + 2
  &equiv; 3

##Functional Tuple Lambda Expressions##

When the same parameters apply to multiple expressions, we can try to put them into the following form:

(t<sub>0</sub>:\_0, t<sub>1</sub>:\_1, ..., t<sub>N-1</sub>:\*\_N-1*) -> (expression<sub>0</sub>, expression<sub>1</sub>, ..., expression<sub>M-1</sub>)

which is equivalent to

((t<sub>0</sub>:\_0, t<sub>1</sub>:\_1, ...) -> expression<sub>0</sub>, (t<sub>0</sub>:\_0, t<sub>1</sub>:\_1, ...) -> expression<sub>1</sub>, ..., (t<sub>0</sub>:\_0, t<sub>1</sub>:\_1, ...) -> expression<sub>M-1</sub>)

which will result in a tuple of M values.

##Functional Tuple Language##
With all above definitions and derivations, we can easily define a language with chains of functional tuple lambda expressions.

Unlike most other languages where data are computed in separate statements and stored in stateful variables, in FTL, all computation expressions are wrapped into functional tuples and as operands of infix operator "->", to form a composition expression.

###Functional Tuple###
A functional tuple is such a tuple that the elements can be any acceptable expressions.
The elements of a functional tuple can be one of the following:
1. Constant, such as string (single-quoted or double-quoted), number, boolean, etc.
1. Element selector, such as a name identifier, or a tuple selector.
1. Array with elements of types in 1., separated by comma and surrounded by square brackets, such as [1, "string", true].
1. Function, or a partial function
1. Other expressions, such as operator expressions.
1. Another tuple.

### Composition Operator ->###
The operator -> is the most basic composition glue that chains functional tuples together to form larger composition functions.

The element of a functional tuple can be with a name. For an element name on the left hand side tuple, its scope is limited to only the next tuple.

Example:
  In (1, 2) -> (x:\_0, y:\_1) -> (x + y, x - y), the computation steps are as follows:
  (1, 2) -> (x:\_0, y:\_1) -> (x + y, x - y)
  &equiv; ((x:(1, 2) -> \_0, (1, 2) -> y:\_1) -> (x + y, x - y) // apply (1, 2) to each element of next tuple
  &equiv; (x:1, y:2) -> (x + y, x - y)
  Now repeat the same steps for the next ->:
  (x:1, y:2) -> (x + y, x - y)
  ((x:1, y:2) -> x + y, (x:1, y:2) -> x - y)
  &equiv; (1 + 2, 1 - 2)
  &equiv; (3, -1)

### User Defined Operators ###
The operator -> FTL defines only one operator
FTL allows definition of any n-ary operator from the following finite set of characters:

! % & * + - . / : < = > ? ^ | &#0215; &#x00F7; &#x220F; &#x2211; &#x2215; &#x2217; &#x2219; &#x221A; &#x221B; &#x221C; &#x2227; &#x2228; &#x2229; &#x222A; &#x223C; &#x2264; &#x2265; &#x2282; &#x2283;

Any combination of them can be defined as prefix or postfix unary, binary operators.

N-ary operator is also supported.

For example, ternary operator for if else can be defined with '?' amd ':' as:

fn condition ? if_true : otherwise

where *condition* is a predicate expression, *if_true* and *otherwise* are expressions executed based on result of *condition*.

The following is the application of the ternary operator:
(1, 3, 4, 5) -> \_2 > 0 ? (\_3 * 2) : (\_1 * 3)

where
  \_2 > 0 is the predicate expression for condition testing if the 2nd element is greater than 0
  (\_3 * 2) is the expression executed when condition is true
  (\_1 * 3) is the expression executed when condition is false

## References
1. https://en.wikipedia.org/wiki/Expression_(computer_science)



