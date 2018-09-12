ftl.parser = /*
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
          function() { return text() },
          function(module_name) {
              console.log("module name: '" + module_name + "'");
              module.name = module_name;
            },
          ".",
          peg$literalExpectation(".", false),
          function(first, rest) {
              return buildList(first, rest, 1)
            },
          function(importItems) {
                console.log(importItems);
                module.importStatement(null, importItems)
              },
          " ",
          peg$literalExpectation(" ", false),
          "as",
          peg$literalExpectation("as", false),
          function(name, as) {

              // TODO: extract path

              return {
                type: "single",
                name: name,
                asName: extractOptional(as, 3)
              };
            },
          ",",
          peg$literalExpectation(",", false),
          function(first, rest) {
              var ret = extractList(rest, 3);
              ret.unshift(first);
              return ret;
            },
          "[",
          peg$literalExpectation("[", false),
          "]",
          peg$literalExpectation("]", false),
          function(path, list) {
              return {
                type: "list",
                path: path,
                importList: list
              }
            },
          "=",
          peg$literalExpectation("=", false),
          function(modifier, id, expr) {
              var ret = modifier =='const' ? new ftl.ImmutableValFn(id.name, expr) : new ftl.VarFn(id.name, expr)
              module.addFn(id.name, ret); 
              return ret
            },
          function(id, params, body) {

              // FunctionDeclaration

              console.log('function id: ', id.name || id)
              console.log('expr: ', body)

              var is_operator = id.type == 'OperatorDeclaration' || id.type == 'PostfixOperatorDeclaration';
              if (is_operator)
                console.log('parameter list from operator: ', id.operands)
              console.log('parameter list from function: ', optionalList(params))

              var param_list = is_operator ? id.operands : optionalList(params);
              console.log('parameter list: ', param_list)
              var name = id.name || id
              var ret = body.script ? new ftl.NativeFunctionFn(name, param_list, body.script) :
                  new ftl.FunctionFn(name, param_list, body);
              module.addFn(name, ret);

              return ret;
            },
          "(",
          peg$literalExpectation("(", false),
          ")",
          peg$literalExpectation(")", false),
          function(elms) { return elms == null ? new ftl.TupleFn() : new ftl.TupleFn(... elms) },
          function(first, rest) {
              console.log("first", first);console.log("rest", rest);
              console.log("param list:", buildList(first, rest, 3));
              var list = buildList(first, rest, 3);
              for (var i = 0; i < list.length; i++) {
                if (list[i] instanceof ftl.RefFn) {
                  list[i].tupleSeq = '_' + i;
                }
              }
              return list;
          },
          ":",
          peg$literalExpectation(":", false),
          function(id, expr) {
                var iid = extractOptional(id, 0);
                if (iid != null)
                  iid = iid.name;
                if (iid == null)
                  return expr;
                return new ftl.NamedExprFn(iid, expr)
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
              
              return new ftl.PipeFn(first, t);
            },
          function(expr) {
                module.addExecutable(expr);
                return expr
              },
          function(first, rest) { return text() },
          function(id) { id.setAsValueType(); return id },
          function(id, params) {

                // #OperandReferenceDeclaration
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
                  operands: new ftl.TupleFn(... operands)
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
                return new ftl.PipeFn(expr, module.getAvailableFn(op.name || op));
              },
          function(expr, op) {
                console.log('PostfixOperatorExpression: op', op)
                console.log('PostfixOperatorExpression: expr', expr)
                var op_fn = module.getAvailableFn(op);
                if (!op_fn)
                  op_fn = new ftl.RefFn(op);
                return new ftl.PipeFn(expr, op_fn);
            },
          function(operand, rest) {

                // N_aryOperatorExpression
                var ops = extractList(rest, 1);
                var params = [new ftl.OperandFn(operand)].concat(extractList(rest, 3).map(operand => new ftl.OperandFn(operand)));
                return new N_aryOperatorExpressionFn(ops, params)
            },
          "_",
          peg$literalExpectation("_", false),
          "0",
          peg$literalExpectation("0", false),
          function() { return new ftl.TupleSelectorFn(text().substring(1)) },
          function(id) {return text()},
          function(id, index) {
              console.log('got ArrayElementSelector', index);
              return new ftl.ArrayElementSelectorFn(module, id, index);
            },
          function(elms) {
              var lst = extractOptional(elms, 1);
              return lst == null ? new ftl.ConstFn([]) : lst
            },
          function(first, rest) {
              var elms = buildList(first, rest, 3);
              var ret = [];
              for (var i = 0; i < elms.length; i++)
                ret.push(elms[i].value);
              return new ftl.ConstFn(ret)
            },
          function(id, params) {

              // CallExpression
              id.params = params;
              return new ftl.CallExprFn(id.name, params);
            },
          "{",
          peg$literalExpectation("{", false),
          "}",
          peg$literalExpectation("}", false),
          function() {return text()},
          function() {return {type:'native', script: text()}},
          peg$anyExpectation(),
          function(name) {

            // #Identifier
            var ret = new ftl.RefFn(name);
            return ret;
          },
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
          "module",
          peg$literalExpectation("module", false),
          "import",
          peg$literalExpectation("import", false),
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
          function() { return new ftl.ConstFn(true) },
          function() { return new ftl.ConstFn(false) },
          function(literal) { return literal },
          function() {
                return new ftl.ConstFn(parseFloat(text()));
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
          function(chars) { var str = text(); return new ftl.ConstFn(str.substr(1, str.length - 2)) },
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
          peg$decode("%;x/V#;!.\" &\"/H$;x/?$;#.\" &\"/1$;x/($8%: %!!)(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;Q/Q#;v/H$%;\"/0#;L/'$8\":!\" )(\"'#&'#/($8#:\"#! )(#'#(\"'#&'#"),
          peg$decode("%$%;L/2#2#\"\"6#7$/#$+\")(\"'#&'#0<*%;L/2#2#\"\"6#7$/#$+\")(\"'#&'#&/& 8!:!! )"),
          peg$decode("%;$/_#$%;w/,#;$/#$+\")(\"'#&'#06*%;w/,#;$/#$+\")(\"'#&'#&/)$8\":%\"\"! )(\"'#&'#"),
          peg$decode(";%./ &;*.) &;+.# &;2"),
          peg$decode("%;R/:#;v/1$;'/($8#:&#! )(#'#(\"'#&'#"),
          peg$decode("%%;\"/\x82#;H.o &%;4/e#$%2'\"\"6'7(/,#;4/#$+\")(\"'#&'#0<*%2'\"\"6'7(/,#;4/#$+\")(\"'#&'#&/#$+\")(\"'#&'#/'$8\":!\" )(\"'#&'#/h#%;v/J#2)\"\"6)7*/;$;v/2$;H.# &;4/#$+$)($'#(#'#(\"'#&'#.\" &\"/)$8\":+\"\"! )(\"'#&'#"),
          peg$decode("%;)/\x8F#$%;v/D#2,\"\"6,7-/5$;v/,$;)/#$+$)($'#(#'#(\"'#&'#0N*%;v/D#2,\"\"6,7-/5$;v/,$;)/#$+$)($'#(#'#(\"'#&'#&/)$8\":.\"\"! )(\"'#&'#"),
          peg$decode("%%;\"/0#;L/'$8\":!\" )(\"'#&'#/p#;v/g$2/\"\"6/70/X$;v/O$;'.\" &\"/A$;v/8$21\"\"6172/)$8':3'\"&\")(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode(";(.# &;&"),
          peg$decode("%;T.# &;S/f#;v/]$;H/T$;v/K$24\"\"6475/<$;v/3$;3/*$8':6'#&$ )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;N/q#;v/h$;8.) &;H.# &;4/S$;v/J$;,.\" &\"/<$;v/3$;//*$8':7'#$\" )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%28\"\"6879/N#;v/E$;-.\" &\"/7$2:\"\"6:7;/($8$:<$!!)($'#(#'#(\"'#&'#"),
          peg$decode("%;./\x8F#$%;v/D#2,\"\"6,7-/5$;v/,$;./#$+$)($'#(#'#(\"'#&'#0N*%;v/D#2,\"\"6,7-/5$;v/,$;./#$+$)($'#(#'#(\"'#&'#&/)$8\":=\"\"! )(\"'#&'#"),
          peg$decode("%%;H/;#;v/2$2>\"\"6>7?/#$+#)(#'#(\"'#&'#.\" &\"/;#;v/2$;1/)$8#:@#\"\" )(#'#(\"'#&'#"),
          peg$decode(";F.# &;0"),
          peg$decode("%2A\"\"6A7B/C#;v/:$;1/1$;v/($8$:C$!!)($'#(#'#(\"'#&'#"),
          peg$decode("%;;.# &;3/J#%;v/,#;0/#$+\")(\"'#&'#.\" &\"/)$8\":D\"\"! )(\"'#&'#"),
          peg$decode("%;1/' 8!:E!! )"),
          peg$decode(";@.G &;E.A &;D.; &;H.5 &;A./ &;B.) &;,.# &;?"),
          peg$decode("%%<2A\"\"6A7B=.##&&!&'#/B#;Y/9$$;Y0#*;Y&/)$8#:F#\"! )(#'#(\"'#&'#"),
          peg$decode("%;H/' 8!:G!! )"),
          peg$decode("%;H/2#;,/)$8\":H\"\"! )(\"'#&'#"),
          peg$decode(";6.# &;5"),
          peg$decode(";9.# &;:"),
          peg$decode("%;7/\x89#$%;v/>#;4/5$;v/,$;7/#$+$)($'#(#'#(\"'#&'#/K#0H*%;v/>#;4/5$;v/,$;7/#$+$)($'#(#'#(\"'#&'#&&&#/)$8\":I\"\"! )(\"'#&'#"),
          peg$decode("%;7/;#;v/2$;4/)$8#:J#\"\" )(#'#(\"'#&'#"),
          peg$decode(";<.) &;>.# &;="),
          peg$decode("%;4/;#;v/2$;3/)$8#:K#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;3/;#;v/2$;4/)$8#:L#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;3/\x89#$%;v/>#;4/5$;v/,$;3/#$+$)($'#(#'#(\"'#&'#/K#0H*%;v/>#;4/5$;v/,$;3/#$+$)($'#(#'#(\"'#&'#&&&#/)$8\":M\"\"! )(\"'#&'#"),
          peg$decode("%2N\"\"6N7O/k#2P\"\"6P7Q.R &%;_/H#$;X0#*;X&/8$%<;J=.##&&!&'#/#$+#)(#'#(\"'#&'#/'$8\":R\" )(\"'#&'#"),
          peg$decode("%;H/\x93#;v/\x8A$2/\"\"6/70/{$2P\"\"6P7Q.H &%;_/8#$;X0#*;X&/($8\":S\"!%)(\"'#&'#.# &;H/A$;v/8$21\"\"6172/)$8&:T&\"%\")(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode(";O./ &;[.) &;\\.# &;e"),
          peg$decode("%2/\"\"6/70/a#%;v/,#;C/#$+\")(\"'#&'#.\" &\"/@$;v/7$21\"\"6172/($8$:U$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%;3/\x8F#$%;v/D#2,\"\"6,7-/5$;v/,$;3/#$+$)($'#(#'#(\"'#&'#0N*%;v/D#2,\"\"6,7-/5$;v/,$;3/#$+$)($'#(#'#(\"'#&'#&/)$8\":V\"\"! )(\"'#&'#"),
          peg$decode("%;H/r#;v/i$2/\"\"6/70/Z$;v/Q$$;-/&#0#*;-&&&#/;$;v/2$21\"\"6172/#$+')(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;H/;#;v/2$;,/)$8#:W#\"\" )(#'#(\"'#&'#"),
          peg$decode("%2X\"\"6X7Y/\u0152#;v/\u0149$%$%%<2X\"\"6X7Y.) &2Z\"\"6Z7[=.##&&!&'#/,#;G/#$+\")(\"'#&'#0T*%%<2X\"\"6X7Y.) &2Z\"\"6Z7[=.##&&!&'#/,#;G/#$+\")(\"'#&'#&/& 8!:\\! )/\xCC$$;F0#*;F&/\xBC$;v/\xB3$%$%%<2X\"\"6X7Y.) &2Z\"\"6Z7[=.##&&!&'#/,#;G/#$+\")(\"'#&'#0T*%%<2X\"\"6X7Y.) &2Z\"\"6Z7[=.##&&!&'#/,#;G/#$+\")(\"'#&'#&/& 8!:\\! )/6$2Z\"\"6Z7[/'$8':]' )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("1\"\"5!7^"),
          peg$decode("%%<;Z=.##&&!&'#/1#;I/($8\":_\"! )(\"'#&'#"),
          peg$decode("<%;J/9#$;K0#*;K&/)$8\":a\"\"! )(\"'#&'#=.\" 7`"),
          peg$decode(";U.5 &2b\"\"6b7c.) &2N\"\"6N7O"),
          peg$decode(";J.# &;X"),
          peg$decode("%;W/O#$;W.) &2N\"\"6N7O0/*;W.) &2N\"\"6N7O&/'$8\":!\" )(\"'#&'#"),
          peg$decode("%2d\"\"6d7e/8#%<;K=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2f\"\"6f7g/8#%<;K=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2h\"\"6h7i/8#%<;K=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2j\"\"6j7k/8#%<;K=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2l\"\"6l7m/8#%<;K=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2n\"\"6n7o/8#%<;K=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2p\"\"6p7q/8#%<;K=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%2r\"\"6r7s/8#%<;K=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode(";V.# &;W"),
          peg$decode("4t\"\"5!7u"),
          peg$decode("4v\"\"5!7w"),
          peg$decode("4x\"\"5!7y"),
          peg$decode("4z\"\"5!7{"),
          peg$decode(";S.A &;T.; &;N.5 &;Q./ &;R.) &;O.# &;["),
          peg$decode("%;P/& 8!:|! ).. &%;M/& 8!:}! )"),
          peg$decode("%;c/>#%<;J.# &;X=.##&&!&'#/#$+\")(\"'#&'#.M &%;]/C#%<;J.# &;X=.##&&!&'#/($8\":~\"!!)(\"'#&'#"),
          peg$decode("%;^/T#2#\"\"6#7$/E$$;X0#*;X&/5$;`.\" &\"/'$8$:\x7F$ )($'#(#'#(\"'#&'#.\x91 &%4\x80\"\"5!7\x81.\" &\"/Z#2#\"\"6#7$/K$$;X/&#0#*;X&&&#/5$;`.\" &\"/'$8$:\x7F$ )($'#(#'#(\"'#&'#.? &%;^/5#;`.\" &\"/'$8\":\x7F\" )(\"'#&'#"),
          peg$decode("2P\"\"6P7Q.Q &%4\x80\"\"5!7\x81.\" &\"/<#;_/3$$;X0#*;X&/#$+#)(#'#(\"'#&'#"),
          peg$decode("4\x82\"\"5!7\x83"),
          peg$decode("%;a/,#;b/#$+\")(\"'#&'#"),
          peg$decode("3\x84\"\"5!7\x85"),
          peg$decode("%4\x86\"\"5!7\x87.\" &\"/9#$;X/&#0#*;X&&&#/#$+\")(\"'#&'#"),
          peg$decode("%3\x88\"\"5\"7\x89/@#%$;d/&#0#*;d&&&#/\"!&,)/#$+\")(\"'#&'#"),
          peg$decode("4\x8A\"\"5!7\x8B"),
          peg$decode("%2\x8C\"\"6\x8C7\x8D/G#$;f0#*;f&/7$2\x8C\"\"6\x8C7\x8D/($8#:\x8E#!!)(#'#(\"'#&'#.W &%2\x8F\"\"6\x8F7\x90/G#$;g0#*;g&/7$2\x8F\"\"6\x8F7\x90/($8#:\x8E#!!)(#'#(\"'#&'#"),
          peg$decode("%%<2\x8C\"\"6\x8C7\x8D./ &2\x91\"\"6\x917\x92.# &;o=.##&&!&'#/,#;G/#$+\")(\"'#&'#.B &%2\x91\"\"6\x917\x92/,#;i/#$+\")(\"'#&'#.# &;h"),
          peg$decode("%%<2\x8F\"\"6\x8F7\x90./ &2\x91\"\"6\x917\x92.# &;o=.##&&!&'#/,#;G/#$+\")(\"'#&'#.B &%2\x91\"\"6\x917\x92/,#;i/#$+\")(\"'#&'#.# &;h"),
          peg$decode("%2\x91\"\"6\x917\x92/,#;p/#$+\")(\"'#&'#"),
          peg$decode(";j.N &%2P\"\"6P7Q/8#%<;X=.##&&!&'#/#$+\")(\"'#&'#.# &;n"),
          peg$decode(";k.# &;l"),
          peg$decode("2\x8F\"\"6\x8F7\x90.} &2\x8C\"\"6\x8C7\x8D.q &2\x91\"\"6\x917\x92.e &2\x93\"\"6\x937\x94.Y &2\x95\"\"6\x957\x96.M &2\x97\"\"6\x977\x98.A &2\x99\"\"6\x997\x9A.5 &2\x9B\"\"6\x9B7\x9C.) &2\x9D\"\"6\x9D7\x9E"),
          peg$decode("%%<;m.# &;o=.##&&!&'#/,#;G/#$+\")(\"'#&'#"),
          peg$decode(";k.; &;X.5 &2\x9F\"\"6\x9F7\xA0.) &2\xA1\"\"6\xA17\xA2"),
          peg$decode("%2\x9F\"\"6\x9F7\xA0/F#%%;d/,#;d/#$+\")(\"'#&'#/\"!&,)/#$+\")(\"'#&'#"),
          peg$decode("4\xA3\"\"5!7\xA4"),
          peg$decode("2\xA5\"\"6\xA57\xA6.5 &2\xA7\"\"6\xA77\xA8.) &2\xA9\"\"6\xA97\xAA"),
          peg$decode("2\xAB\"\"6\xAB7\xAC.M &2\xAD\"\"6\xAD7\xAE.A &2\xAF\"\"6\xAF7\xB0.5 &2'\"\"6'7(.) &2\xB1\"\"6\xB17\xB2"),
          peg$decode("<;t.# &;s=.\" 7\xB3"),
          peg$decode("%2\xB4\"\"6\xB47\xB5/q#$%%<;o=.##&&!&'#/,#;G/#$+\")(\"'#&'#0B*%%<;o=.##&&!&'#/,#;G/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("%2\xB6\"\"6\xB67\xB7/\x8C#$%%<2\xB8\"\"6\xB87\xB9=.##&&!&'#/,#;G/#$+\")(\"'#&'#0H*%%<2\xB8\"\"6\xB87\xB9=.##&&!&'#/,#;G/#$+\")(\"'#&'#&/2$2\xB8\"\"6\xB87\xB9/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\xB6\"\"6\xB67\xB7/\x98#$%%<2\xB8\"\"6\xB87\xB9.# &;o=.##&&!&'#/,#;G/#$+\")(\"'#&'#0N*%%<2\xB8\"\"6\xB87\xB9.# &;o=.##&&!&'#/,#;G/#$+\")(\"'#&'#&/2$2\xB8\"\"6\xB87\xB9/#$+#)(#'#(\"'#&'#"),
          peg$decode("%$;q.# &;r0)*;q.# &;r&/\xA5#$%$;p/&#0#*;p&&&#/E#$;q.# &;r/,#0)*;q.# &;r&&&#/#$+\")(\"'#&'#0\\*%$;p/&#0#*;p&&&#/E#$;q.# &;r/,#0)*;q.# &;r&&&#/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("$%$;q.# &;r0)*;q.# &;r&/,#;p/#$+\")(\"'#&'#/L#0I*%$;q.# &;r0)*;q.# &;r&/,#;p/#$+\")(\"'#&'#&&&#"),
          peg$decode("$;q.) &;p.# &;r0/*;q.) &;p.# &;r&")
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

    // this is the module created during parsing
    var module = new ftl.Module('')

    // this is for building function / operator parameters
    var dummy_param_tuple = new ftl.TupleFn();

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
      var result = new Array(list.length);

      for (var i = 0; i < list.length; i++) {
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

    /**
     * Type for build only.
     */
    class BuildElement extends ftl.Fn {
      constructor() {
        super();
      }

      build() {
        
      }
    }

    class OperandReferenceDeclaration extends BuildElement {
      constructor(name, params) {
        this.is_tail = name.endsWith('$');
        this.name = this.isTail ? name.substring(0, name.length - 1) : name;
        this.params = params;
      }

    }

    /**
     * This function is transient during parsing and building.
     */
    class N_aryOperatorExpressionFn extends BuildElement {
      constructor(ops, operands) {
        if (ops.length == 0)
          throw new ftl.FnConstructionError('No ops found!')

        super();
        this.ops = ops;
        this.operands = operands;
      }

      build(module, inputFn) {
        var current_index = 0;
        var stop_index = this.ops.length;

        // This is used to parse operators and operands recursively.
        // It is called from index = length of operators down to 1.
        function parse_operators(ops, operands, index, full) {

          // operand at index 1 is for operator at 
          var op = index == 1 ? ops[0] : ops.slice(0, index).join(' ')
          var f = module.getAvailableFn(op);

          // no corresponding function found for single op
          if (!f) {
            if (index == 1)
              throw new ftl.FtlBuildError("No function with name '" + op + "' found!");

            index--;
            var reduced = parse_operators(ops, operands, index, false);
            
            if (current_index == stop_index)
              return reduced;

            ops = ops.slice(index, ops.length)
            operands = [reduced].concat(operands.slice(index + 1, operands.length))
            return parse_operators(ops, operands, ops.length, true)
          }

          for (var i = 0; i < f.paramsInfo.fnodes.length; i++) {
            var fnode = f.paramsInfo.fnodes[i];
            if (fnode instanceof ftl.RefFn && fnode.isRefType()) {
              operands[i] = new ftl.ExprRefFn(operands[i], fnode.params, fnode.is_tail);
            }
          }

          current_index += index;
          var operands_tuple = new ftl.TupleFn(... operands.slice(0, f.params.fnodes.length)).build(module, dummy_param_tuple);
          
          return new ftl.PipeFn(operands_tuple, f);
        }

        return parse_operators(this.ops, this.operands, this.ops.length, true);
      }
    }

    // end of script for parser generation


    peg$result = peg$parseRule(peg$startRuleIndex);

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return module;
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
