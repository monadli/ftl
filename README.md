# ftl - Functional Tuple Language (FTL)

Functional Tuple Language is a computer program language based on functional tuple calculus.

## Introduction
FTL is based on functional tuple calculus, which comes with an intrinsic tuple mapping topology. At runtime, the mapping topology can be depicted as chains of functional tuples.

With functional tuple calculus, there is no need for variables storing intermediate results.


## Tuple
In FTL, a tuple is a finite ordered sequence of elements separated by comma. The number of elements can be as few as 1 and as many as n where n > 1. The elements are 0-indexed.

The above definition is no much difference from definition elsewhere. The elements as 0-indexed follows most other programming languages.

The elements of a tuple can be one of the following:
1. Constant, such as string (single-quoted or double-quoted), integer, double, boolean, etc.
1. Element selector, such as a name identifier. Special element selector: "\_" followed by a positive integer, such as \_0, \_5, etc.
1. Array with elements separated by comma and surrounded by square brackets.
1. Function, or a partial function
1. Other expressions, such as operator expressions.
1. Another tuple.

Example:
(1, 2, true, 'test', "another test", [3.14, 2.7])
(sin, cos)
(x * x + 1, [1, 2, 3, 4], ('any'))

## Tuple with Named Elements
Optionally, an element in a tuple can be named.

Example:
(*a*:1, 2, *b*:true, 'test') where the 0th and 2nd elements have names *a* and *b*, respectively.

## Functional Tuple Calculus

**Definition of Operator &#8594;**
The operator &#8594; is an infix operator with two tuple operands **A** and **B** as follows:

  (a<sub>0</sub>, a<sub>1</sub>, ..., a<sub>m-1</sub>) &#8594; (b<sub>0</sub>, b<sub>1</sub>, ..., b<sub>n-1</sub>) where m and n can be different.

The operation of this operator is to apply the whole tuple **A** to each element of tuple **B** as follows:

  ((a<sub>0</sub>, a<sub>1</sub>, ..., a<sub>m-1</sub>) &#8594; b<sub>0</sub>, (a<sub>0</sub>, a<sub>1</sub>, ..., a<sub>m-1</sub>) &#8594; b<sub>1</sub>, ..., (a<sub>0</sub>, a<sub>1</sub>, ..., a<sub>m-1</sub>) &#8594; b<sub>n-1</sub>)

The application of the whole tuple **A** to individual element of tuple **B** is as follows:

1. When the element b<sub>i</sub> is a constant *c*, the result is the constant itself:
  (a<sub>0</sub>, a<sub>1</sub>, ..., a<sub>m-1</sub>) &#8594; *c* = *c*
1. When the element b<sub>i</sub> is a function *f* that takes *q* of arguments, where *q* <= *m*, it applies the *q* arguments to the function:
  (a<sub>0</sub>, a<sub>1</sub>, ..., a<sub>m-1</sub>) &#8594; *f* = *f*(a<sub>0</sub>, a<sub>1</sub>, ..., a<sub>q-1</sub>)
1. When the element b<sub>i</sub> is an expression, it substitutes the named elements in the expression with selected elements from **A**.

Example:

**A**: (pi:3.14159, e:2.71828)
**B**: (a:pi &#8594; sin, b:e &#8594; ln)
Or
**B**: (a:\_0 &#8594; sin, b:\_1 &#8594; ln)
Or
**B**: (a:sin, b:\_1 &#8594; ln)

All three **B** above are equivalent. The first element is math function *sin*, which takes any tuple that has at least one elements, and it just takes the first first element as the argument. The second is math function *ln* for natural logarithm.

**A** &#8594; **B** yields a tuple **C** with elements as (a:0, b:1).

Note the difference between tuple (a:0, b:1) and tuple **B**. Tuple **B** contains computational expression elements that takes a value tuple **A** through operator &#8594; and yields another value tuple **C**. We call tuple **B** as functional tuple, or:

  value tuple &#8594; functional tuple = value tuple

If we abstract **A** to simply names as (pi, e), the expression becomes:

(pi, e) &#8594; (sin, b:\_1 &#8594; ln)

which in essence is:
((pi, e) &#8594; (pi) &#8594; sin, (pi, e) &#8594; (e) &#8594; ln)

It is simply a tuple containing two &lambda;-calculus: (pi) &#8594; sin and (e) &#8594; ln.



 




