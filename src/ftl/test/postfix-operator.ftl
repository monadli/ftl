import ftl/lang[==, <, -, *, '?? ::']

// factorial postfix operator
sfn x! -> x < 2 ?? 1 :: (x * (x - 1)!)

0! == 1
1! == 1
2! == 2
5! == 120
