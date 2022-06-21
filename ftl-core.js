// copy from main branch compiled ftl-core.js with comments removed
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SideffectedFn = exports.SideffectFn = exports.ExecutableFn = exports.CurryExprFn = exports.BinaryOperatorWithPrefixFn = exports.ArrayRangeSelectorFn = exports.ArrayElementSelectorFn = exports.ArrayInitializerWithRangeFn = exports.ArrayInitializerFn = exports.ExprRefFn = exports.CallExprFn = exports.ExprFn = exports.SeqSelectorOrDefault = exports.TupleSelectorFn = exports.FunctionHolder = exports.RefFn = exports.OpPipeFn = exports.PipeFn = exports.TupleFn = exports.NamedExprFn = exports.FunctionInterfaceFn = exports.FunctionFn = exports.NativeFunctionFn = exports.FunctionBaseFn = exports.ConstFn = exports.WrapperFn = exports.Fn = exports.Tuple = exports.Module = exports.FnUtil = exports.addModule = exports.getModule = void 0;
const version = '0.0.1';
const TupleSelectorPattern = /_\d+$/;
const InputSelectorPattern = '_';
let modules = new Map();
function getModule(name) {
    return modules.get(name);
}
exports.getModule = getModule;
function addModule(module) {
    modules.set(module.name, module);
}
exports.addModule = addModule;
function toString(value) {
    if (Array.isArray(value) || typeof value == 'string')
        return JSON.stringify(value);
    else
        return value.toString();
}
class FnUtil {
    static isNone(elm) {
        return elm === undefined || elm === null;
    }
}
exports.FnUtil = FnUtil;
class FnConstructionError extends Error {
    constructor(...params) {
        super(...params);
        if (this.stack) {
            var start = this.stack.indexOf(' at new ') + 8;
            this.message = this.stack.substring(start, this.stack.indexOf(' ', start)) + ': ' + this.message;
        }
    }
}
class FtlRuntimeError extends Error {
    constructor(...params) {
        super(...params);
    }
}
class FunctionParameterDeficiencyError extends FtlRuntimeError {
    constructor(...params) {
        super(...params);
    }
}
class Module {
    constructor(name) {
        this._name = name;
        this._functions = {};
        this._imports = {};
        this._executables = [];
    }
    get name() { return this._name; }
    addImport(name, f) {
        if (!f)
            throw new FnConstructionError(`Function/operator ${name} cannot be found!`);
        if (this._imports[name])
            console.warn(`import ${name} exists! Overriding.`);
        this._imports[name] = f;
    }
    addFn(f) {
        if (this._functions[f.name]) {
            let nf = this._functions[f.name];
            if (nf instanceof FunctionHolder)
                nf.wrapped = f;
            else
                throw new FnConstructionError(`${f.name} exists and can not be declared again!`);
        }
        this._functions[f.name] = f;
    }
    getExportableFn(name) {
        return this._functions[name];
    }
    hasFn(name) {
        return this.getAvailableFn(name) != null;
    }
    getAvailableFn(name) {
        return this._functions[name] || this._imports[name];
    }
    addExecutable(exec) {
        this._executables.push(exec);
    }
    get functionNames() { return Object.keys(this._functions); }
    get executables() { return this._executables[Symbol.iterator](); }
    get executableCount() { return this._executables.length; }
    apply() {
        var ret = [];
        for (let exec of this.executables) {
            try {
                let res = exec.apply();
                ret.push(res && (Array.isArray(res) && JSON.stringify(res) || res) || null);
            }
            catch (e) {
                ret.push(e);
            }
        }
        return ret;
    }
}
exports.Module = Module;
class Tuple {
    constructor() {
        this._names = new Map();
        this._values = [];
    }
    hasNames() {
        return this._names.size > this._values.length;
    }
    static fromNameValue(name, value) {
        return new Tuple().addNameValue(name, value);
    }
    static fromValue(value) {
        var t = new Tuple();
        t.addValue(value);
        return t;
    }
    static fromValues(...values) {
        var t = new Tuple();
        if (values == null)
            return t;
        values.forEach(elm => t.addValue(elm));
        return t;
    }
    get size() { return this._values.length; }
    addValue(value) {
        this.addNameValue(null, value);
        return this;
    }
    addNameValue(name, value) {
        if (name && this._names.has(name)) {
            throw new FtlRuntimeError("Tuple.addKeyValue(.): key " + name + " already exists!");
        }
        let seq = this.size;
        this._names.set(`_${seq}`, seq);
        if (name) {
            this._names.set(name, seq);
            this._values.push(value instanceof Tuple && value.size == 1 && !value.hasNames() ? value.getIndex(0) : value);
        }
        else if (value instanceof Tuple && value.size == 1) {
            if (value._names.size == 1) {
                this.addValue(value._values[0]);
            }
            else {
                var k = value._names.keys();
                k.next();
                this.addNameValue(k.next().value, value._values[0]);
            }
        }
        else {
            this._values.push(value);
        }
        return this;
    }
    forEach(callback) {
        this._names.forEach((value, key, map) => {
            callback(key, this._values[value]);
        });
    }
    appendAll(tuple) {
        if (tuple instanceof Tuple) {
            let value_map = new Map();
            tuple._names.forEach((value, key, map) => {
                value_map.set(value, key);
            });
            value_map.forEach((value, key) => {
                if (value.startsWith('_') && !isNaN(parseInt(value.substring(1))))
                    this.addValue(tuple._values[key]);
                else
                    this.addNameValue(value, tuple._values[key]);
            });
        }
        else if (tuple != null)
            this.addValue(tuple);
        return this;
    }
    get(name) {
        let index = this._names.get(name);
        return index === undefined ? undefined : this._values[index];
    }
    getIndex(index) {
        return this._values[index];
    }
    hasTail() {
        return this._values.find(elm => TailFn.isTail(elm)) !== undefined;
    }
    hasFn() {
        return this._values.find(elm => elm instanceof Fn) !== undefined;
    }
    toList() {
        return [...this._values];
    }
    toTupleFn() {
        var converted = [];
        let name_map = new Map();
        this._names.forEach((name, seq, map) => {
            name_map.set(name, seq);
        });
        name_map.forEach((name, seq) => {
            var val = this._values[seq];
            if (val instanceof Tuple) {
                val = val.toTupleFn();
            }
            else if (!(val instanceof Fn)) {
                val = new ConstFn(val);
            }
            if (!name.startsWith('_') || isNaN(parseInt(name.substring(1)))) {
                if (val instanceof TailFn)
                    val.name = name;
                else
                    val = new NamedExprFn(name, val);
            }
            converted.push(val);
        });
        return new TupleFn(...converted);
    }
    equals(o) {
        function arrayIdentical(a, b) {
            if (!Array.isArray(a) || !Array.isArray(b))
                return false;
            var i = a.length;
            if (i != b.length)
                return false;
            while (i--) {
                if (a[i] != b[i])
                    return false;
            }
            return true;
        }
        if (!(o instanceof Tuple))
            return false;
        if (o.size != this.size)
            return false;
        for (var i = 0; i < this.size; i++) {
            var ith = this.getIndex(i);
            var oth = o.getIndex(i);
            if (ith != oth && !arrayIdentical(ith, oth) && (!(ith instanceof Tuple) || !ith.equals(oth)))
                return false;
        }
        return true;
    }
    toString() {
        if (this._values.length == 0)
            return '<>';
        var buf = [];
        var curr_idx = 0;
        var curr = null;
        this._names.forEach((value, key, map) => {
            if (value != curr_idx) {
                buf.push(curr);
                curr_idx = value;
            }
            curr = toString(this._values[value]);
            if (!key.startsWith('_'))
                curr = `${key}:${curr}`;
        });
        buf.push(curr);
        return `<${buf.join(', ')}>`;
    }
}
exports.Tuple = Tuple;
class Fn {
    get typeName() { return this.constructor.name; }
    apply(input, context) {
        return new Tuple();
    }
    applyAndResolve(input, context) {
        let ret = this.apply(input, context);
        while (TailFn.isTail(ret)) {
            ret = ret.apply(null);
        }
        if (ret instanceof Fn) {
            ret = ret.apply(input, context);
        }
        return ret;
    }
}
exports.Fn = Fn;
class NamedFn extends Fn {
    constructor(name) {
        super();
        this._name = name;
    }
    get name() { return this._name; }
}
class ComposedFn extends Fn {
    constructor(...fns) {
        super();
        this._fns = fns;
    }
    get fns() { return this._fns[Symbol.iterator](); }
    get size() { return this._fns.length; }
    get first() { return this.size > 0 && this._fns[0] || undefined; }
    getFnAt(index) { return this._fns[index]; }
    replaceAt(index, fn) {
        this._fns[index] = fn;
    }
    filter(predicate) {
        return this._fns.filter(predicate);
    }
    find(predicate) {
        return this._fns.find(predicate);
    }
    map(mapper) {
        return this._fns.map(mapper);
    }
}
class WrapperFn extends Fn {
    constructor(wrapped) {
        super();
        this._wrapped = wrapped;
    }
    get wrapped() { return this._wrapped; }
    isConst() {
        return this._wrapped instanceof ConstFn;
    }
    apply(input, context) {
        return this._wrapped.apply(input, context);
    }
    toString() {
        return this._wrapped.toString();
    }
}
exports.WrapperFn = WrapperFn;
class ConstFn extends Fn {
    constructor(value) {
        super();
        this._value = value;
    }
    get valueType() { return typeof this._value; }
    get value() { return this._value; }
    apply(input) {
        return Array.isArray(this._value) ? Array.from(this._value) : this._value;
    }
    toString() {
        return toString(this._value);
    }
}
exports.ConstFn = ConstFn;
class ImmutableValFn extends ConstFn {
    constructor(name, value) {
        super(value);
        this._name = name;
    }
}
class VarFn extends ImmutableValFn {
    constructor(name, value) {
        super(name, value);
    }
    set value(value) {
        if (value == undefined)
            throw new FtlRuntimeError("value to VarFn can not be undefined!");
        this._val = value;
    }
}
class FunctionBaseFn extends NamedFn {
    constructor(name, params, body) {
        let is_pipe_op = false;
        if (name.endsWith('->')) {
            name = name.substring(0, name.length - 2);
            is_pipe_op = true;
        }
        super(name);
        this._params = params;
        this._body = body;
        this._isPipeOp = is_pipe_op;
    }
    get params() {
        return this._params;
    }
    get isPipeOp() {
        return this._isPipeOp;
    }
    apply(input, context) {
        return this._body.apply(input, context);
    }
}
exports.FunctionBaseFn = FunctionBaseFn;
class NativeFunctionFn extends FunctionBaseFn {
    constructor(name, params, jsfunc) {
        super(name, params, new NativeFunctionFn.NativeScriptFn(jsfunc));
    }
    apply(input, context) {
        if (FnUtil.isNone(input) && this.params.size > 0)
            throw new FunctionParameterDeficiencyError("Input to native function " + this.name + " does not match!");
        return this._body.apply(this.params.apply(input));
    }
    toString() {
        return this.name;
    }
}
exports.NativeFunctionFn = NativeFunctionFn;
NativeFunctionFn.NativeScriptFn = class extends Fn {
    constructor(jsfunc) {
        super();
        this._jsfunc = jsfunc;
    }
    apply(input) {
        let args = (input instanceof Tuple) && input.toList() || [input];
        return this._jsfunc.apply(null, args);
    }
};
class FunctionFn extends FunctionBaseFn {
    constructor(name, params, expr) {
        super(name, params, new FunctionFn.FunctionBodyFn(expr));
    }
}
exports.FunctionFn = FunctionFn;
FunctionFn.FunctionBodyFn = class extends WrapperFn {
    constructor(expr) {
        super(expr);
    }
    apply(input, context) {
        let res = super.apply(input, context);
        var i = 0;
        while (res instanceof TailFn) {
            i++;
            if (i == 10000)
                break;
            if (context == this) {
                return res;
            }
            res = res.hasTail() ? res.ResolveNextTail(this) : res.apply(null, this);
        }
        return res instanceof ConstFn ? res.apply(null) : res;
    }
};
class FunctionInterfaceFn extends NamedFn {
    constructor(name, params, seq = 0) {
        super(name);
        this._tail = false;
        this.params = params;
        this._seq = seq;
    }
    get seq() { return this._seq; }
    set seq(val) { this._seq = val; }
    isTail() { return this._tail; }
    setAsTail() { this._tail = true; }
    get paramSize() { return this.params.length; }
    apply(input) {
        let f = input.getIndex(this._seq);
        if (typeof f == 'function' && (f.name == 'bound applyInNativeContext' || f.name == 'bound tailWrapper')) {
            return f;
        }
        // for delayed computation, specifically delay the computation
        if (this.isTail()) {
            let tail = new TailFn(f);
            return tail.tailWrapper.bind(tail);
        }
        // in a native function wrapped in NativeFunctionFn or ftl function wrapped in
        else {
            let closure = new ClosureFunction(input instanceof Tuple ? f : input, this.params);
            return closure.applyInNativeContext.bind(closure);
        }
    }
}
exports.FunctionInterfaceFn = FunctionInterfaceFn;
class ClosureFunction {
    constructor(f, closureParams) {
        this.f = f;
        this.closureParams = closureParams;
    }
    unwrap() {
        return [this.f, this.closureParams];
    }
    jsArgsToTuple(params, args) {
        var ret = new Tuple();
        for (var i = 0; i < params.size; i++)
            ret.addNameValue(params.getFnAt(i).name, args[i]);
        return ret;
    }
    applyInNativeContext(input) {
        var len = arguments.length;
        if (len == 0)
            return this.f.apply(this.closureParams.apply());
        var tpl = new Tuple();
        // no named parameters
        var start = 0;
        if (this.closureParams instanceof RefFn) {
            if (this.closureParams.isRefType()) {
            }
            else
                tpl.addNameValue(this.closureParams.name, input);
            start = 1;
        }
        else if (this.closureParams instanceof TupleFn) {
            tpl = this.jsArgsToTuple(this.closureParams, arguments);
            start = this.closureParams.size;
        }
        else if (Array.isArray(this.closureParams) && this.closureParams[0] instanceof TupleFn) {
            tpl = this.jsArgsToTuple(this.closureParams[0], arguments);
            start = this.closureParams[0].size;
        }
        return this.f.apply(tpl);
    }
    apply(input, context) {
        var tuple = new Tuple();
        // for correctly resolve positional reference
        tuple.appendAll(this.closureParams);
        tuple.appendAll(input);
        return this.f.apply(tuple, context);
    }
}
class NamedExprFn extends WrapperFn {
    constructor(name, elm) {
        super(elm);
        this._name = name;
    }
    get name() { return this._name; }
    hasRef() {
        return this._wrapped instanceof RefFn;
    }
}
exports.NamedExprFn = NamedExprFn;
class TupleFn extends ComposedFn {
    constructor(...fns) {
        super(...fns);
    }
    hasName(name) {
        return this.getNamedFn(name) != null;
    }
    getNamedFn(name) {
        return this.find((fn) => fn instanceof NamedExprFn && fn.name == name);
    }
    apply(input, context) {
        var tuple = new Tuple();
        var len = this.size;
        if (len == 0)
            return tuple;
        for (var i = 0; i < len; i++) {
            var fn = this._fns[i];
            var res = fn.apply(input, context);
            if (fn instanceof NamedExprFn || fn instanceof TailFn) {
                tuple.addNameValue(fn.name, res);
            }
            else
                tuple.addValue(res);
        }
        return tuple.size == 1 && !tuple.hasNames() ? tuple.getIndex(0) : tuple;
    }
}
exports.TupleFn = TupleFn;
class PipeFn extends ComposedFn {
    constructor(...tuples) {
        super(...tuples);
    }
    apply(tuple, context) {
        var res = this._fns[0].apply(tuple, context);
        if (res === this._fns[0])
            return this;
        for (var i = 1; i < this._fns.length; i++) {
            if (res instanceof TailFn)
                return new TailFn(new PipeFn(res, ...this._fns.slice(i)));
            else if (res instanceof Tuple && res.hasTail())
                return new TailFn(new PipeFn(res.toTupleFn(), ...this._fns.slice(i)));
            else if (res instanceof Tuple && res.hasFn() && !OpPipeFn.isOpPipe(this._fns[i]))
                return new PipeFn(...[res.toTupleFn()].concat(this._fns.slice(i)));
            res = this._fns[i].apply(res, context);
        }
        return res;
    }
    toString() {
        return 'lambda expression';
    }
}
exports.PipeFn = PipeFn;
class OpPipeFn extends ComposedFn {
    constructor(... tuples) {
        super(... tuples);
        if (tuples.length != 2) {
            throw new FtlRuntimeError(`OpPipeFn has ${tuples.length} elements!`);
        }
    }
    static isOpPipe(fn) {
        if (fn instanceof OpPipeFn)
            return true;
        else if (fn instanceof PipeFn || fn instanceof TupleFn)
            return OpPipeFn.isOpPipe(fn._fns[0]);
        else
            return false;
    }
    apply(input, context) {
        function resolve_refs(input, first_tuple_elm, op2) {
            if (!input)
                return op2;
            if (op2 instanceof RefFn) {
                if (op2.isTupleSelector() || !(input instanceof Tuple) || first_tuple_elm instanceof TupleFn && first_tuple_elm.hasName(op2.name))
                    return op2;
                else {
                    let r = op2.apply(input);
                    return FnUtil.isNone(r) && op2 || (r instanceof Fn && r || new ConstFn(r));
                }
            }
            else if (op2 instanceof TupleFn) {
                op2._fns.forEach((f, i, array) => {
                    var converted = resolve_refs(input, first_tuple_elm, f);
                    if (converted != f) {
                        array[i] = converted;
                    }
                });
                return op2;
            }
            else if (op2 instanceof PipeFn) {
                resolve_refs(input, first_tuple_elm, op2._fns[0]);
                return op2;
            }
            else
                return op2;
        }
        let first_tuple_elm = this._fns[0].getFnAt(0);
        var res = first_tuple_elm.apply(input, context);
        if (res === first_tuple_elm)
            return this;
        if (res instanceof TailFn) {
            return new TailFn(new PipeFn(res, this._fns[1]));
        }
        else if (res instanceof Tuple && res.hasTail()) {
            return new TailFn(new PipeFn(res.toTupleFn(), this._fns[1]));
        }
        else if (res instanceof Tuple && res.getIndex(0) instanceof Fn) {
            return new PipeFn(...[res.toTupleFn()].concat(this._fns[1]));
        }
        let combined = new Tuple();
        combined.addValue(res);
        let op2 = resolve_refs(input, first_tuple_elm, this._fns[0].getFnAt(1));
        combined.addValue(op2);
        return this._fns[1].apply(combined, context);
    }
    toString() {
        return 'lambda expression';
    }
}
exports.OpPipeFn = OpPipeFn;
class RefFn extends Fn {
    constructor(name, module) {
        super();
        this.name = name;
        this.module = module;
        this.unresolved = false;
    }
    isRefType() {
        return false;
    }
    isTupleSelector() {
        return this.name.match(TupleSelectorPattern) != null;
    }
    static isInputSelector(name) {
        return name.match(TupleSelectorPattern) || InputSelectorPattern == name;
    }
    apply(input, context) {
        var e;
        if (this.name == InputSelectorPattern) {
            return input;
        }
        if (input && input instanceof Tuple)
            e = input.get(this.name);
        if (e !== undefined) {
            if (this.params != null) {
                if (typeof (e) == 'function') {
                    var args = [];
                    if (this.params instanceof RefFn)
                        args.push(input.get(this.params.name));
                    else if (this.params instanceof Fn) {
                        args = this.params.apply(input);
                        args = args instanceof Tuple ? args.toList() : [args];
                    }
                    else
                        for (var i = 0; i < this.params.size; i++)
                            args.push(input.get(this.params[i].name));
                    return e.apply(null, args);
                }
                else {
                    var tpl = this.params.apply(input);
                    if (this.params instanceof RefFn)
                        tpl = Tuple.fromNameValue(this.params.name, tpl);
                    else if (!(tpl instanceof Tuple))
                        tpl = Tuple.fromValue(tpl);
                    return e.apply(tpl);
                }
            }
            return e;
        }
        if (this.name == '_0' && input && !(input instanceof Tuple))
            return input;
        var f;
        if (this.module) {
            f = this.module.getAvailableFn(this.name);
        }
        if (f) {
            return f.apply(input, context);
        }
        return this;
    }
}
exports.RefFn = RefFn;
class FunctionHolder extends FunctionBaseFn {
    constructor(name, params) {
        super(name, params, null);
    }
    set wrapped(f) {
        this._body = f;
    }
}
exports.FunctionHolder = FunctionHolder;
class TupleSelectorFn extends Fn {
    constructor(seq) {
        if (seq < 0)
            throw new FnConstructionError('seq is smaller than 0!');
        super();
        this._seq = seq;
    }
    apply(input) {
        if (FnUtil.isNone(input))
            return this;
        if (input instanceof Tuple)
            return input.getIndex(this._seq);
        if (this._seq == 0)
            return input;
        return null;
    }
}
exports.TupleSelectorFn = TupleSelectorFn;
class SeqSelectorOrDefault extends TupleSelectorFn {
    constructor(seq, defaultFn) {
        var default_val = defaultFn.apply();
        if (default_val instanceof Fn)
            throw new FnConstructionError('defaultFn is not a constant or constant expresion!');
        super(seq);
        this._defaultValue = default_val;
    }
    get defaultValue() { return this._defaultValue; }
    apply(input) {
        var sv = super.apply(input);
        if (sv !== undefined && sv != null && sv != this)
            return sv;
        return this._defaultValue;
    }
}
exports.SeqSelectorOrDefault = SeqSelectorOrDefault;
class ExprFn extends WrapperFn {
    constructor(f, ...paramtuples) {
        super(f);
        this._paramTuples = paramtuples;
    }
    apply(input, context) {
        var ret = super.apply(input);
        for (var i = 0; i < this._paramTuples.length; i++)
            ret = ret.toTupleFn().apply(this._paramTuples[i].apply(input, context));
        return ret instanceof Tuple && ret.size == 1 ? ret.get('_0') : ret;
    }
    toString() {
        return 'expression';
    }
}
exports.ExprFn = ExprFn;
class CallExprFn extends Fn {
    constructor(name, f, params) {
        super();
        this.f = f;
        this.name = name;
        this.params = params;
    }
    apply(input, context) {
        var f = !this.f ? input.get(this.name) : this.f;
        if (!(f instanceof Fn))
            throw new FtlRuntimeError(this.name + " is not a functional expression. Can not be invoked as " + this.name + "(...)");
        if (f instanceof RefFn)
            f = f.apply(input);
        let intermediate = this.params[0].apply(input);
        let ret;
        if (typeof f == 'function') {
            if (intermediate instanceof Tuple) {
                ret = f(...intermediate.toList());
            }
            else {
                ret = f(intermediate);
            }
        }
        else {
            ret = f.apply(intermediate);
        }
        for (var i = 1; i < this.params.length; i++)
            return ret.apply(this.params[i].apply(input));
        return ret;
    }
}
exports.CallExprFn = CallExprFn;
class ExprRefFn extends WrapperFn {
    constructor(fnl, expr) {
        if (!(fnl instanceof FunctionInterfaceFn))
            throw new FtlRuntimeError("functional is not instanceof FunctionInterfaceFn");
        super(expr);
        this.fnl = fnl;
    }
    apply(input) {
        return new ClosureFunction(this._wrapped, input);
    }
}
exports.ExprRefFn = ExprRefFn;
class TailFn extends WrapperFn {
    constructor(fn, closure) {
        super(fn);
        this._tails = new Array();
        this.name = null;
        this.closure = closure;
        if (fn instanceof PipeFn) {
            var first = fn.first;
            if (TailFn.isTail(first)) {
                fn.replaceAt(0, first._wrapped);
            }
            else if (first instanceof TupleFn) {
                this.addTail(first);
            }
        }
    }
    tailWrapper() {
        return this;
    }
    addTail(tail) {
        if (tail.find(elm => TailFn.isTail(elm)) !== undefined) {
            this._tails.unshift(tail);
        }
        else {
            tail.filter(elm => elm instanceof TupleFn).forEach(elm => {
                this.addTail(elm);
            });
        }
    }
    addAllTails(tail) {
        var t;
        while (t = tail.nextTail()) {
            this.addTail(t);
        }
    }
    hasTail() {
        return this._tails.length > 0;
    }
    nextTail() {
        return this._tails.pop();
    }
    static isTail(elm) {
        return elm instanceof TailFn;
    }
    ResolveNextTail(context) {
        var tail = this.nextTail();
        if (!tail) {
            return this;
        }
        var i = 0;
        for (let elm of tail.fns) {
            if (TailFn.isTail(elm)) {
                let inner_tail = elm;
                var next = elm.apply(null, context);
                if (TailFn.isTail(next)) {
                    this.addAllTails(next);
                    tail.replaceAt(i, inner_tail.name ? new NamedExprFn(inner_tail.name, next.wrapped) : next.wrapped);
                }
                else {
                    tail.replaceAt(i, inner_tail.name ? new NamedExprFn(inner_tail.name, next instanceof Fn ? next : new ConstFn(next)) : next);
                }
            }
            i++;
        }
        return this;
    }
    apply(input, context) {
        var res = this._wrapped.apply(this.closure, context);
        if (res instanceof TailFn)
            return res;
        else if (res instanceof Tuple && res.hasTail())
            return new TailFn(res.toTupleFn());
        return new ConstFn(res);
    }
}
class ArrayInitializerFn extends Fn {
    constructor(...values) {
        super();
        this._values = values;
    }
    get size() { return this._values.length; }
    get first() { return this.size > 0 && this._values[0]; }
    apply(input, context) {
        var ret = [];
        this._values.forEach((v) => {
            let val = v.apply(input, context);
            if (Array.isArray(val)) {
                ret.splice(ret.length, 0, ...val);
            }
            else {
                ret.push(v.apply(input, context));
            }
        });
        return ret;
    }
}
exports.ArrayInitializerFn = ArrayInitializerFn;
class ArrayInitializerWithRangeFn extends Fn {
    constructor(startValue, endValue, interval) {
        super();
        this._startValue = startValue;
        this._endValue = endValue;
        this._interval = interval;
    }
    get startValue() { return this._startValue; }
    get endValue() { return this._endValue; }
    get interval() { return this._interval; }
    apply(input, context) {
        let start = this._startValue.apply(input, context);
        let interval = this._interval.apply(input, context);
        let end = this._endValue.apply(input, context);
        let len = Math.floor((end + interval - start) / interval);
        var array = new Array(len);
        var val = start;
        for (var i = 0; i < len; i++) {
            array[i] = val;
            val += interval;
        }
        return array;
    }
}
exports.ArrayInitializerWithRangeFn = ArrayInitializerWithRangeFn;
class ArrayElementSelectorFn extends NamedFn {
    constructor(name, index) {
        super(name);
        this._index = index instanceof ConstFn ? index.apply(null) : index;
        if (Array.isArray(this._index)) {
            if (this._index.length == 1) {
                this._index = this._index[0];
            }
            else {
                throw new FnConstructionError('multiple selectors not supported yet!');
            }
        }
    }
    get index() { return this._index; }
    apply(input) {
        let list = input && (input instanceof Tuple && (input.get(this.name) || null)
            || ((this.name == '_' || this.name == '_0') && input)
            || []);
        if (list instanceof VarFn)
            list = list.value;
        let index = typeof this._index == 'number' ? this._index : this._index.apply(input);
        if (list)
            return list[index] || null;
        else
            return this;
    }
}
exports.ArrayElementSelectorFn = ArrayElementSelectorFn;
class ArrayRangeSelectorFn extends Fn {
    constructor(name, start, end, interval = 1) {
        super();
        this.name = name;
        this.start = start;
        this.end = end;
        this.interval = interval;
    }
    apply(input) {
        let list = input && (input instanceof Tuple && (input.get(this.name) || null)
            || ((this.name == '_' || this.name == '_0') && input)
            || []);
        let end = this.end == -1 ? list.length : this.end + 1;
        let len = Math.ceil((end - this.start) / this.interval);
        let ret = new Array(len);
        for (var i = this.start, j = 0; i < end; i += this.interval, j++) {
            ret[j] = list[i];
        }
        return ret;
    }
}
exports.ArrayRangeSelectorFn = ArrayRangeSelectorFn;
class BinaryOperatorWithPrefixFn extends Fn {
    constructor(operand1, operand2, f, prefix) {
        super();
        this.operand1 = operand1;
        this.operand2 = operand2;
        this.f = f;
        this.prefix = prefix;
    }
    apply(input, context) {
        let r1 = this.operand1.apply(input, context);
        let r2 = this.operand2.apply(input, context);
        return this.prefix.apply(Tuple.fromValues(r1, this.f, r2), context);
    }
}
exports.BinaryOperatorWithPrefixFn = BinaryOperatorWithPrefixFn;
class CurryExprFn extends Fn {
    constructor(expr, params) {
        super();
        this.expr = expr;
        this.params = params;
    }
    apply(input, module) {
        let res = this.expr;
        this.params.forEach(p => {
            res = res.apply(p.apply());
            if (res instanceof Tuple) {
                res = res.toTupleFn();
            }
        });
        return res instanceof Fn ? res.apply(input, module) : res;
    }
}
exports.CurryExprFn = CurryExprFn;
class ExecutableFn extends WrapperFn {
    constructor(wrapped) {
        super(wrapped);
    }
    apply() {
        return this._wrapped.applyAndResolve();
    }
}
exports.ExecutableFn = ExecutableFn;
class SideffectFn extends Fn {
    constructor(name, f, params) {
        if (!f) {
            throw new FtlRuntimeError('f not provided in SideffectFn!');
        }
        if (!(f instanceof Fn))
            throw new FtlRuntimeError(name + " is not a function!");
        super();
        this.f = f;
        this.name = name;
        this.params = params;
    }
    apply(input, context) {
        let args = input;
        if (input instanceof Tuple) {
            args = new Tuple();
            args.appendAll(input);
        }
        this.f.apply(this.params.apply(args), context);
        return input;
    }
}
exports.SideffectFn = SideffectFn;
class SideffectedFn extends WrapperFn {
    constructor(fn, sideffects) {
        super(fn);
        this.sideffects = sideffects;
    }
    get name() {
        return this._wrapped instanceof RefFn && this._wrapped.name || undefined;
    }
    apply(input, context) {
        for (let d of this.sideffects)
            d.apply(input, context);
        return super.apply(input, context);
    }
}
exports.SideffectedFn = SideffectedFn;
