## FTL Application Structure

An ftl program can be defined in a ftl file. If the program becomes large, split them into multiple files either in the same directory, or in sub-directories.

An ftl file is composed of imports, function definitions and application statements.

Statements of all these sections starts each line without space, and it it continues, the continued lines have to start with any space or tab. Otherwise it will be treated as a new statement.

Two types of comments are supported, either block comments wrapped with `/*` and `*/` and line comments starts with `//`. They are quite similar to the ones in the other languages.

### Example
The `app.ftl` is the main program and some functions are defined in `sub/comp.ftl`.

### Import section

#### Import functions from standard modules
Standard modules are defined in `lib\ftl` directory. When importing any module from there, use the following form:
```
import ftl/lang[+, -, ':: ??', '- ']
```
where the operators `+`, `-`, '`:: ??`', '`- `' are imported from `lang.ftl`. Any unary or n-ary operator needs to be quoted as in the example.

Individual functions or binary operators can be separately imported as well:
```
import ftl/lang.+
import ftl/lang.-
import ftl/lang.':: ??'
import ftl/lang.'- '
```

If all functions need to be imported, simply use wildcard *:
```
import ftl/lang.*
```

This also means that if you want to import an operator named as `*`, you may have to import it as:
```
import ftl/lang[*]
```

### Import functions from sub modules
The difference of importing a local module from importing a standard module is the relative path.

For exampe, in app.ftl, import `add` funtion from `comp.ftl` is as follows:
```
import ./sub/comp.add
```

where `./` is prefixed to the path indicating the path relative to the `ftl` file.

If multiple functions need to be imported, do it as follows:
```
import ./sub/comp[add, subtract]
```

Or
```
import ./sub/comp.*
```

### Function/operator definitions

Definition of functions/operators starts with keyword `fn`.
 
#### Function
A function is declared with name followed by parameter list with parameter names separated with comma and wrapped with brackets.

For example:
```
fn test(p1, p2)
```


### Run your program
```
node [ftl directory]/ftl-runner.js [your app directory]/app.ftl
```
