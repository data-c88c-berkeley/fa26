def cube(k):
    return pow(k, 3)

common_ratio = 1/2
def term_maker(common_ratio):
    return lambda k: pow(common_ratio, k)
term = term_maker(common_ratio)

common_ratio = 1/3

def summation(n, term):
    """Sum the first n terms of a sequence.

    >>> summation(5, cube)
    225
    """
    common_ratio = 1/4
    total, k = 0, 1
    while k <= n:
        total, k = total + term(k), k + 1
    return total

common_ratio = 1/5

print(summation(5, term))

# (lambda f: lambda x: f(f(x)))(lambda y: y * y)(3)