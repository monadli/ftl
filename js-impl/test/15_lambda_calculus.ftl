fn x * y {
  return x * y
}

// expression x * y * z with (1, 2, 3) as (x, y, z)
(1, 2, 3) -> (x:_0, y:_1, z:_2) -> x * y * z

// rewrite of computation of x * y * z using lambda calculus form
// by passing x to yield [1] * y * z
// and then pass y to yield [1] * [2] * z
// and then pass x to yield full computation result 
(1, 2, 3) -> (p_x:(x:_0) -> x * y * z, y:_1, z:_2) -> (p_xy: p_x(y:y), z:z) -> (p_xy(z:z))

// even simpler rewrite
(1, 2, 3) -> ((x:_0) -> x * y * z, _1, _2) -> (_0(y:_1), _2) -> (_0(z:_1))
