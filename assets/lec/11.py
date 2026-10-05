# Dictionaries

def dict_demos():
    numerals = {'I': 1, 'V': 5, 'X': 10}
    numerals['X']
    # numerals['X-ray']
    # numerals[10]
    len(numerals)
    list(numerals)
    numerals.values()
    list(numerals.values())
    sum(numerals.values())
    dict([[3, 9], [4, 16]])
    numerals.get('X', 0)
    numerals.get('X-ray', 0)
    numerals.get('X-ray')
    {1: 2, 1: 3}
    {[1]: 2}
    {1: [2]}


def multiples(s, factors):
    """Create a dictionary where each factor is a key and each value 
    is the elements of s that are multiples of the key.
    
    >>> multiples([3, 4, 5, 6, 7, 8], [2, 3])
    {2: [4, 6, 8], 3: [3, 6]}
    >>> multiples([1, 2, 3, 4, 5], [2, 5, 8])
    {2: [2, 4], 5: [5], 8: []}
    """
    return {d: [x for x in s if x % d == 0] for d in factors}
    

# Partitions

def cp(n, m):
    """Count the ways to make n by summing positive pieces 
    up to m in increasing order.

    >>> cp(6, 4)
    9
    >>> cp(4, 2)
    3
    """
    if n == 0:
        return 1
    elif n < 0 or m == 0:
        return 0
    return cp(n-m, m) + cp(n, m-1)

def cp_fast(n, m):
    """Count the ways to make n by summing positive pieces 
    up to m in increasing order.

    >>> cp_fast(6, 4)
    9
    >>> cp_fast(4, 2)
    3
    """
    if n == 0:
        return 1
    elif m == 0:
        return 0
    if m > n:
        return cp_fast(n, m-1)
    return cp_fast(n-m, m) + cp_fast(n, m-1)

def cp_3total(n, m):
    """Count the ways to make n by summing positive pieces 
    up to m in increasing order using at most 3 pieces in the sum

    >>> cp_3total(6, 4)
    5
    >>> cp_3total(4, 2)
    2
    """
    return cp_3total_helper(n, m, 3)

def cp_3total_helper(n, m, k):
    """Count partitions of n using up to k pieces of size m or less."""
    if n == 0:
        return 1
    elif n < 0 or m == 0:
        return 0
    elif k == 0:
        return 0
    return cp_3total_helper(n-m, m, k-1) + cp_3total_helper(n, m-1, k)

def cp_3_of_each_piece(n, m):
    """Count the ways to make n by summing positive pieces 
    up to m in increasing order using at most 3 of any piece.

    >>> cp_3_of_each_piece(6, 4)
    7
    >>> cp_3_of_each_piece(4, 2)
    2
    """
    return cp_3_of_each_piece_helper(n, m, 3, 3)

def cp_3_of_each_piece_helper(n, m, k, t):
    """Count partitions of n using pieces of size m or less.
    At most k of m and at most t of each of the rest."""
    if n == 0:
        return 1
    elif n < 0 or m == 0:
        return 0
    if k == 0:
        return cp_3_of_each_piece_helper(n, m-1, t, t)
    return cp_3_of_each_piece_helper(n-m, m, k-1, t) + \
           cp_3_of_each_piece_helper(n, m-1, t, t)


# Data Classes

from dataclasses import dataclass

@dataclass
class Line:
    """A Line representation

    >>> c = Line(3, 4)
    >>> c.slope
    3
    >>> c.intercept
    4
    >>> c
    Line(slope=3, intercept=4)
    >>> type(c) == Line
    True
    >>> isinstance(c, Line)
    True
    >>> print(c)
    y = 3x + 4
    """
    slope: float
    intercept: float

    def __str__(self):
        return format_line(self)

def parallel(c: Line, d: Line) -> bool:
    return c.slope == d.slope

def format_line(c: Line) -> str:
    return 'y = ' + str(c.slope) + 'x + ' + str(c.intercept)

