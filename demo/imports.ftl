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
import ftl/list.*

// The wildcard "*" means importing all.

// Functions can be individually imported as well:
import ftl/lang[*]

// The "*" above is actually multiplication operator which can be explicitly imported as above.

// Import different functions from the same module can be done in multiple import statements.

// When importing multiple binary operator or functions, use comma to separete them:
import ftl/lang[+, -, /, >]
import ftl/math[sin, cos]

// When importing unary or n-ary operatos, however, the operator has to be quoted.
// For prefix operator, append one space after it, and for postfix operator, prepend
// one space in front of it:
import ftl/lang['- ', '? :']

(-3.14 -> sin > 0) ? 1 : 0




