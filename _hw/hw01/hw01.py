"""Homework 1: Functions."""


from operator import add, sub

def a_plus_abs_b(a, b):
    """Return a+abs(b), but without calling abs.

    >>> a_plus_abs_b(2, 3)
    5
    >>> a_plus_abs_b(2, -3)
    5
    >>> a_plus_abs_b(-1, 4)
    3
    >>> a_plus_abs_b(-1, -4)
    3
    """
    if b < 0:
        f = _____
    else:
        f = _____
    return f(a, b)


def two_of_three(i, j, k):
    """Return m*m + n*n, where m and n are the two smallest members of the
    positive numbers i, j, and k.

    >>> two_of_three(1, 2, 3)
    5
    >>> two_of_three(5, 3, 1)
    10
    >>> two_of_three(10, 2, 8)
    68
    >>> two_of_three(5, 5, 5)
    50
    """
    return _____


def move_to_end(n, k):
    """Return n with the digit at position k moved to the end.

    >>> move_to_end(97531, 2)
    97315
    >>> move_to_end(97531, 0)
    97531
    >>> move_to_end(97531, 4)
    75319
    >>> move_to_end(97531, 10)
    975310
    """
    return ____

def pick_digit(n, k):
    """Return the k-th digit from the right of n.

    >>> pick_digit(3579, 2)
    5
    >>> pick_digit(3579, 0)
    9
    >>> pick_digit(3579, 10)
    0
    """
    return ____

def cut(n, k):
    """Return n with the kth digit from the right removed.

    >>> cut(3579, 2)
    379
    >>> cut(3579, 0)
    357
    >>> cut(3579, 1)
    359
    >>> cut(3579, 5)
    3579
    """
    return ____


def print_smaller(x, y):
    """Print the smaller of x and y and return the larger.

    >>> print_smaller(print_smaller(5, 3), print_smaller(4, 6))
    3
    4
    5
    6
    """
    "*** YOUR CODE HERE ***"
