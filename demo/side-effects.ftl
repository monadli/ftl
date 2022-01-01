import ftl/lang
import ftl/math
import ftl/sideffect

// A @sideffect can be use to any tuple element which includes
// implicit single tuple element without being wrapped by (...).

// Same @sideffect can be used multiple times as well.

(1, 2) ->
  @info('whole input', _)
  @info('first', _0)
  @info('second', _1)
  _1 * 3

(2, 0) ->
  @assert(_1 != 0, 'Denominator is 0!')
  _0 / _1

(1, 2) ->
 @info('input', _) (@info('input to sin', _0) sin, @info('input to cos', _0) cos)
