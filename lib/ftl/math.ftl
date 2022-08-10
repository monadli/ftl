import ftl/lang

//
// basic math operators
//

fn x < y < z  -> x < y && (y < z)
fn x <= y < z -> x <= y && (y < z)
fn x < y <= z -> x < y && (y <= z)
fn x <= y <= z -> x <= y && (y <= z)

//
// basic math functions
//
// They are all wrappers of javascript Math functions.
//

fn abs(x) { return Math.abs(x) }
fn acos(x) { return Math.acos(x) }
fn acosh(x) { return Math.acosh(x) }
fn asin(x) { return Math.asin(x) }
fn asinh(x) { return Math.asinh(x) }
fn atan(x) { return Math.atan(x) }
fn atan2(x) { return Math.atan2(x) }
fn atanh(x) { return Math.atanh(x) }
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

fn x² -> x * x
fn x³ -> x² * x
fn x⁴ -> x³ * x

fn √x { return Math.sqrt(x) }
fn ∛x { return Math.cbrt(x) }
fn ∜x -> √(√x)

fn x × y { return x * y }
fn x ÷ y { return x / y }

fn x ∨ y -> max(x, y)
fn x ∧ y -> min(x, y)