import ftl/lang[%, ==]
import ftl/list[>|]

fn is_even(n) -> n % 2 == 0

[1, 2, 3, 4, 5, 6, 7] >| is_even == [2, 4, 6]
