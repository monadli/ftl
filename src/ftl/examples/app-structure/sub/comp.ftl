import ftl/lang[+, -, *, <]
import ftl/lang.'?? ::'

fn add(x, y:1, z:3) { return x + y + z }
fn subtract(x, y) { return x - y }
fn x! -> x < 2 ?? 1 :: (x * (x - 1)!)