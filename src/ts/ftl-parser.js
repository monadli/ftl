/*
 * Generated by PEG.js 0.10.0.
 *
 * http://pegjs.org/
 */

export class BuildInfo {
  constructor(name, details) {
    this.name = name
    this.details = details
  }
}

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

export function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var peg$FAILED = {},

      peg$startRuleIndices = { Start: 0 },
      peg$startRuleIndex   = 0,

      peg$consts = [
        function(application) {
              return application
          },
        function(module_name) {
            return buildElement('ModuleDeclaration', { name: module_name.text() })
          },
        ".",
        peg$literalExpectation(".", false),
        "/",
        peg$literalExpectation("/", false),
        function() {
            return buildElement('ModulePath', text())
          },
        function() {
            // ImportModulePath
            return text()
          },
        function(first, rest) {
            return buildElement('Declarations', { declarations: buildList(first, rest, 1) })
          },
        function(items) {
            return buildElement('ImportDeclaration', { items: items })
          },
        function(path, compOp) { return compOp.details.value },
        "as",
        peg$literalExpectation("as", false),
        function(path, name, as) {
            return buildElement('ImportSingleItem', { path: path, name: name, item: extractOptional(as, 3) })
          },
        ",",
        peg$literalExpectation(",", false),
        function(first, rest) {
            return buildElement('ImportMultiItems', { items: buildList(first, rest, 3) })
          },
        function() { return text() },
        "[",
        peg$literalExpectation("[", false),
        "]",
        peg$literalExpectation("]", false),
        function(path, list) {
            return buildElement('ImportList', { path: path, list: list })
          },
        "=",
        peg$literalExpectation("=", false),
        function(modifier, id, expr) {
            return buildElement('VariableDeclaration', { modifier: modifier, name: id, expr: expr })
          },
        function(id, params) {
            return buildElement(
              'FunctionSignature',
              {
                name: id,
                params: params
              }
            )
          },
        function(signature, body) {
            return buildElement('FunctionDeclaration', {
              signature: signature,
              body: body
            })
          },
        "(",
        peg$literalExpectation("(", false),
        ")",
        peg$literalExpectation(")", false),
        function(elms) {
            return buildElement('Tuple', {elements: optionalList(elms)})
          },
        function(expr, params) {
            return buildElement(
              'ExpressionCurry',
              {
                expr:expr,
                list: extractList(params, 1)
              }
            )
          },
        function(first, rest) {
            return buildList(first, rest, 3)
          },
        ":",
        peg$literalExpectation(":", false),
        function(id, expr) {
            return buildElement(
              'TupleElement',
              {
                name: extractOptional(id, 0),
                expr: expr
              }
            )
          },
        function(expressions) {
            return extractList(expressions, 0)
          },
        function(annotations, expr) {
            return buildElement(
              'MapOperand',
              {
                  annotations: extractList(annotations, 0),
                  expr: expr
              }
            )
          },
        "->",
        peg$literalExpectation("->", false),
        function(ex) {
            //# ArrowExpression
            return ex
          },
        function(first, rest) {
            return buildElement(
              'MapExpression',
              {
                elements: buildList(first, rest, 1)
              }
            )
          },
        function(executable) {
            return buildElement('Executable', {
              executable: executable
            })
          },
        "@",
        peg$literalExpectation("@", false),
        function(annotation) {
            console.log('in annotation')
            return annotation
          },
        "//",
        peg$literalExpectation("//", false),
        function(first, rest) {

            //# Operator

            return text()
          },
        function(id) {

            //# OperandValueDeclaration

            return id
          },
        function(id, params) {
            return buildElement(
              'OperandFunctionDeclaration',
              {
                name: id,
                params: params
              }
            )
          },
        function(op, operand) {
            return buildElement(
              'PrefixOperatorDeclaration',
              {
                operator: op,
                operand: operand
              }
            )
          },
        function(first, rest) {
            return buildElement(
              'InfixOperatorDeclaration',
              {
                operators: extractList(rest, 1),
                operands: buildList(first, rest, 3)
              }
            )
          },
        function(operand, op) {
            return buildElement(
              'PostfixOperatorDeclaration',
              {
                operator: op,
                operand: operand
              }
            )
          },
        function(unit) {
            return buildElement('OperatorExpression', { unit: unit })
          },
        function(op, expr) {
            return buildElement('PrefixOperatorExpression', { operator: op, expr: expr })
          },
        function(expr, op) {
            return buildElement('PostfixOperatorExpression', { operator: op, expr: expr })
          },
        function(first, rest, last) {
            var params = buildList(first, rest, 3)
            if (last) {
              let post_op = extractOptional(last, 1)
              params[params.length - 1] = buildElement('PostfixOperatorExpression', { operator: post_op, expr: params[params.length - 1] })
            }
            return buildElement('N_aryOperatorExpression', { ops: extractList(rest, 1), operands: params })
          },
        "_",
        peg$literalExpectation("_", false),
        "0",
        peg$literalExpectation("0", false),
        function() {
            return buildElement('TupleSelector', { selector: text().substring(1) })
          },
        function(id, index) {
            return buildElement('ArrayElementSelector', { id: id, index: index })
          },
        function(elms) {
            return buildElement('ArrayLiteral', { list: extractOptional(elms, 1) || [] })
          },
        function(first, rest) {
            return buildElement('ListLiteral', { list: buildList(first, rest, 3) })
          },
        function(id, params) {
            var extracted_params = extractList(params, 1)

            // lambda declaration
            if (id.name == '$') {
              if (extracted_params.length > 1)
                throw new Error("FTL0001: lambda's arguments followed by calling arguments!")
              return buildElement('ParamTupleBuilder', { params: extracted_params[0] })
            }

            return buildElement('CallExpression', { name: id, params: extracted_params })
          },
        "{",
        peg$literalExpectation("{", false),
        "}",
        peg$literalExpectation("}", false),
        function() {

            //# NativeBlock
            return { type: 'native', script: text() }
          },
        peg$anyExpectation(),
        function(name) {
            return buildElement('Identifier', { name: name })
          },
        peg$otherExpectation("identifier"),
        function(first, rest) {
            return first + rest.join("")
          },
        "$",
        peg$literalExpectation("$", false),
        function() {
            return buildElement('NamespaceIdentifier', { text: text() })
          },
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
        /^[!%&*+\-.\/:;<=>?\^|\xD7\xF7\u220F\u2211\u2215\u2217\u2219\u221A\u221B\u221C\u2227\u2228\u2229\u222A\u223C\u2264\u2265\u2282\u2283]/,
        peg$classExpectation(["!", "%", "&", "*", "+", "-", ".", "/", ":", ";", "<", "=", ">", "?", "^", "|", "\xD7", "\xF7", "\u220F", "\u2211", "\u2215", "\u2217", "\u2219", "\u221A", "\u221B", "\u221C", "\u2227", "\u2228", "\u2229", "\u222A", "\u223C", "\u2264", "\u2265", "\u2282", "\u2283"], false, false),
        function() {
            return buildElement('TrueToken', { value: true })
          },
        function() {
            return buildElement('FalseToken', { value: false })
          },
        function(literal) { return buildElement('NumericLiteral', { value: literal }) },
        function() { return parseFloat(text()) },
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
        function(chars) {
            let str = text()
            return buildElement('StringLiteral', { value: str.substr(1, str.length - 2) })
          },
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
        "/*",
        peg$literalExpectation("/*", false),
        "*/",
        peg$literalExpectation("*/", false)
      ],

      peg$bytecode = [
        peg$decode("%;\x81/V#;!.\" &\"/H$;\x81/?$;$.\" &\"/1$;\x81/($8%: %!!)(%'#($'#(#'#(\"'#&'#"),
        peg$decode("%;Z/M#;\x7F/D$%;\"/,#;U/#$+\")(\"'#&'#/($8#:!#! )(#'#(\"'#&'#"),
        peg$decode("%$%;U/>#2\"\"\"6\"7#.) &2$\"\"6$7%/#$+\")(\"'#&'#0H*%;U/>#2\"\"\"6\"7#.) &2$\"\"6$7%/#$+\")(\"'#&'#&/& 8!:&! )"),
        peg$decode("%$%$2\"\"\"6\"7#/,#0)*2\"\"\"6\"7#&&&#/2#2$\"\"6$7%/#$+\")(\"'#&'#0U*%$2\"\"\"6\"7#/,#0)*2\"\"\"6\"7#&&&#/2#2$\"\"6$7%/#$+\")(\"'#&'#&/0#;\"/'$8\":'\" )(\"'#&'#"),
        peg$decode("%;%/_#$%;\x80/,#;%/#$+\")(\"'#&'#06*%;\x80/,#;%/#$+\")(\"'#&'#&/)$8\":(\"\"! )(\"'#&'#"),
        peg$decode(";&./ &;+.) &;-.# &;6"),
        peg$decode("%;[/:#;\x7F/1$;(/($8#:)#! )(#'#(\"'#&'#"),
        peg$decode("%;#/\x8B#;Q.6 &;9.0 &%;n/( 8!:*!\"\" )/i$%;\x7F/J#2+\"\"6+7,/;$;\x7F/2$;Q.# &;9/#$+$)($'#(#'#(\"'#&'#.\" &\"/*$8#:-##\"! )(#'#(\"'#&'#"),
        peg$decode("%;*/\x8F#$%;\x7F/D#2.\"\"6.7//5$;\x7F/,$;*/#$+$)($'#(#'#(\"'#&'#0N*%;\x7F/D#2.\"\"6.7//5$;\x7F/,$;*/#$+$)($'#(#'#(\"'#&'#&/)$8\":0\"\"! )(\"'#&'#"),
        peg$decode("%%;#/0#;U/'$8\":1\" )(\"'#&'#/p#;\x7F/g$22\"\"6273/X$;\x7F/O$;(.\" &\"/A$;\x7F/8$24\"\"6475/)$8':6'\"&\")(''#(&'#(%'#($'#(#'#(\"'#&'#"),
        peg$decode(";).# &;'"),
        peg$decode("%;].# &;\\/f#;\x7F/]$;Q/T$;\x7F/K$27\"\"6778/<$;\x7F/3$;8/*$8':9'#&$ )(''#(&'#(%'#($'#(#'#(\"'#&'#"),
        peg$decode("%;Q/;#;\x7F/2$;./)$8#::#\"\" )(#'#(\"'#&'#"),
        peg$decode("%;W/S#;\x7F/J$;=.# &;,/;$;\x7F/2$;2/)$8%:;%\"\" )(%'#($'#(#'#(\"'#&'#"),
        peg$decode("%2<\"\"6<7=/W#;\x7F/N$;0.\" &\"/@$;\x7F/7$2>\"\"6>7?/($8%:@%!\")(%'#($'#(#'#(\"'#&'#"),
        peg$decode("%;./e#$%;\x7F/,#;./#$+\")(\"'#&'#/9#06*%;\x7F/,#;./#$+\")(\"'#&'#&&&#/)$8\":A\"\"! )(\"'#&'#"),
        peg$decode("%;1/\x8F#$%;\x7F/D#2.\"\"6.7//5$;\x7F/,$;1/#$+$)($'#(#'#(\"'#&'#0N*%;\x7F/D#2.\"\"6.7//5$;\x7F/,$;1/#$+$)($'#(#'#(\"'#&'#&/)$8\":B\"\"! )(\"'#&'#"),
        peg$decode("%%;Q/;#;\x7F/2$2C\"\"6C7D/#$+#)(#'#(\"'#&'#.\" &\"/;#;\x7F/2$;5/)$8#:E#\"\" )(#'#(\"'#&'#"),
        peg$decode(";N.b &%$%;4/,#;\x7F/#$+\")(\"'#&'#/9#06*%;4/,#;\x7F/#$+\")(\"'#&'#&&&#/' 8!:F!! )"),
        peg$decode("%$%;7/,#;\x7F/#$+\")(\"'#&'#06*%;7/,#;\x7F/#$+\")(\"'#&'#&/8#;A.# &;8/)$8\":G\"\"! )(\"'#&'#"),
        peg$decode("%2H\"\"6H7I/:#;\x7F/1$;3/($8#:J#! )(#'#(\"'#&'#"),
        peg$decode("%;3/_#$%;\x7F/,#;4/#$+\")(\"'#&'#06*%;\x7F/,#;4/#$+\")(\"'#&'#&/)$8\":K\"\"! )(\"'#&'#"),
        peg$decode("%;5/' 8!:L!! )"),
        peg$decode("%2M\"\"6M7N/7#;M.# &;Q/($8\":O\"! )(\"'#&'#"),
        peg$decode(";H.S &;G.M &;M.G &;L.A &;Q.; &;I.5 &;/./ &;..) &;F.# &;B"),
        peg$decode("%%<2P\"\"6P7Q=.##&&!&'#/]#%<2H\"\"6H7I=.##&&!&'#/B$;b/9$$;b0#*;b&/)$8$:R$\"! )($'#(#'#(\"'#&'#"),
        peg$decode("%;Q/' 8!:S!! )"),
        peg$decode("%;Q/2#;./)$8\":T\"\"! )(\"'#&'#"),
        peg$decode(";;.# &;:"),
        peg$decode(";>.) &;?.# &;@"),
        peg$decode("%;9/;#;\x7F/2$;</)$8#:U#\"\" )(#'#(\"'#&'#"),
        peg$decode("%;</\x89#$%;\x7F/>#;9/5$;\x7F/,$;</#$+$)($'#(#'#(\"'#&'#/K#0H*%;\x7F/>#;9/5$;\x7F/,$;</#$+$)($'#(#'#(\"'#&'#&&&#/)$8\":V\"\"! )(\"'#&'#"),
        peg$decode("%;</;#;\x7F/2$;9/)$8#:W#\"\" )(#'#(\"'#&'#"),
        peg$decode("%;E.# &;C/' 8!:X!! )"),
        peg$decode("%;9/;#;\x7F/2$;8/)$8#:Y#\"\" )(#'#(\"'#&'#"),
        peg$decode("%;8/;#;\x7F/2$;9/)$8#:Z#\"\" )(#'#(\"'#&'#"),
        peg$decode(";8.] &%2<\"\"6<7=/M#;\x7F/D$;C/;$;\x7F/2$2>\"\"6>7?/#$+%)(%'#($'#(#'#(\"'#&'#"),
        peg$decode("%;D/\xAB#$%;\x7F/>#;9/5$;\x7F/,$;D/#$+$)($'#(#'#(\"'#&'#/K#0H*%;\x7F/>#;9/5$;\x7F/,$;D/#$+$)($'#(#'#(\"'#&'#&&&#/K$%;\x7F/,#;9/#$+\")(\"'#&'#.\" &\"/*$8#:[##\"! )(#'#(\"'#&'#"),
        peg$decode("%2\\\"\"6\\7]/k#2^\"\"6^7_.R &%;h/H#$;a0#*;a&/8$%<;S=.##&&!&'#/#$+#)(#'#(\"'#&'#/'$8\":`\" )(\"'#&'#"),
        peg$decode("%;Q/;#;\x7F/2$;I/)$8#:a#\"\" )(#'#(\"'#&'#"),
        peg$decode(";X./ &;d.) &;e.# &;n"),
        peg$decode("%22\"\"6273/a#%;\x7F/,#;J/#$+\")(\"'#&'#.\" &\"/@$;\x7F/7$24\"\"6475/($8$:b$!\")($'#(#'#(\"'#&'#"),
        peg$decode("%;K/\x8F#$%;\x7F/D#2.\"\"6.7//5$;\x7F/,$;K/#$+$)($'#(#'#(\"'#&'#0N*%;\x7F/D#2.\"\"6.7//5$;\x7F/,$;K/#$+$)($'#(#'#(\"'#&'#&/)$8\":c\"\"! )(\"'#&'#"),
        peg$decode(";A.# &;8"),
        peg$decode("%;Q/r#;\x7F/i$22\"\"6273/Z$;\x7F/Q$$;0/&#0#*;0&&&#/;$;\x7F/2$24\"\"6475/#$+')(''#(&'#(%'#($'#(#'#(\"'#&'#"),
        peg$decode("%;Q/e#$%;\x7F/,#;./#$+\")(\"'#&'#/9#06*%;\x7F/,#;./#$+\")(\"'#&'#&&&#/)$8\":d\"\"! )(\"'#&'#"),
        peg$decode("%2e\"\"6e7f/\xA3#;\x7F/\x9A$$;O0#*;O&/\x8A$$%;N/3#$;O0#*;O&/#$+\")(\"'#&'#0=*%;N/3#$;O0#*;O&/#$+\")(\"'#&'#&/F$$;O0#*;O&/6$2g\"\"6g7h/'$8&:i& )(&'#(%'#($'#(#'#(\"'#&'#"),
        peg$decode("%%<2e\"\"6e7f.) &2g\"\"6g7h=.##&&!&'#/,#;P/#$+\")(\"'#&'#"),
        peg$decode("1\"\"5!7j"),
        peg$decode("%%<;c=.##&&!&'#/1#;R/($8\":k\"! )(\"'#&'#"),
        peg$decode("<%;S/9#$;T0#*;T&/)$8\":m\"\"! )(\"'#&'#=.\" 7l"),
        peg$decode(";^.5 &2n\"\"6n7o.) &2\\\"\"6\\7]"),
        peg$decode(";S.# &;a"),
        peg$decode("%;`/O#$;`.) &2\\\"\"6\\7]0/*;`.) &2\\\"\"6\\7]&/'$8\":p\" )(\"'#&'#"),
        peg$decode("%2q\"\"6q7r/8#%<;T=.##&&!&'#/#$+\")(\"'#&'#"),
        peg$decode("%2s\"\"6s7t/8#%<;T=.##&&!&'#/#$+\")(\"'#&'#"),
        peg$decode("%2u\"\"6u7v/8#%<;T=.##&&!&'#/#$+\")(\"'#&'#"),
        peg$decode("%2w\"\"6w7x/8#%<;T=.##&&!&'#/#$+\")(\"'#&'#"),
        peg$decode("%2y\"\"6y7z/8#%<;T=.##&&!&'#/#$+\")(\"'#&'#"),
        peg$decode("%2{\"\"6{7|/8#%<;T=.##&&!&'#/#$+\")(\"'#&'#"),
        peg$decode("%2}\"\"6}7~/8#%<;T=.##&&!&'#/#$+\")(\"'#&'#"),
        peg$decode("%2\x7F\"\"6\x7F7\x80/8#%<;T=.##&&!&'#/#$+\")(\"'#&'#"),
        peg$decode(";_.# &;`"),
        peg$decode("4\x81\"\"5!7\x82"),
        peg$decode("4\x83\"\"5!7\x84"),
        peg$decode("4\x85\"\"5!7\x86"),
        peg$decode("4\x87\"\"5!7\x88"),
        peg$decode(";\\.A &;].; &;W.5 &;Z./ &;[.) &;X.# &;d"),
        peg$decode("%;Y/& 8!:\x89! ).. &%;V/& 8!:\x8A! )"),
        peg$decode("%;l/C#%<;S.# &;a=.##&&!&'#/($8\":\x8B\"!!)(\"'#&'#.M &%;f/C#%<;S.# &;a=.##&&!&'#/($8\":\x8B\"!!)(\"'#&'#"),
        peg$decode("%;g/T#2\"\"\"6\"7#/E$$;a0#*;a&/5$;i.\" &\"/'$8$:\x8C$ )($'#(#'#(\"'#&'#.\x91 &%4\x8D\"\"5!7\x8E.\" &\"/Z#2\"\"\"6\"7#/K$$;a/&#0#*;a&&&#/5$;i.\" &\"/'$8$:\x8C$ )($'#(#'#(\"'#&'#.? &%;g/5#;i.\" &\"/'$8\":\x8C\" )(\"'#&'#"),
        peg$decode("2^\"\"6^7_.Q &%4\x8D\"\"5!7\x8E.\" &\"/<#;h/3$$;a0#*;a&/#$+#)(#'#(\"'#&'#"),
        peg$decode("4\x8F\"\"5!7\x90"),
        peg$decode("%;j/,#;k/#$+\")(\"'#&'#"),
        peg$decode("3\x91\"\"5!7\x92"),
        peg$decode("%4\x93\"\"5!7\x94.\" &\"/9#$;a/&#0#*;a&&&#/#$+\")(\"'#&'#"),
        peg$decode("%3\x95\"\"5\"7\x96/@#%$;m/&#0#*;m&&&#/\"!&,)/#$+\")(\"'#&'#"),
        peg$decode("4\x97\"\"5!7\x98"),
        peg$decode("%2\x99\"\"6\x997\x9A/G#$;o0#*;o&/7$2\x99\"\"6\x997\x9A/($8#:\x9B#!!)(#'#(\"'#&'#.W &%2\x9C\"\"6\x9C7\x9D/G#$;p0#*;p&/7$2\x9C\"\"6\x9C7\x9D/($8#:\x9B#!!)(#'#(\"'#&'#"),
        peg$decode("%%<2\x99\"\"6\x997\x9A./ &2\x9E\"\"6\x9E7\x9F.# &;x=.##&&!&'#/,#;P/#$+\")(\"'#&'#.B &%2\x9E\"\"6\x9E7\x9F/,#;r/#$+\")(\"'#&'#.# &;q"),
        peg$decode("%%<2\x9C\"\"6\x9C7\x9D./ &2\x9E\"\"6\x9E7\x9F.# &;x=.##&&!&'#/,#;P/#$+\")(\"'#&'#.B &%2\x9E\"\"6\x9E7\x9F/,#;r/#$+\")(\"'#&'#.# &;q"),
        peg$decode("%2\x9E\"\"6\x9E7\x9F/,#;y/#$+\")(\"'#&'#"),
        peg$decode(";s.N &%2^\"\"6^7_/8#%<;a=.##&&!&'#/#$+\")(\"'#&'#.# &;w"),
        peg$decode(";t.# &;u"),
        peg$decode("2\x9C\"\"6\x9C7\x9D.} &2\x99\"\"6\x997\x9A.q &2\x9E\"\"6\x9E7\x9F.e &2\xA0\"\"6\xA07\xA1.Y &2\xA2\"\"6\xA27\xA3.M &2\xA4\"\"6\xA47\xA5.A &2\xA6\"\"6\xA67\xA7.5 &2\xA8\"\"6\xA87\xA9.) &2\xAA\"\"6\xAA7\xAB"),
        peg$decode("%%<;v.# &;x=.##&&!&'#/,#;P/#$+\")(\"'#&'#"),
        peg$decode(";t.; &;a.5 &2\xAC\"\"6\xAC7\xAD.) &2\xAE\"\"6\xAE7\xAF"),
        peg$decode("%2\xAC\"\"6\xAC7\xAD/F#%%;m/,#;m/#$+\")(\"'#&'#/\"!&,)/#$+\")(\"'#&'#"),
        peg$decode("4\xB0\"\"5!7\xB1"),
        peg$decode("2\xB2\"\"6\xB27\xB3.5 &2\xB4\"\"6\xB47\xB5.) &2\xB6\"\"6\xB67\xB7"),
        peg$decode("2\xB8\"\"6\xB87\xB9.M &2\xBA\"\"6\xBA7\xBB.A &2\xBC\"\"6\xBC7\xBD.5 &2\xBE\"\"6\xBE7\xBF.) &2\xC0\"\"6\xC07\xC1"),
        peg$decode("<;}.# &;|=.\" 7\xC2"),
        peg$decode("%2P\"\"6P7Q/q#$%%<;x=.##&&!&'#/,#;P/#$+\")(\"'#&'#0B*%%<;x=.##&&!&'#/,#;P/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
        peg$decode("%2\xC3\"\"6\xC37\xC4/\x8C#$%%<2\xC5\"\"6\xC57\xC6=.##&&!&'#/,#;P/#$+\")(\"'#&'#0H*%%<2\xC5\"\"6\xC57\xC6=.##&&!&'#/,#;P/#$+\")(\"'#&'#&/2$2\xC5\"\"6\xC57\xC6/#$+#)(#'#(\"'#&'#"),
        peg$decode("%2\xC3\"\"6\xC37\xC4/\x98#$%%<2\xC5\"\"6\xC57\xC6.# &;x=.##&&!&'#/,#;P/#$+\")(\"'#&'#0N*%%<2\xC5\"\"6\xC57\xC6.# &;x=.##&&!&'#/,#;P/#$+\")(\"'#&'#&/2$2\xC5\"\"6\xC57\xC6/#$+#)(#'#(\"'#&'#"),
        peg$decode("%$;z.# &;{0)*;z.# &;{&/\xA5#$%$;y/&#0#*;y&&&#/E#$;z.# &;{/,#0)*;z.# &;{&&&#/#$+\")(\"'#&'#0\\*%$;y/&#0#*;y&&&#/E#$;z.# &;{/,#0)*;z.# &;{&&&#/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
        peg$decode("$%$;z.# &;{0)*;z.# &;{&/,#;y/#$+\")(\"'#&'#/L#0I*%$;z.# &;{0)*;z.# &;{&/,#;y/#$+\")(\"'#&'#&&&#"),
        peg$decode("$;z.) &;y.# &;{0/*;z.) &;y.# &;{&")
      ],

      peg$currPos          = 0,
      peg$savedPos         = 0,
      peg$posDetailsCache  = [{ line: 1, column: 1 }],
      peg$maxFailPos       = 0,
      peg$maxFailExpected  = [],
      peg$silentFails      = 0,

      peg$resultsCache = {},

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

    var key    = peg$currPos * 98 + index,
        cached = peg$resultsCache[key];

    if (cached) {
      peg$currPos = cached.nextPos;

      return cached.result;
    }

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

    peg$resultsCache[key] = { nextPos: peg$currPos, result: stack[0] };

    return stack[0];
  }


  function buildElement(name, buildInfo) {
    return new BuildInfo(name, buildInfo)
  }

  function extractOptional(optional, index) {
    return optional ? optional[index] : null
  }

  function extractList(list, index) {
    var result = new Array(list.length)

    for (var i = 0; i < list.length; i++) {
      result[i] = list[i][index]
    }

    return result
  }

  function buildList(first, rest, index) {
    return [first].concat(extractList(rest, index))
  }

  function optionalList(value) {
    return value || []
  }

  function buildFirstRest(first, rest) {
    return (Array.isArray(rest) && rest.length == 0) ? first : buildList(first, rest, 1)
  }

  // end of script for parser generation


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
