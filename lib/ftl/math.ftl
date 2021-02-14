//
// basic math operators
//

fn x < y < z { return x < y && y < z }
fn x <= y < z { return x <= y && y < z }
fn x < y <= z { return x < y && y <= z }

//
// basic math functions
//
// They are all wrappers of javascript Math functions.
//

fn abs(x) { return Math.abs(x) }
fn acos(x) { Math.acos(x) }
fn acosh(x) { Math.acosh(x) }
fn asin(x) { Math.asin(x) }
fn asinh(x) { Math.asinh(x) }
fn atan(x) { Math.atan(x) }
fn atan2(x) { Math.atan2(x) }
fn atanh(x) { Math.atanh(x) }
fn cbrt(x) { return Math.cbrt(x) }
fn ceil(x) { return Math.ceil(x) }
fn clz32(x) { return Math.clz32(x) }
fn cos(x) { return Math.cos(x) }
fn cosh(x) { return Math.cosh(x) }
fn exp(x) { return Math.exp(x) }
fn expm1(x) { return Math.expm1(x) }
fn floor(x) { return Math.floor(x) }
fn fround(x) { return Math.fround(x) }
fn hypot(x) { return Math.hypot(x) }
fn imul(x) { return Math.imul(x) }
fn log(x) { return Math.log(x) }
fn log10(x) { return Math.log10(x) }
fn log1p(x) { return Math.log1p(x) }
fn log2(x) { return Math.log2(x) }
fn max(x, y) { return Math.max(x, y) }
fn min(x, y) { return Math.min(x, y) }
fn pow(base, exponent) { return Math.pow(base, exponent) }
fn random() { return Math.random() }
fn round(x) { return Math.round(x) }
fn sign(x) { return Math.sign(x) }
fn sin(x) { return Math.sin(x) }
fn sinh(x) { return Math.sinh(x) }
fn sqrt(x) { return Math.sqrt(x) }
fn tan(x) { return Math.tan(x) }
fn tanh(x) { return Math.tanh(x) }
fn trunc(x) { return Math.trunc(x) }

fn PI() { return Math.PI }
