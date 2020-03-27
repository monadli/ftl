import ftl/lang[==, <, -, *, '? :']

// factorial postfix operator
fn x! -> x < 2 ? 1 : (((x - 1)!) * x)

0! == 1
1! == 1
2! == 2
5! == 120
