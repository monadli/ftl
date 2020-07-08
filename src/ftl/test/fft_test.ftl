import ftl/lang[==, /, *, -, '- ', '?? ::', '? :']
import ftl/math[PI, cos, sin]

// ffts contains two tuples, one as result of fft for even part, the other for odd part
fn ffts ** exponents {
  let [c_r, c_i] = exponents.toList()
  let [f_e, f_o] = ffts.toList()
  let [x_e_r, x_e_i] = f_e.toList()
  let [x_o_r, x_o_i] = f_o.toList()

  let N = c_r.length * 2
  var real = new Array(N)
  var imag = new Array(N)

  for (var k = 0; k < N / 2; k++) {
    var t_r = x_e_r[k], t_i = x_e_i[k]
    var o_r = x_o_r[k], o_i = x_o_i[k]
    
    var e_r = o_r * c_r[k] - o_i * c_i[k]
    var e_i = o_r * c_i[k] + o_i * c_r[k]

    real[k] = t_r + e_r
    imag[k] = t_i + e_i

    real[k + (N / 2)] = t_r - e_r
    imag[k + (N / 2)] = t_i - e_i
  }

  return ftl.Tuple.fromList(real, imag)
}

fn fft(real, imag, N) -> N == 1 ?? (real, imag) ::
  ( ((real[0:2:], imag[0:2:], N/2) -> fft, (real[1:2:], imag[1:2:], N/2) -> fft ) ** (([0:(N/2 - 1)]) .* (-2 * PI() / N) -> (.cos, .sin))   )

fft([0, 1], [1, 0], 2) == ([1, -1], [1, 1])
