import ftl/math[sin, '< <']

fn x < y < z { return x < y && y < z }

0 < 1 < 2
0 < sin(3.14) < 0.002
