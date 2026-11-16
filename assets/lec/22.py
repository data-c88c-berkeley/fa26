def iterator_demos():
    """Using iterators

    >>> s = [[1, 2], 3, 4, 5]
    >>> next(s)
    Traceback (most recent call last):
        ...
    TypeError: 'list' object is not an iterator
    >>> t = iter(s)
    >>> next(t)
    [1, 2]
    >>> next(t)
    3
    >>> list(t)
    [4, 5]
    >>> next(t)
    Traceback (most recent call last):
      File "<python-input-8>", line 1, in <module>
        next(t)
        ~~~~^^^
    StopIteration
    >>> u = iter(s)
    >>> next(u)
    [1, 2]
    >>> list(u) # Discussion question: what does this give you?
    [3, 4, 5]
    """

def discussion_question():
    """
    >>> a = [1, 2, 3]
    >>> b = [a, 4]
    >>> c = iter(a)
    >>> d = c
    >>> print(next(c))
    1
    >>> print(next(d))
    2
    >>> b
    [[1, 2, 3], 4]
    """

def loop(t):
    for x in t:
        print(x)

def loop_iter(t):
    while True:
        try:
            print(next(t))
        except StopIteration:
            return

def cube(k):
    # print("cubing", k)
    return pow(k, 3)

def summation(n, term):
    """Sum the first n terms of a sequence.
    
    >>> summation(5, cube)
    225
    """
    total, k = 0, 1
    while k <= n:
        total = total + term(k)
        k = k + 1
    return total

def summation_list_comprehension(n, term):
    """Sum the first n terms of a sequence.
    
    >>> summation_list_comprehension(5, cube)
    225
    """
    return sum([term(k) for k in range(1, n + 1)])

def summation_map(n, term):
    """Sum the first n terms of a sequence.
    
    >>> summation_map(5, cube)
    225
    """
    return sum(map(term, range(1, n + 1)))

def average(s):
    """Return the average of values in a list.

    >>> average([3, 4, 5, 6])
    4.5
    >>> average(map(lambda x: x * x, [3, 4, 5, 6]))
    Traceback (most recent call last):
        ...
    ZeroDivisionError: division by zero
    """
    return sum(s) / len(list(s))

def double(x):
    print('***', x, '=>', 2*x, '***')
    return 2*x

def map_demo():
    """Using built-in sequence functions.

    >>> bcd = ['b', 'c', 'd']
    >>> [x.upper() for x in bcd]
    ['B', 'C', 'D']
    >>> caps = map(lambda x: x.upper(), bcd)
    >>> next(caps)
    'B'
    >>> next(caps)
    'C'
    >>> s = range(3, 7)
    >>> doubled = map(double, s)
    >>> next(doubled)
    *** 3 => 6 ***
    6
    >>> next(doubled)
    *** 4 => 8 ***
    8
    >>> list(doubled)
    *** 5 => 10 ***
    *** 6 => 12 ***
    [10, 12]
    >>> all(map(double, range(-3, 3)))
    *** -3 => -6 ***
    *** -2 => -4 ***
    *** -1 => -2 ***
    *** 0 => 0 ***
    False
    """

from tree import *

def is_leafy(t) -> bool:
    "Return true if all of t's branches are leaves. "
    return all([is_leaf(b) for b in t.branches])
