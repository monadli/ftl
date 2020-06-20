import ftl/lang[==, '?? ::', '? :']

fn exponents(N) {
    let factor = -2 * Math.PI / N
    let real_exps = new Array(N)
    let imag_exps = new Array(N)
    for (var i = 0; i < N; i++) {
      let x = factor * i
      real_exps[i] = Math.cos(x)
      imag_exps[i] = Math.sin(x)
    }

    return ftl.Tuple.fromList(real_exps, imag_exps)
}

fn len(list) {
  return list.length;
}

// ffts contains two tuples, one as result of fft for even part, the other for odd part
fn ffts ** exponents {
  let [c_r, c_i] = exponents.toList()
  let [f_e, f_o] = ffts.toList()
  let [x_e_r, x_e_i] = f_e.toList()
  let [x_o_r, x_o_i] = f_o.toList()

  let N = c_r.length
  var real = new Array(N)
  var imag = new Array(N)

  for (var k = 0; k < N / 2; k++) {
    var t_r = x_e_r[k], t_i = x_e_i[k]
    var o_r = x_o_r[k], o_i = x_o_i[k]
    
    var e_r = o_r * c_r[k] - o_i * c_i[k]
    var e_i = o_r * c_i[k] + o_i & c_r[k]

    real[k] = t_r + e_r
    imag[k] = t_i + e_i

    real[k + (N / 2)] = t_r - e_r
    imag[k + (N / 2)] = t_i - e_i
  }

  return ftl.Tuple.fromList(real, imag)
}

fn interlace(real, imag, start) {
  return ftl.Tuple.fromList(real.filter((elm, index) => index % 2 == start), imag.filter((elm, index) => index % 2 == start))
}


fn fft(real, imag) -> len(real) == 1 ?? (real, imag) ::
  (    (interlace(real, imag, 0) -> fft, interlace(real, imag, 1) -> fft) ** exponents(len(real))   )


fft([0, 1], [1, 0]) == ([1, -1], [1, 1])
