"""Homework 8: Iterators."""


from collections.abc import Iterator
from itertools import count


def every_other(t: Iterator[int]) -> Iterator[int]:
    """Return an iterator over the items of t at even indices: the first,
    third, fifth, ... items.

    >>> def noisy(x):  # Print each item as it is taken from t
    ...     print('took', x)
    ...     return x
    >>> t = map(noisy, [10, 11, 12, 13, 14, 15])
    >>> s = every_other(t)  # Nothing is taken from t yet
    >>> next(s)             # Only 10 is taken from t
    took 10
    10
    >>> next(s)             # 11 and 12 are taken from t
    took 11
    took 12
    12
    >>> next(t)             # 13 has not been taken by every_other
    took 13
    13
    >>> list(every_other(iter([5, 6, 7, 8, 9])))
    [5, 7, 9]
    >>> list(every_other(iter([1, 2, 3, 4])))
    [1, 3]
    >>> list(every_other(iter([])))
    []
    """
    indexed = zip(count(), t)


def filter_by_index(f, t: Iterator[int]) -> Iterator[int]:
    """Return an iterator over each item of t for which f(i) is a true value,
    where i is the index of that item in t (starting with 0).

    >>> def noisy(x):  # Print each item as it is taken from t
    ...     print('took', x)
    ...     return x
    >>> t = map(noisy, [20, 21, 22, 23, 24, 25])
    >>> s = filter_by_index(lambda i: i == 1 or i == 2, t)  # Nothing is taken from t yet
    >>> next(s)
    took 20
    took 21
    21
    >>> next(s)
    took 22
    22
    >>> next(t)  # 23 has not been taken by filter_by_index
    took 23
    23
    >>> t = iter([10, 11, 12, 13, 14, 15, 16])
    >>> list(filter_by_index(lambda i: i % 3 == 0, t))  # Indices 0, 3, and 6
    [10, 13, 16]
    >>> list(filter_by_index(lambda i: i > 2, iter([5, 4, 3, 2, 1])))
    [2, 1]
    >>> list(filter_by_index(lambda i: False, iter([1, 2, 3])))
    []
    >>> squares = map(lambda x: x * x, iter(range(10)))
    >>> list(filter_by_index(lambda i: i in [2, 3, 5, 7], squares))
    [4, 9, 25, 49]
    """
    return ____


def increasing(t: Iterator[int]) -> bool:
    """Return whether each item in t after the first is larger than the item
    before it.

    >>> increasing(iter([1, 3, 4, 8]))
    True
    >>> increasing(iter([1, 3, 3, 8]))  # 3 is not larger than 3
    False
    >>> increasing(iter([5, 4]))
    False
    >>> increasing(iter([7]))
    True
    >>> increasing(iter([]))
    True
    >>> t = iter([2, 5, 9, 6, 7, 8])
    >>> increasing(t)  # Stops as soon as it reaches 6, which is not larger than 9
    False
    >>> next(t)        # 7 has not been taken by increasing
    7
    >>> s = map(lambda x: x % 5, range(20))  # 0, 1, 2, 3, 4, 0, 1, 2, ...
    >>> increasing(s)  # Stops as soon as it reaches the second 0
    False
    >>> next(s)
    1
    """
    "*** YOUR CODE HERE ***"


def map_up_to_n(f, t: Iterator[int], n: int) -> list:
    """Return a list of f(x) for up to n items x from t: the next n items of t,
    or all the rest of them if t has fewer than n items left.

    >>> t = iter([1, 2, 3, 4, 5, 6])
    >>> map_up_to_n(lambda x: x * x, t, 3)
    [1, 4, 9]
    >>> next(t)  # 4 has not been taken by map_up_to_n
    4
    >>> map_up_to_n(lambda x: x * x, t, 5)  # Only 5 and 6 are left in t
    [25, 36]
    >>> map_up_to_n(abs, iter([-1, -2]), 1)
    [1]
    >>> map_up_to_n(lambda x: x + 1, iter(range(10, 20)), 4)
    [11, 12, 13, 14]
    >>> def noisy(x):
    ...     print('took', x)
    ...     return x
    >>> t = map(noisy, [7, 8, 9, 10])
    >>> map_up_to_n(lambda x: -x, t, 2)
    took 7
    took 8
    [-7, -8]
    >>> map_up_to_n(lambda x: -x, t, 1)
    took 9
    [-9]
    >>> next(t)  # 10 has not been taken by map_up_to_n
    took 10
    10
    """
    "*** YOUR CODE HERE ***"
