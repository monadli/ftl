// Import expression starts with the key word "import"
// Import expression can be used to import functions from libraries
// or from application modules.

// Libraries are modules in a special location "lib".
// Currently the following three are defined there:
//
//     ftl/lang.ftl
//     ftl/math.ftl
//     ftl/list.ftl
//
// Any standalone modules can be added into lib.

// When importing anything from library module, just refer to the module path and name as:
import ftl/list

// The above imports all functions from list.

// Functions can be individually imported as well:
import ftl/lang

// The above imports just the multiplication operator "*" from lang.

// Importing multiple functions/operators from the same module can be done in multiple import statements
// with each just importing one of them.

// Importing multiple functions/operators can alo be done with ome import as follows:
import ftl/lang[+, -, /, >]
import ftl/math[sin, cos]

// When importing unary or n-ary operatos, however, the operator has to be quoted.
// For prefix operator, append one space after it, and for postfix operator, prepend
// one space in front of it:
import ftl/lang['- ', '? :']

(-3.14 -> sin > 0) ? 1 : 0




