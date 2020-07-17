import ftl/lang[==, +, -, *, /, '- ', '?? ::']
import ftl/math[PI, cos, sin]

fn fft(real, imag, N) -> N == 1 ?? (real, imag) ::
  (
    (
      fft_e:     (real[0:2:], imag[0:2:], N/2) -> fft,
      fft_o:     (real[1:2:], imag[1:2:], N/2) -> fft,
      exponents: ([0:(N/2 - 1)]) .* (-2 * PI() / N) -> (.cos, .sin)
    )
    ->
    (
      x_e_r: fft_e._0,
      x_e_i: fft_e._1, 
      x_o_r: fft_o._0,
      x_o_i: fft_o._1,
      c_r:exponents._0,
      c_i:exponents._1
    )
    ->
    (
      x_e_r: x_e_r,
      x_e_i: x_e_i,
      e_r: x_o_r .* c_r .- (x_o_i .* c_i),
      e_i: x_o_r .* c_i .+ (x_o_i .* c_r)
    )
    -> ([x_e_r .+ e_r, x_e_r .- e_r], [x_e_i .+ e_i, x_e_i .- e_i])
  )

fft([0, 1], [1, 0], 2) == ([1, -1], [1, 1])
