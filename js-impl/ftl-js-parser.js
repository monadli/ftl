ftl_js_parser = /*
 * Generated by PEG.js 0.10.0.
 *
 * http://pegjs.org/
 */
(function() {
  "use strict";

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  peg$SyntaxError.buildMessage = function(expected, found) {
    var DESCRIBE_EXPECTATION_FNS = {
          literal: function(expectation) {
            return "\"" + literalEscape(expectation.text) + "\"";
          },

          "class": function(expectation) {
            var escapedParts = "",
                i;

            for (i = 0; i < expectation.parts.length; i++) {
              escapedParts += expectation.parts[i] instanceof Array
                ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
                : classEscape(expectation.parts[i]);
            }

            return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
          },

          any: function(expectation) {
            return "any character";
          },

          end: function(expectation) {
            return "end of input";
          },

          other: function(expectation) {
            return expectation.description;
          }
        };

    function hex(ch) {
      return ch.charCodeAt(0).toString(16).toUpperCase();
    }

    function literalEscape(s) {
      return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g,  '\\"')
        .replace(/\0/g, '\\0')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
        .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
    }

    function classEscape(s) {
      return s
        .replace(/\\/g, '\\\\')
        .replace(/\]/g, '\\]')
        .replace(/\^/g, '\\^')
        .replace(/-/g,  '\\-')
        .replace(/\0/g, '\\0')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
        .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
    }

    function describeExpectation(expectation) {
      return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
    }

    function describeExpected(expected) {
      var descriptions = new Array(expected.length),
          i, j;

      for (i = 0; i < expected.length; i++) {
        descriptions[i] = describeExpectation(expected[i]);
      }

      descriptions.sort();

      if (descriptions.length > 0) {
        for (i = 1, j = 1; i < descriptions.length; i++) {
          if (descriptions[i - 1] !== descriptions[i]) {
            descriptions[j] = descriptions[i];
            j++;
          }
        }
        descriptions.length = j;
      }

      switch (descriptions.length) {
        case 1:
          return descriptions[0];

        case 2:
          return descriptions[0] + " or " + descriptions[1];

        default:
          return descriptions.slice(0, -1).join(", ")
            + ", or "
            + descriptions[descriptions.length - 1];
      }
    }

    function describeFound(found) {
      return found ? "\"" + literalEscape(found) + "\"" : "end of input";
    }

    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
  };

  function peg$parse(input, options) {
    options = options !== void 0 ? options : {};

    var peg$FAILED = {},

        peg$startRuleIndices = { Start: 0 },
        peg$startRuleIndex   = 0,

        peg$consts = [
          function(program) { return program },
          function(first, rest) {
              return buildList(first, rest, 1)
            },
          "import",
          peg$literalExpectation("import", false),
          ".",
          peg$literalExpectation(".", false),
          function() {return text()},
          "*",
          peg$literalExpectation("*", false),
          function(path) { return text()},
          "as",
          peg$literalExpectation("as", false),
          function(path, id) {return text()},
          function(path, id, as) { ftl.import_statement(path, id, extractOptional(as, 3))},
          "=",
          peg$literalExpectation("=", false),
          function(modifier, id, expr) {
              return modifier=='const' ? new ImmutableValFn(id.name, expr) : new VarFn(id.name, expr)
            },
          function(id, params, body) {

              // FunctionDeclaration

              console.log('function id: ', id.name)
              console.log('expr: ', body)

              var is_operator = id.type == 'OperatorDeclaration' || id.type == 'PostfixOperatorDeclaration';
              if (is_operator)
              	console.log('parameter list from operator: ', id.operands)
            	console.log('parameter list from function: ', optionalList(params))

              var param_list = is_operator ? id.operands : optionalList(params);
              console.log('parameter list: ', param_list)
              var name = id.name
              var ret = body.script ? new NativeFunctionFn(name, param_list, body.script) :
                  new FunctionFn(name, param_list, body);

              functions[name] = ret;
              return ret;
            },
          "(",
          peg$literalExpectation("(", false),
          ")",
          peg$literalExpectation(")", false),
          function(elms) { return TupleFn.createTupleFn(elms) },
          ",",
          peg$literalExpectation(",", false),
          function(first, rest) {
              console.log("first", first);console.log("rest", rest);
              console.log("param list:", buildList(first, rest, 3));
              return buildList(first, rest, 3) },
          ":",
          peg$literalExpectation(":", false),
          function(id, expr) {
                var iid = extractOptional(id, 0);
                if (iid != null)
                  iid = iid.name;
                if (iid == null)
                  return expr;
                return new ExprFn(iid, expr)
              },
          "->",
          peg$literalExpectation("->", false),
          function(ex) { return ex },
          function(first, rest) {
              console.log("first is ", first)
              var t = extractOptional(rest, 1);
              if (rest)
                console.log("rest is ", t)
              if (t == null)
                return first;
              
              return CompositionFn.createCompositionFn(first, t);
            },
          function(expr) {
                executables.push(expr);
                return expr
              },
          function(first, rest) { return text() },
          function(id) { id.setAsValueType(); return id },
          function(id, params) {
                id.setAsRefType();
                id.params = params;
                return id
              },
          function(first, rest) {
                var ops = extractList(rest, 1);
                var name = ops.length == 1 ? ops[0] : ops.join(' ');
                console.log("operators in operator declaration:", ops)
                var operands = [first].concat(extractList(rest, 3))
                console.log("operands in operator declaration:", operands)
                return {
                  type: 'OperatorDeclaration',
                  name: name,
                  operands: TupleFn.createTupleFn(operands)
                }
              },
          function(operand, op) {
              console.log('PostfixOperatorDeclaration begin')
                return {
                  type: 'PostfixOperatorDeclaration',
                  name: op,
                  operands: operand
                }
            },
          function(op, expr) {
                console.log('op', op)
                console.log('expr', expr)
                if (op == '-' && expr instanceof ConstFn)
                  return new ConstFn(-1 * expr.value);
                return CompositionFn.createCompositionFn(expr, functions[op.name]);
              },
          function(expr, op) {
                console.log('PostfixOperatorExpression: op', op)
                console.log('PostfixOperatorExpression: expr', expr)
                if (op == '-' && expr instanceof ConstFn)
                  return new ConstFn(-1 * expr.value);
                var op_fn = functions[op];
                if (!op_fn)
                  op_fn = new RefFn(op);
                return CompositionFn.createCompositionFn(expr, op_fn);
            },
          function(operand, rest) {
            
                var current_index = 0;
                var stop_index = 0;
                var parse_operators = function(ops, operands, index, full) {
                  var op = index == 1 ? ops[0] : ops.slice(0, index).join(' ')
             	    var f = functions[op];

                  // no corresponding function found for single op
            	    if (!f) {
            	      if (index == 1)
            	        throw new Error("No function with name '" + op + "' found!");

                    index--;
                    var reduced = parse_operators(ops, operands, index, false);
                    
                    if (current_index == stop_index)
                      return reduced;

                    ops = ops.slice(index, ops.length)
                    operands = [reduced].concat(operands.slice(index + 1, operands.length))
                    return parse_operators(ops, operands, ops.length, true)
            	    }

            	    for (var i = 0; i < f.params.length; i++) {
            	      if (f.params[i] instanceof RefFn && f.params[i].isRefType()) {
            	        operands[i] = new ExprRefFn(operands[i], f.params[i].params, f.params[i].isTail());
            	      }
                  }

                  current_index += index;
                  return CompositionFn.createCompositionFn(TupleFn.createTupleFn(operands.slice(0, f.params.length)), f);
                }

            	  var ops = extractList(rest, 1);
            	  var params = [operand].concat(extractList(rest, 3));
            	  if (ops.length == 0)
            	    throw new Error('No ops found!')
                console.log('ops:', ops)
            	  console.log('operands', params)
            	  stop_index = ops.length;
            	  return parse_operators(ops, params, ops.length, true);
            },
          "_",
          peg$literalExpectation("_", false),
          "0",
          peg$literalExpectation("0", false),
          function() { return new RefFn(text()) },
          "[",
          peg$literalExpectation("[", false),
          function(id) {return text()},
          "]",
          peg$literalExpectation("]", false),
          function(id, index) {
              console.log('got ArrayElementSelector', index);
              return new ArrayElementSelectorFn(id, index);
            },
          function(elms) {
              var lst = extractOptional(elms, 1);
              return lst == null ? new ConstFn([]) : lst
            },
          function(first, rest) {
              var elms = buildList(first, rest, 3);
              var ret = [];
              for (var i = 0; i < elms.length; i++)
                ret.push(elms[i].value);
              return new ConstFn(ret)
            },
          function(id, params) {

              // CallExpression

              var f = functions[id.name];
              if (f) {
                var f_params = f.params;
                if (!Array.isArray(f_params)) {
                  if (f_params instanceof TupleFn) {
                    f_params = f_params.list
                  } else
                    f_params = [f_params]
                }
                
                var params_len = f_params.length;
                for (var i = 0; i < f_params.length; i++) {
                  var p = f_params[i];
                  if (p instanceof ExprFn && !p.hasRef())
                    params_len--;
                }
                var param_list = params.apply();
                var actual_params_len = param_list instanceof Tuple ? param_list.size: 1;

                if (actual_params_len >= params_len) {
                  return new CompositionFn([params, f])
                }
                return new PartialFunctionFn(f, param_list);
              }

              else {
                id.params = params;
                return id;
              }
            },
          "{",
          peg$literalExpectation("{", false),
          "}",
          peg$literalExpectation("}", false),
          function() {return {type:'native', script: text()}},
          peg$anyExpectation(),
          function(name) {return new RefFn(name)},
          peg$otherExpectation("identifier"),
          function(first, rest) {return first + rest.join("")},
          "$",
          peg$literalExpectation("$", false),
          "false",
          peg$literalExpectation("false", false),
          "fn",
          peg$literalExpectation("fn", false),
          "null",
          peg$literalExpectation("null", false),
          "true",
          peg$literalExpectation("true", false),
          "var",
          peg$literalExpectation("var", false),
          "const",
          peg$literalExpectation("const", false),
          /^[A-Z]/,
          peg$classExpectation([["A", "Z"]], false, false),
          /^[a-z]/,
          peg$classExpectation([["a", "z"]], false, false),
          /^[0-9]/,
          peg$classExpectation([["0", "9"]], false, false),
          /^[!%&*+\-.\/:<=>?\^|\xD7\xF7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283]/,
          peg$classExpectation(["!", "%", "&", "*", "+", "-", ".", "/", ":", "<", "=", ">", "?", "^", "|", "\xD7", "\xF7", "\u220F", "\u2211", "\u2215", "\u2217", "\u2219", "\u221A", "\u221B", "\u221C", "\u2227", "\u2228", "\u2229", "\u222A", "\u223C", "\u2264", "\u2265", "\u2282", "\u2283"], false, false),
          function() { return new ConstFn(true) },
          function() { return new ConstFn(false) },
          function(literal) { return literal },
          function() {
                return new ConstFn(parseFloat(text()));
              },
          /^[\-]/,
          peg$classExpectation(["-"], false, false),
          /^[1-9]/,
          peg$classExpectation([["1", "9"]], false, false),
          "e",
          peg$literalExpectation("e", true),
          /^[+\-]/,
          peg$classExpectation(["+", "-"], false, false),
          "0x",
          peg$literalExpectation("0x", true),
          /^[0-9a-f]/i,
          peg$classExpectation([["0", "9"], ["a", "f"]], false, true),
          "\"",
          peg$literalExpectation("\"", false),
          function(chars) { var str = text(); return new ConstFn(str.substr(1, str.length - 2)) },
          "'",
          peg$literalExpectation("'", false),
          "\\",
          peg$literalExpectation("\\", false),
          "b",
          peg$literalExpectation("b", false),
          "f",
          peg$literalExpectation("f", false),
          "n",
          peg$literalExpectation("n", false),
          "r",
          peg$literalExpectation("r", false),
          "t",
          peg$literalExpectation("t", false),
          "v",
          peg$literalExpectation("v", false),
          "x",
          peg$literalExpectation("x", false),
          "u",
          peg$literalExpectation("u", false),
          /^[\n\r]/,
          peg$classExpectation(["\n", "\r"], false, false),
          "\n",
          peg$literalExpectation("\n", false),
          "\r\n",
          peg$literalExpectation("\r\n", false),
          "\r",
          peg$literalExpectation("\r", false),
          "\t",
          peg$literalExpectation("\t", false),
          "\x0B",
          peg$literalExpectation("\x0B", false),
          "\f",
          peg$literalExpectation("\f", false),
          " ",
          peg$literalExpectation(" ", false),
          "\xA0",
          peg$literalExpectation("\xA0", false),
          peg$otherExpectation("comment"),
          "//",
          peg$literalExpectation("//", false),
          "/*",
          peg$literalExpectation("/*", false),
          "*/",
          peg$literalExpectation("*/", false)
        ],

        peg$bytecode = [
          peg$decode("%;p/?#;!.\" &\"/1$;p/($8#: #!!)(#'#(\"'#&'#"),
          peg$decode("%;\"/_#$%;o/,#;\"/#$+\")(\"'#&'#06*%;o/,#;\"/#$+\")(\"'#&'#&/)$8\":!\"\"! )(\"'#&'#"),
          peg$decode(";#./ &;$.) &;%.# &;,"),
          peg$decode("%2\"\"\"6\"7#/\xF3#;n/\xEA$%$%;B/2#2$\"\"6$7%/#$+\")(\"'#&'#0<*%;B/2#2$\"\"6$7%/#$+\")(\"'#&'#&/& 8!:&! )/\x9D$2'\"\"6'7(.5 &;B./ &%;./' 8!:)!!\")/v$%;n/W#2*\"\"6*7+/H$;n/?$;B.0 &%;./( 8!:,!\"'&)/#$+$)($'#(#'#(\"'#&'#.\" &\"/*$8%:-%#\"! )(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;K.# &;J/f#;n/]$;B/T$;n/K$2.\"\"6.7//<$;n/3$;-/*$8':0'#&$ )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;G/q#;n/h$;2.) &;B.# &;./S$;n/J$;&.\" &\"/<$;n/3$;)/*$8':1'#$\" )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%22\"\"6273/N#;n/E$;'.\" &\"/7$24\"\"6475/($8$:6$!!)($'#(#'#(\"'#&'#"),
          peg$decode("%;(/\x8F#$%;n/D#27\"\"6778/5$;n/,$;(/#$+$)($'#(#'#(\"'#&'#0N*%;n/D#27\"\"6778/5$;n/,$;(/#$+$)($'#(#'#(\"'#&'#&/)$8\":9\"\"! )(\"'#&'#"),
          peg$decode("%%;B/;#;n/2$2:\"\"6:7;/#$+#)(#'#(\"'#&'#.\" &\"/;#;n/2$;+/)$8#:<#\"\" )(#'#(\"'#&'#"),
          peg$decode(";@.# &;*"),
          peg$decode("%2=\"\"6=7>/C#;n/:$;+/1$;n/($8$:?$!!)($'#(#'#(\"'#&'#"),
          peg$decode("%;5.# &;-/J#%;n/,#;*/#$+\")(\"'#&'#.\" &\"/)$8\":@\"\"! )(\"'#&'#"),
          peg$decode("%;+/' 8!:A!! )"),
          peg$decode(";:.G &;?.A &;>.; &;B.5 &;;./ &;<.) &;&.# &;9"),
          peg$decode("%%<2=\"\"6=7>=.##&&!&'#/B#;P/9$$;P0#*;P&/)$8#:B#\"! )(#'#(\"'#&'#"),
          peg$decode("%;B/' 8!:C!! )"),
          peg$decode("%;B/2#;&/)$8\":D\"\"! )(\"'#&'#"),
          peg$decode(";0.# &;/"),
          peg$decode(";3.# &;4"),
          peg$decode("%;1/\x89#$%;n/>#;./5$;n/,$;1/#$+$)($'#(#'#(\"'#&'#/K#0H*%;n/>#;./5$;n/,$;1/#$+$)($'#(#'#(\"'#&'#&&&#/)$8\":E\"\"! )(\"'#&'#"),
          peg$decode("%;1/;#;n/2$;./)$8#:F#\"\" )(#'#(\"'#&'#"),
          peg$decode(";6.) &;8.# &;7"),
          peg$decode("%;./;#;n/2$;-/)$8#:G#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;-/;#;n/2$;./)$8#:H#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;-/\x89#$%;n/>#;./5$;n/,$;-/#$+$)($'#(#'#(\"'#&'#/K#0H*%;n/>#;./5$;n/,$;-/#$+$)($'#(#'#(\"'#&'#&&&#/)$8\":I\"\"! )(\"'#&'#"),
          peg$decode("%2J\"\"6J7K/k#2L\"\"6L7M.R &%;W/H#$;O0#*;O&/8$%<;D=.##&&!&'#/#$+#)(#'#(\"'#&'#/'$8\":N\" )(\"'#&'#"),
          peg$decode("%;B/\x93#;n/\x8A$2O\"\"6O7P/{$2L\"\"6L7M.H &%;W/8#$;O0#*;O&/($8\":Q\"!%)(\"'#&'#.# &;B/A$;n/8$2R\"\"6R7S/)$8&:T&\"%\")(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode(";H./ &;S.) &;T.# &;]"),
          peg$decode("%2O\"\"6O7P/X#%;n/,#;=/#$+\")(\"'#&'#.\" &\"/7$2R\"\"6R7S/($8#:U#!!)(#'#(\"'#&'#"),
          peg$decode("%;-/\x8F#$%;n/D#27\"\"6778/5$;n/,$;-/#$+$)($'#(#'#(\"'#&'#0N*%;n/D#27\"\"6778/5$;n/,$;-/#$+$)($'#(#'#(\"'#&'#&/)$8\":V\"\"! )(\"'#&'#"),
          peg$decode("%;B/r#;n/i$2O\"\"6O7P/Z$;n/Q$$;'/&#0#*;'&&&#/;$;n/2$2R\"\"6R7S/#$+')(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;B/;#;n/2$;&/)$8#:W#\"\" )(#'#(\"'#&'#"),
          peg$decode("%2X\"\"6X7Y/\u0152#;n/\u0149$%$%%<2X\"\"6X7Y.) &2Z\"\"6Z7[=.##&&!&'#/,#;A/#$+\")(\"'#&'#0T*%%<2X\"\"6X7Y.) &2Z\"\"6Z7[=.##&&!&'#/,#;A/#$+\")(\"'#&'#&/& 8!:&! )/\xCC$$;@0#*;@&/\xBC$;n/\xB3$%$%%<2X\"\"6X7Y.) &2Z\"\"6Z7[=.##&&!&'#/,#;A/#$+\")(\"'#&'#0T*%%<2X\"\"6X7Y.) &2Z\"\"6Z7[=.##&&!&'#/,#;A/#$+\")(\"'#&'#&/& 8!:&! )/6$2Z\"\"6Z7[/'$8':\\' )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("1\"\"5!7]"),
          peg$decode("%%<;Q=.##&&!&'#/1#;C/($8\":^\"! )(\"'#&'#"),
          peg$decode("<%;D/9#$;E0#*;E&/)$8\":`\"\"! )(\"'#&'#=.\" 7_"),
          peg$decode(";L.5 &2a\"\"6a7b.) &2J\"\"6J7K"),
          peg$decode(";D.# &;O"),
          peg$decode("2c\"\"6c7d"),
          peg$decode("2e\"\"6e7f"),
          peg$decode("2g\"\"6g7h"),
          peg$decode("%2i\"\"6i7j/8#%<;D=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2k\"\"6k7l/8#%<;D=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("2m\"\"6m7n"),
          peg$decode(";M.# &;N"),
          peg$decode("4o\"\"5!7p"),
          peg$decode("4q\"\"5!7r"),
          peg$decode("4s\"\"5!7t"),
          peg$decode("4u\"\"5!7v"),
          peg$decode(";R.) &;H.# &;S"),
          peg$decode(";J.) &;K.# &;G"),
          peg$decode("%;I/& 8!:w! ).. &%;F/& 8!:x! )"),
          peg$decode("%;[/>#%<;D.# &;O=.##&&!&'#/#$+\")(\"'#&'#.M &%;U/C#%<;D.# &;O=.##&&!&'#/($8\":y\"!!)(\"'#&'#"),
          peg$decode("%;V/T#2$\"\"6$7%/E$$;O0#*;O&/5$;X.\" &\"/'$8$:z$ )($'#(#'#(\"'#&'#.\x91 &%4{\"\"5!7|.\" &\"/Z#2$\"\"6$7%/K$$;O/&#0#*;O&&&#/5$;X.\" &\"/'$8$:z$ )($'#(#'#(\"'#&'#.? &%;V/5#;X.\" &\"/'$8\":z\" )(\"'#&'#"),
          peg$decode("2L\"\"6L7M.Q &%4{\"\"5!7|.\" &\"/<#;W/3$$;O0#*;O&/#$+#)(#'#(\"'#&'#"),
          peg$decode("4}\"\"5!7~"),
          peg$decode("%;Y/,#;Z/#$+\")(\"'#&'#"),
          peg$decode("3\x7F\"\"5!7\x80"),
          peg$decode("%4\x81\"\"5!7\x82.\" &\"/9#$;O/&#0#*;O&&&#/#$+\")(\"'#&'#"),
          peg$decode("%3\x83\"\"5\"7\x84/@#%$;\\/&#0#*;\\&&&#/\"!&,)/#$+\")(\"'#&'#"),
          peg$decode("4\x85\"\"5!7\x86"),
          peg$decode("%2\x87\"\"6\x877\x88/G#$;^0#*;^&/7$2\x87\"\"6\x877\x88/($8#:\x89#!!)(#'#(\"'#&'#.W &%2\x8A\"\"6\x8A7\x8B/G#$;_0#*;_&/7$2\x8A\"\"6\x8A7\x8B/($8#:\x89#!!)(#'#(\"'#&'#"),
          peg$decode("%%<2\x87\"\"6\x877\x88./ &2\x8C\"\"6\x8C7\x8D.# &;g=.##&&!&'#/,#;A/#$+\")(\"'#&'#.B &%2\x8C\"\"6\x8C7\x8D/,#;a/#$+\")(\"'#&'#.# &;`"),
          peg$decode("%%<2\x8A\"\"6\x8A7\x8B./ &2\x8C\"\"6\x8C7\x8D.# &;g=.##&&!&'#/,#;A/#$+\")(\"'#&'#.B &%2\x8C\"\"6\x8C7\x8D/,#;a/#$+\")(\"'#&'#.# &;`"),
          peg$decode("%2\x8C\"\"6\x8C7\x8D/,#;h/#$+\")(\"'#&'#"),
          peg$decode(";b.N &%2L\"\"6L7M/8#%<;O=.##&&!&'#/#$+\")(\"'#&'#.# &;f"),
          peg$decode(";c.# &;d"),
          peg$decode("2\x8A\"\"6\x8A7\x8B.} &2\x87\"\"6\x877\x88.q &2\x8C\"\"6\x8C7\x8D.e &2\x8E\"\"6\x8E7\x8F.Y &2\x90\"\"6\x907\x91.M &2\x92\"\"6\x927\x93.A &2\x94\"\"6\x947\x95.5 &2\x96\"\"6\x967\x97.) &2\x98\"\"6\x987\x99"),
          peg$decode("%%<;e.# &;g=.##&&!&'#/,#;A/#$+\")(\"'#&'#"),
          peg$decode(";c.; &;O.5 &2\x9A\"\"6\x9A7\x9B.) &2\x9C\"\"6\x9C7\x9D"),
          peg$decode("%2\x9A\"\"6\x9A7\x9B/F#%%;\\/,#;\\/#$+\")(\"'#&'#/\"!&,)/#$+\")(\"'#&'#"),
          peg$decode("4\x9E\"\"5!7\x9F"),
          peg$decode("2\xA0\"\"6\xA07\xA1.5 &2\xA2\"\"6\xA27\xA3.) &2\xA4\"\"6\xA47\xA5"),
          peg$decode("2\xA6\"\"6\xA67\xA7.M &2\xA8\"\"6\xA87\xA9.A &2\xAA\"\"6\xAA7\xAB.5 &2\xAC\"\"6\xAC7\xAD.) &2\xAE\"\"6\xAE7\xAF"),
          peg$decode("<;l.# &;k=.\" 7\xB0"),
          peg$decode("%2\xB1\"\"6\xB17\xB2/q#$%%<;g=.##&&!&'#/,#;A/#$+\")(\"'#&'#0B*%%<;g=.##&&!&'#/,#;A/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("%2\xB3\"\"6\xB37\xB4/\x8C#$%%<2\xB5\"\"6\xB57\xB6=.##&&!&'#/,#;A/#$+\")(\"'#&'#0H*%%<2\xB5\"\"6\xB57\xB6=.##&&!&'#/,#;A/#$+\")(\"'#&'#&/2$2\xB5\"\"6\xB57\xB6/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\xB3\"\"6\xB37\xB4/\x98#$%%<2\xB5\"\"6\xB57\xB6.# &;g=.##&&!&'#/,#;A/#$+\")(\"'#&'#0N*%%<2\xB5\"\"6\xB57\xB6.# &;g=.##&&!&'#/,#;A/#$+\")(\"'#&'#&/2$2\xB5\"\"6\xB57\xB6/#$+#)(#'#(\"'#&'#"),
          peg$decode("%$;i.# &;j0)*;i.# &;j&/\xA5#$%$;h/&#0#*;h&&&#/E#$;i.# &;j/,#0)*;i.# &;j&&&#/#$+\")(\"'#&'#0\\*%$;h/&#0#*;h&&&#/E#$;i.# &;j/,#0)*;i.# &;j&&&#/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("$%$;i.# &;j0)*;i.# &;j&/,#;h/#$+\")(\"'#&'#/L#0I*%$;i.# &;j0)*;i.# &;j&/,#;h/#$+\")(\"'#&'#&&&#"),
          peg$decode("$;i.) &;h.# &;j0/*;i.) &;h.# &;j&")
        ],

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1 }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleIndices)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleIndex = peg$startRuleIndices[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description, location) {
      location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

      throw peg$buildStructuredError(
        [peg$otherExpectation(description)],
        input.substring(peg$savedPos, peg$currPos),
        location
      );
    }

    function error(message, location) {
      location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

      throw peg$buildSimpleError(message, location);
    }

    function peg$literalExpectation(text, ignoreCase) {
      return { type: "literal", text: text, ignoreCase: ignoreCase };
    }

    function peg$classExpectation(parts, inverted, ignoreCase) {
      return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
    }

    function peg$anyExpectation() {
      return { type: "any" };
    }

    function peg$endExpectation() {
      return { type: "end" };
    }

    function peg$otherExpectation(description) {
      return { type: "other", description: description };
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos], p;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column
        };

        while (p < pos) {
          if (input.charCodeAt(p) === 10) {
            details.line++;
            details.column = 1;
          } else {
            details.column++;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildSimpleError(message, location) {
      return new peg$SyntaxError(message, null, null, location);
    }

    function peg$buildStructuredError(expected, found, location) {
      return new peg$SyntaxError(
        peg$SyntaxError.buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$decode(s) {
      var bc = new Array(s.length), i;

      for (i = 0; i < s.length; i++) {
        bc[i] = s.charCodeAt(i) - 32;
      }

      return bc;
    }

    function peg$parseRule(index) {
      var bc    = peg$bytecode[index],
          ip    = 0,
          ips   = [],
          end   = bc.length,
          ends  = [],
          stack = [],
          params, i;

      while (true) {
        while (ip < end) {
          switch (bc[ip]) {
            case 0:
              stack.push(peg$consts[bc[ip + 1]]);
              ip += 2;
              break;

            case 1:
              stack.push(void 0);
              ip++;
              break;

            case 2:
              stack.push(null);
              ip++;
              break;

            case 3:
              stack.push(peg$FAILED);
              ip++;
              break;

            case 4:
              stack.push([]);
              ip++;
              break;

            case 5:
              stack.push(peg$currPos);
              ip++;
              break;

            case 6:
              stack.pop();
              ip++;
              break;

            case 7:
              peg$currPos = stack.pop();
              ip++;
              break;

            case 8:
              stack.length -= bc[ip + 1];
              ip += 2;
              break;

            case 9:
              stack.splice(-2, 1);
              ip++;
              break;

            case 10:
              stack[stack.length - 2].push(stack.pop());
              ip++;
              break;

            case 11:
              stack.push(stack.splice(stack.length - bc[ip + 1], bc[ip + 1]));
              ip += 2;
              break;

            case 12:
              stack.push(input.substring(stack.pop(), peg$currPos));
              ip++;
              break;

            case 13:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1]) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 14:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] === peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 15:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] !== peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 16:
              if (stack[stack.length - 1] !== peg$FAILED) {
                ends.push(end);
                ips.push(ip);

                end = ip + 2 + bc[ip + 1];
                ip += 2;
              } else {
                ip += 2 + bc[ip + 1];
              }

              break;

            case 17:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (input.length > peg$currPos) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 18:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length) === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 19:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length).toLowerCase() === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 20:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (peg$consts[bc[ip + 1]].test(input.charAt(peg$currPos))) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 21:
              stack.push(input.substr(peg$currPos, bc[ip + 1]));
              peg$currPos += bc[ip + 1];
              ip += 2;
              break;

            case 22:
              stack.push(peg$consts[bc[ip + 1]]);
              peg$currPos += peg$consts[bc[ip + 1]].length;
              ip += 2;
              break;

            case 23:
              stack.push(peg$FAILED);
              if (peg$silentFails === 0) {
                peg$fail(peg$consts[bc[ip + 1]]);
              }
              ip += 2;
              break;

            case 24:
              peg$savedPos = stack[stack.length - 1 - bc[ip + 1]];
              ip += 2;
              break;

            case 25:
              peg$savedPos = peg$currPos;
              ip++;
              break;

            case 26:
              params = bc.slice(ip + 4, ip + 4 + bc[ip + 3]);
              for (i = 0; i < bc[ip + 3]; i++) {
                params[i] = stack[stack.length - 1 - params[i]];
              }

              stack.splice(
                stack.length - bc[ip + 2],
                bc[ip + 2],
                peg$consts[bc[ip + 1]].apply(null, params)
              );

              ip += 4 + bc[ip + 3];
              break;

            case 27:
              stack.push(peg$parseRule(bc[ip + 1]));
              ip += 2;
              break;

            case 28:
              peg$silentFails++;
              ip++;
              break;

            case 29:
              peg$silentFails--;
              ip++;
              break;

            default:
              throw new Error("Invalid opcode: " + bc[ip] + ".");
          }
        }

        if (ends.length > 0) {
          end = ends.pop();
          ip = ips.pop();
        } else {
          break;
        }
      }

      return stack[0];
    }


    // The following functions are used for parsing
    function join(value) {
      if (Array.isArray(value))
        return value.join("")
      return value
    }

    function extractOptional(optional, index) {
      return optional ? optional[index] : null;
    }

    function extractList(list, index) {
      var result = new Array(list.length), i;

      for (i = 0; i < list.length; i++) {
        result[i] = list[i][index];
      }

      return result;
    }

    function buildList(first, rest, index) {
      return [first].concat(extractList(rest, index));
    }

    function optionalList(value) {
      return value !== null ? value : [];
    }

    function buildFirstRest(first, rest) {
      return (Array.isArray(rest) && rest.length == 0) ? first : buildList(first, rest, 1)
    }

    peg$result = peg$parseRule(peg$startRuleIndex);

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail(peg$endExpectation());
      }

      throw peg$buildStructuredError(
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();
