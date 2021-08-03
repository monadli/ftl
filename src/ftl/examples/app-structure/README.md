# FTL Application Structure

## Example
The `app.ftl` is the main program and some functions are defined in `sub/comp.ftl`. This example is used to illustrate the following content.

## '.ftl' Files
An `FTL` program can be defined in a text file with extension `.ftl`. If the program becomes large, split them into multiple files either in the same directory, or in sub-directories.

## Sections in '.ftl'
An `FTL` file is composed of `imports`, `function definitions` and `application statements`.

## Line Indentation
Statements of all these sections start from a new line without any leading space, and it may span across many lines with each continuation line at least one leading space or tab. In other words, any line starting without leading space or tab will be treated as a new statement. 

## Comments
Two types of comments are supported, either block comments wrapped between `/*` and `*/` and line comments starts with `//`. They are quite similar to the ones in the other languages.

## Import Section

### Import Functions from Standard Modules
Standard modules are defined in `lib/ftl` directory. When importing any module from there, use the following form:
```
import ftl/lang
```
This form will import all functions from `lang.ftl`.

If one prefers to import selected functions, use `[...]` such as:
```
import ftl/lang[+, -, ':: ??', '- ']
```
where the operators `+`, `-`, '`:: ??`', '`- `' are imported from `lang.ftl`. Any unary or n-ary operator needs to be quoted as in the example. Specifically, prefix operator needs to have a space appended, and postfix operator needs to have a space prefixed.

Individual functions or binary operators can be separately imported as well:
```
import ftl/lang.+
import ftl/lang.-
import ftl/lang.':: ??'
import ftl/lang.'- '
```

### Import Functions from Sub-Modules
The difference of importing a local module from importing a standard module is the relative path.

For exampe, in `app.ftl`, import `add` funtion from `comp.ftl` is as follows:
```
import ./sub/comp.add
```

where `./` is prefixed to the path indicating the path relative to the `.ftl` file.

Otherwise, there is no difference from importing standard modules.

## Function/Operator Definitions

Definition of functions/operators starts with keyword `fn`.
 
### Function
A function is declared with name followed by parameter list in a pair of brackets delimited with comma as follows:
```
fn test(p1, p2)
```

### Application
Applciation statements are just tuples piped with mapping operator `->` in between.

## Write and Run Your Own Program
You can write your own program following `app.ftl` and place anywhere and run as follows:
```
node [ftl directory]/ftl-runner.js [your app directory]/app.ftl
```
