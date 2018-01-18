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
          "=",
          peg$literalExpectation("=", false),
          function(modifier, id, expr) {
              return modifier=='const' ? new ImmutableValFn(id.name, expr) : new VarFn(id.name, expr)
            },
          function(id, params, body) {
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
//                var res = expr.apply()
//                if (res && res instanceof TailFn)
//                  res = res.apply();
//                if (res)
//                  console.log('executable result: ', res)
//                expr.result = res;
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
          "]",
          peg$literalExpectation("]", false),
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
          function() {return text()},
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
          ".",
          peg$literalExpectation(".", false),
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
          peg$decode("%;o/?#;!.\" &\"/1$;o/($8#: #!!)(#'#(\"'#&'#"),
          peg$decode("%;\"/_#$%;n/,#;\"/#$+\")(\"'#&'#06*%;n/,#;\"/#$+\")(\"'#&'#&/)$8\":!\"\"! )(\"'#&'#"),
          peg$decode(";#.) &;$.# &;+"),
          peg$decode("%;J.# &;I/f#;m/]$;A/T$;m/K$2\"\"\"6\"7#/<$;m/3$;,/*$8':$'#&$ )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;F/q#;m/h$;1.) &;A.# &;-/S$;m/J$;%.\" &\"/<$;m/3$;(/*$8':%'#$\" )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%2&\"\"6&7'/N#;m/E$;&.\" &\"/7$2(\"\"6(7)/($8$:*$!!)($'#(#'#(\"'#&'#"),
          peg$decode("%;'/\x8F#$%;m/D#2+\"\"6+7,/5$;m/,$;'/#$+$)($'#(#'#(\"'#&'#0N*%;m/D#2+\"\"6+7,/5$;m/,$;'/#$+$)($'#(#'#(\"'#&'#&/)$8\":-\"\"! )(\"'#&'#"),
          peg$decode("%%;A/;#;m/2$2.\"\"6.7//#$+#)(#'#(\"'#&'#.\" &\"/;#;m/2$;*/)$8#:0#\"\" )(#'#(\"'#&'#"),
          peg$decode(";?.# &;)"),
          peg$decode("%21\"\"6172/C#;m/:$;*/1$;m/($8$:3$!!)($'#(#'#(\"'#&'#"),
          peg$decode("%;4.# &;,/J#%;m/,#;)/#$+\")(\"'#&'#.\" &\"/)$8\":4\"\"! )(\"'#&'#"),
          peg$decode("%;*/' 8!:5!! )"),
          peg$decode(";>.G &;=.A &;A.; &;:.5 &;;./ &;%.) &;8.# &;9"),
          peg$decode("%%<21\"\"6172=.##&&!&'#/B#;O/9$$;O0#*;O&/)$8#:6#\"! )(#'#(\"'#&'#"),
          peg$decode("%;A/' 8!:7!! )"),
          peg$decode("%;A/2#;%/)$8\":8\"\"! )(\"'#&'#"),
          peg$decode(";/.# &;."),
          peg$decode(";2.# &;3"),
          peg$decode("%;0/\x89#$%;m/>#;-/5$;m/,$;0/#$+$)($'#(#'#(\"'#&'#/K#0H*%;m/>#;-/5$;m/,$;0/#$+$)($'#(#'#(\"'#&'#&&&#/)$8\":9\"\"! )(\"'#&'#"),
          peg$decode("%;0/;#;m/2$;-/)$8#::#\"\" )(#'#(\"'#&'#"),
          peg$decode(";5.) &;7.# &;6"),
          peg$decode("%;-/;#;m/2$;,/)$8#:;#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;,/;#;m/2$;-/)$8#:<#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;,/\x89#$%;m/>#;-/5$;m/,$;,/#$+$)($'#(#'#(\"'#&'#/K#0H*%;m/>#;-/5$;m/,$;,/#$+$)($'#(#'#(\"'#&'#&&&#/)$8\":=\"\"! )(\"'#&'#"),
          peg$decode("%2>\"\"6>7?/k#2@\"\"6@7A.R &%;V/H#$;N0#*;N&/8$%<;C=.##&&!&'#/#$+#)(#'#(\"'#&'#/'$8\":B\" )(\"'#&'#"),
          peg$decode("%2C\"\"6C7D/\xC2#$2@\"\"6@7A.R &%;V/H#$;N0#*;N&/8$%<;C=.##&&!&'#/#$+#)(#'#(\"'#&'#/a#0^*2@\"\"6@7A.R &%;V/H#$;N0#*;N&/8$%<;C=.##&&!&'#/#$+#)(#'#(\"'#&'#&&&#/6$2E\"\"6E7F/'$8#:B# )(#'#(\"'#&'#"),
          peg$decode(";G./ &;R.) &;S.# &;\\"),
          peg$decode("%2C\"\"6C7D/X#%;m/,#;</#$+\")(\"'#&'#.\" &\"/7$2E\"\"6E7F/($8#:G#!!)(#'#(\"'#&'#"),
          peg$decode("%;,/\x8F#$%;m/D#2+\"\"6+7,/5$;m/,$;,/#$+$)($'#(#'#(\"'#&'#0N*%;m/D#2+\"\"6+7,/5$;m/,$;,/#$+$)($'#(#'#(\"'#&'#&/)$8\":H\"\"! )(\"'#&'#"),
          peg$decode("%;A/r#;m/i$2C\"\"6C7D/Z$;m/Q$$;&/&#0#*;&&&&#/;$;m/2$2E\"\"6E7F/#$+')(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;A/;#;m/2$;%/)$8#:I#\"\" )(#'#(\"'#&'#"),
          peg$decode("%2J\"\"6J7K/\u0152#;m/\u0149$%$%%<2J\"\"6J7K.) &2L\"\"6L7M=.##&&!&'#/,#;@/#$+\")(\"'#&'#0T*%%<2J\"\"6J7K.) &2L\"\"6L7M=.##&&!&'#/,#;@/#$+\")(\"'#&'#&/& 8!:N! )/\xCC$$;?0#*;?&/\xBC$;m/\xB3$%$%%<2J\"\"6J7K.) &2L\"\"6L7M=.##&&!&'#/,#;@/#$+\")(\"'#&'#0T*%%<2J\"\"6J7K.) &2L\"\"6L7M=.##&&!&'#/,#;@/#$+\")(\"'#&'#&/& 8!:N! )/6$2L\"\"6L7M/'$8':O' )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("1\"\"5!7P"),
          peg$decode("%%<;P=.##&&!&'#/1#;B/($8\":Q\"! )(\"'#&'#"),
          peg$decode("<%;C/9#$;D0#*;D&/)$8\":S\"\"! )(\"'#&'#=.\" 7R"),
          peg$decode(";K.5 &2T\"\"6T7U.) &2>\"\"6>7?"),
          peg$decode(";C.# &;N"),
          peg$decode("2V\"\"6V7W"),
          peg$decode("2X\"\"6X7Y"),
          peg$decode("2Z\"\"6Z7["),
          peg$decode("%2\\\"\"6\\7]/8#%<;C=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2^\"\"6^7_/8#%<;C=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("2`\"\"6`7a"),
          peg$decode(";L.# &;M"),
          peg$decode("4b\"\"5!7c"),
          peg$decode("4d\"\"5!7e"),
          peg$decode("4f\"\"5!7g"),
          peg$decode("4h\"\"5!7i"),
          peg$decode(";Q.) &;G.# &;R"),
          peg$decode(";I.) &;J.# &;F"),
          peg$decode("%;H/& 8!:j! ).. &%;E/& 8!:k! )"),
          peg$decode("%;Z/>#%<;C.# &;N=.##&&!&'#/#$+\")(\"'#&'#.M &%;T/C#%<;C.# &;N=.##&&!&'#/($8\":l\"!!)(\"'#&'#"),
          peg$decode("%;U/T#2m\"\"6m7n/E$$;N0#*;N&/5$;W.\" &\"/'$8$:o$ )($'#(#'#(\"'#&'#.\x91 &%4p\"\"5!7q.\" &\"/Z#2m\"\"6m7n/K$$;N/&#0#*;N&&&#/5$;W.\" &\"/'$8$:o$ )($'#(#'#(\"'#&'#.? &%;U/5#;W.\" &\"/'$8\":o\" )(\"'#&'#"),
          peg$decode("2@\"\"6@7A.Q &%4p\"\"5!7q.\" &\"/<#;V/3$$;N0#*;N&/#$+#)(#'#(\"'#&'#"),
          peg$decode("4r\"\"5!7s"),
          peg$decode("%;X/,#;Y/#$+\")(\"'#&'#"),
          peg$decode("3t\"\"5!7u"),
          peg$decode("%4v\"\"5!7w.\" &\"/9#$;N/&#0#*;N&&&#/#$+\")(\"'#&'#"),
          peg$decode("%3x\"\"5\"7y/@#%$;[/&#0#*;[&&&#/\"!&,)/#$+\")(\"'#&'#"),
          peg$decode("4z\"\"5!7{"),
          peg$decode("%2|\"\"6|7}/G#$;]0#*;]&/7$2|\"\"6|7}/($8#:~#!!)(#'#(\"'#&'#.W &%2\x7F\"\"6\x7F7\x80/G#$;^0#*;^&/7$2\x7F\"\"6\x7F7\x80/($8#:~#!!)(#'#(\"'#&'#"),
          peg$decode("%%<2|\"\"6|7}./ &2\x81\"\"6\x817\x82.# &;f=.##&&!&'#/,#;@/#$+\")(\"'#&'#.B &%2\x81\"\"6\x817\x82/,#;`/#$+\")(\"'#&'#.# &;_"),
          peg$decode("%%<2\x7F\"\"6\x7F7\x80./ &2\x81\"\"6\x817\x82.# &;f=.##&&!&'#/,#;@/#$+\")(\"'#&'#.B &%2\x81\"\"6\x817\x82/,#;`/#$+\")(\"'#&'#.# &;_"),
          peg$decode("%2\x81\"\"6\x817\x82/,#;g/#$+\")(\"'#&'#"),
          peg$decode(";a.N &%2@\"\"6@7A/8#%<;N=.##&&!&'#/#$+\")(\"'#&'#.# &;e"),
          peg$decode(";b.# &;c"),
          peg$decode("2\x7F\"\"6\x7F7\x80.} &2|\"\"6|7}.q &2\x81\"\"6\x817\x82.e &2\x83\"\"6\x837\x84.Y &2\x85\"\"6\x857\x86.M &2\x87\"\"6\x877\x88.A &2\x89\"\"6\x897\x8A.5 &2\x8B\"\"6\x8B7\x8C.) &2\x8D\"\"6\x8D7\x8E"),
          peg$decode("%%<;d.# &;f=.##&&!&'#/,#;@/#$+\")(\"'#&'#"),
          peg$decode(";b.; &;N.5 &2\x8F\"\"6\x8F7\x90.) &2\x91\"\"6\x917\x92"),
          peg$decode("%2\x8F\"\"6\x8F7\x90/F#%%;[/,#;[/#$+\")(\"'#&'#/\"!&,)/#$+\")(\"'#&'#"),
          peg$decode("4\x93\"\"5!7\x94"),
          peg$decode("2\x95\"\"6\x957\x96.5 &2\x97\"\"6\x977\x98.) &2\x99\"\"6\x997\x9A"),
          peg$decode("2\x9B\"\"6\x9B7\x9C.M &2\x9D\"\"6\x9D7\x9E.A &2\x9F\"\"6\x9F7\xA0.5 &2\xA1\"\"6\xA17\xA2.) &2\xA3\"\"6\xA37\xA4"),
          peg$decode("<;k.# &;j=.\" 7\xA5"),
          peg$decode("%2\xA6\"\"6\xA67\xA7/q#$%%<;f=.##&&!&'#/,#;@/#$+\")(\"'#&'#0B*%%<;f=.##&&!&'#/,#;@/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("%2\xA8\"\"6\xA87\xA9/\x8C#$%%<2\xAA\"\"6\xAA7\xAB=.##&&!&'#/,#;@/#$+\")(\"'#&'#0H*%%<2\xAA\"\"6\xAA7\xAB=.##&&!&'#/,#;@/#$+\")(\"'#&'#&/2$2\xAA\"\"6\xAA7\xAB/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\xA8\"\"6\xA87\xA9/\x98#$%%<2\xAA\"\"6\xAA7\xAB.# &;f=.##&&!&'#/,#;@/#$+\")(\"'#&'#0N*%%<2\xAA\"\"6\xAA7\xAB.# &;f=.##&&!&'#/,#;@/#$+\")(\"'#&'#&/2$2\xAA\"\"6\xAA7\xAB/#$+#)(#'#(\"'#&'#"),
          peg$decode("%$;h.# &;i0)*;h.# &;i&/\xA5#$%$;g/&#0#*;g&&&#/E#$;h.# &;i/,#0)*;h.# &;i&&&#/#$+\")(\"'#&'#0\\*%$;g/&#0#*;g&&&#/E#$;h.# &;i/,#0)*;h.# &;i&&&#/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("$%$;h.# &;i0)*;h.# &;i&/,#;g/#$+\")(\"'#&'#/L#0I*%$;h.# &;i0)*;h.# &;i&/,#;g/#$+\")(\"'#&'#&&&#"),
          peg$decode("$;h.) &;g.# &;i0/*;h.) &;g.# &;i&")
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
