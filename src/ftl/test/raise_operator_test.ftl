import ftl/lang[*, ==]
import ftl/math.cos

// raise '*' operator
[1, 2] .* 2 == [2, 4]

// raise cos function
[1, 2] -> .cos = [cos(1), cos(2)]
