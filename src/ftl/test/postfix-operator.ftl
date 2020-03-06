import ftl/lang[==, <, -, *, '? :']

// factorialmpostfix operator
fn x! -> x < 2 ? 1 : (((x - 1)!) * x)

0! == 1