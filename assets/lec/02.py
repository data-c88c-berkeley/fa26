# Assignment

def ex():
    """
    >>> pow(2, 10)
    1024
    >>> max = pow
    >>> pow(2, 10)
    1024
    >>> pow = max
    >>> pow(2, 10)
    1024
    """

from operator import mul

def square(x):
    return mul(x,  x)
square(square(3))

def g(y):
    """
    >>> x = 2
    >>> g(x)
    5
    >>> g(3 * x) + 3
    16
    >>> x
    2
    >>> y = 3
    >>> g(y)
    7
    >>> y
    3
    """
    x = 2 * y
    return x + 1

# Print and None

def triple(x):
    return 3 * x # versus print(x)

def noisy(x):
    """
    >>> noisy(noisy(2) + noisy(3))
    NOISY 2
    NOISY 3
    NOISY 7
    8
    """
    print('NOISY', x)
    return x + 1

# Small expressions

def f(x):
    return x + 1
def g(x):
    return 2 * x - 1
def h(x, y):
    return int(str(x) + str(y))

class Number:
    def __init__(self, value):
        self.value = value

    def calls(self):
        return 0

    def __str__(self):
        return str(self.value)

class Call:
    """A call expression."""
    def __init__(self, f, operands):
        self.f = f
        self.operands = operands
        self.value = f(*[e.value for e in operands])

    def calls(self):
        return 1 + sum(o.calls() for o in self.operands)

    def __str__(self):
        return f'{self.f.__name__}({",".join([str(o) for o in self.operands])})'

def smalls(n):
    if n == 0:
        return [Number(5)]
    else:
        results = []
        for operand in smalls(n-1):
            results.append(Call(f, [operand]))
            results.append(Call(g, [operand]))
        for k in range(n):
            for first in smalls(k):
                for second in smalls(n-k-1):
                    if first.value > 0 and second.value > 0:
                        results.append(Call(h, [first, second]))
        return results

def print_smallest():
    result = []
    for i in range(10):
        result.extend([e for e in smalls(i) if e.value == 2026])

    for e in result:
        print(e, '->', e.value, 'has', e.calls(), 'calls')