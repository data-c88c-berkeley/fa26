"""Homework 6: List Mutation."""


from __future__ import annotations
from link import Link, LinkedList


def deep_map(f, s: list) -> None:
    """Replace all non-list elements x with f(x) in the nested list s.

    >>> six = [1, 2, [3, [4], 5], 6]
    >>> deep_map(lambda x: x * x, six)
    >>> six
    [1, 4, [9, [16], 25], 36]
    >>> # Check that you're not making new lists
    >>> s = [3, [1, [4, [1]]]]
    >>> s1 = s[1]
    >>> s2 = s1[1]
    >>> s3 = s2[1]
    >>> deep_map(lambda x: x + 1, s)
    >>> s
    [4, [2, [5, [2]]]]
    >>> s1 is s[1]
    True
    >>> s2 is s1[1]
    True
    >>> s3 is s2[1]
    True
    """
    "*** YOUR CODE HERE ***"


def all_odd_sums(s: LinkedList[int]) -> list[int]:
    """Return all odd sums of some of the items in s, in ascending order.

    >>> all_odd_sums(Link(1, Link(5, Link(3))))  # sums are 0, 1, 3, 4, 5, 6, 8, 9
    [1, 3, 5, 9]
    >>> all_odd_sums(Link(3, Link(5, Link(4))))  # sums are 0, 3, 4, 5, 7, 8, 9, 12
    [3, 5, 7, 9]
    >>> all_odd_sums(Link(2, Link(1, Link(3))))  # 3 appears only once
    [1, 3, 5]
    >>> all_odd_sums(Link(2, Link(4)))
    []
    """
    sums = []
    def f(s: LinkedList[int], total: int) -> None:
        """Append to sums each unique odd total + (a sum of some items in s)."""
        "*** YOUR CODE HERE ***"
    f(s, 0)
    return sorted(sums)


def adder(x: list[int], y: list[int]) -> list[int]:
    """Add y into x, where x and y are lists of digits representing positive numbers.

    >>> a = [3, 4, 5]
    >>> adder(a, [5, 5])           #  345 +    55 =   400
    [4, 0, 0]
    >>> adder(a, [8, 3, 4])        #  400 +   834 =  1234
    [1, 2, 3, 4]
    >>> adder(a, [3, 3, 3, 3, 3])  # 1234 + 33333 = 34567
    [3, 4, 5, 6, 7]
    >>> a
    [3, 4, 5, 6, 7]
    >>> b = [9, 9, 9, 4, 5]
    >>> adder(b, [5, 5])           # 99945 +    55 = 100000
    [1, 0, 0, 0, 0, 0]
    >>> adder([5, 5], b)           #    55 + 100000 = 100055
    [1, 0, 0, 0, 5, 5]
    >>> b                          # y is not changed
    [1, 0, 0, 0, 0, 0]
    """
    assert max(x + y) <= 9 and min(x + y) >= 0, 'x and y should contain only digits'
    "*** YOUR CODE HERE ***"
    return x
