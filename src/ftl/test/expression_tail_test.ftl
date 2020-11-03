import ftl/lang[==, <, '?? ::']

// This is an example explaining why in ExecutableFn,
// return value needs to be checked against
// TailFn and then Fn.
//
// This expression returns a tail
//
//   3 < 2 ?? false :: true
//
// which needs to be further computed.
//
// In the end a ConstFn(true) is returned from the last tail
// which further needs to be computed.
2 < 1 ?? false :: (3 < 2 ?? false :: true)
