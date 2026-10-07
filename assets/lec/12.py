from __future__ import annotations
from dataclasses import dataclass

type LinkedList[T] = Link[T] | tuple[()]

@dataclass
class Link[T]:
    "A Link has a first value of type T and the rest of the linked list."
    first: T
    rest: LinkedList[T] = ()  # rest defaults to an empty linked list

    def __str__(self):
        return format_link(self)

def format_link(s: Link):
    """Return a Link s formatted as items within parentheses."""
    string = '(' + str(s.first)
    remaining = s.rest
    while isinstance(remaining, Link):
        string += ' ' + str(remaining.first)
        remaining = remaining.rest
    assert remaining == (), f'{s!r} is not a LinkedList'
    return string + ')'


def longest(s: list[int], n: int) -> list[int] | None:
    """Return the longest sublist of s that sums to n, or None if none exists.

    >>> longest([4, 1, 3, 2], 6)
    [1, 3, 2]
    >>> longest([5, 1, 2, 2], 5)
    [1, 2, 2]
    >>> longest([3, 1, 4], 6)
    """
    if len(s) == 0:
        if n == 0:
            return []
        else:
            return None
    minus_first = longest(s[1:], n - s[0])
    without_first = longest(s[1:], n)
    if isinstance(minus_first, list):
        with_first = [s[0]] + minus_first
        if isinstance(without_first, list):
            return max(with_first, without_first, key=len)
        else:
            return with_first
    else:
        return without_first



def examples():
    """
    >>> s = Link(3, Link(4, Link(5)))
    >>> s.first
    3
    >>> s.rest.first
    4
    >>> s.rest.rest.first
    5
    >>> s.rest.rest.rest == ()
    True
    >>> s
    Link(first=3, rest=Link(first=4, rest=Link(first=5, rest=())))
    >>> s.rest.rest
    Link(first=5, rest=())
    >>> print(s)
    (3 4 5)
    >>> print(Link(s))
    ((3 4 5))
    >>> print(Link(3, Link(Link(4, Link(5)), Link(6))))
    (3 (4 5) 6)
    """

def len_link(s: LinkedList):
    """Return the length of a linked list.

    >>> len_link(Link(3, Link(4, Link(5))))
    3
    """
    length = 0
    while isinstance(s, Link):
        length += 1
        s = s.rest
    return length

def getitem_link(s: LinkedList, i: int):
    """Return the item at index i of a non-empty linked list.

    >>> getitem_link(Link(3, Link(4, Link(5))), 1)
    4
    """
    while i > 0:
        assert isinstance(s, Link), 'Index out of range'
        s = s.rest
        i -= 1
    assert isinstance(s, Link), 'Index out of range'
    return s.first

def sum_link(s: LinkedList[float]) -> float:
    """Return the sum of the items in a linked list of numbers.

    >>> sum_link(Link(3, Link(4, Link(5))))
    12
    """
    total = 0
    while isinstance(s, Link):
        total += s.first
        s = s.rest
    return total

four = Link(1, Link(2, Link(3, Link(4))))

def len_link_recursive(s: LinkedList) -> int:
    """Return the length of a linked list s.

    >>> len_link_recursive(four)
    4
    """
    if not isinstance(s, Link):
        return 0
    return 1 + len_link_recursive(s.rest)

def getitem_link_recursive(s: LinkedList, i: int):
    """Return the item at index i of linked list s.

    >>> getitem_link_recursive(four, 2)
    3
    """
    assert isinstance(s, Link), 'Index out of range'
    if i == 0:
        return s.first
    return getitem_link_recursive(s.rest, i - 1)

def sum_link_recursive(s: LinkedList[float]) -> float:
    """Return the sum of the items in a linked list of numbers.

    >>> sum_link_recursive(four)
    10
    """
    if not isinstance(s, Link):
        return 0
    return s.first + sum_link_recursive(s.rest)

def range_link(start: int, end: int) -> LinkedList[int]:
    """Return a linked list containing the items of range(start, end).

    >>> print(range_link(3, 7))
    (3 4 5 6)
    """
    s = ()
    k = end - 1
    while start <= k:
        s = Link(k, s)
        k = k - 1
    return s

def range_link_tail(start: int, end: int) -> LinkedList[int]:
    """Return a linked list containing the items of range(start, end).

    >>> print(range_link_tail(3, 7))
    (3 4 5 6)
    """
    def f(k, s):
        if k < start:
            return s
        else:
            return f(k-1, Link(k, s))
    return f(end-1, ())

def range_link_reverse(start: int, end: int) -> LinkedList[int]:
    """Return a linked list containing the items of range(start, end).

    >>> print(range_link_reverse(3, 7))
    (3 4 5 6)
    """
    s = ()
    k = start
    while k < end:
        s = Link(k, s)
        k = k + 1
    t = ()
    while isinstance(s, Link):
        t = Link(s.first, t)
        s = s.rest
    return t


def extend_link(s: LinkedList, t: LinkedList) -> LinkedList:
    """Return a linked list with the items of s followed by those of t.

    >>> print(extend_link(four, Link(5, Link(6))))
    (1 2 3 4 5 6)
    """
    if not isinstance(s, Link):
        return t
    else:
        return Link(s.first, extend_link(s.rest, t))

def range_link_recursive(start: int, end: int) -> LinkedList[int]:
    """Return a linked list containing the items of range(start, end).

    >>> print(range_link_recursive(3, 7))
    (3 4 5 6)
    """
    if start >= end:
        return ()
    else:
        return Link(start, range_link_recursive(start + 1, end))

def map_link(f, s: LinkedList) -> LinkedList:
    """Return a linked list of f applied to each item of s.

    >>> print(map_link(lambda x: x * x, four))
    (1 4 9 16)
    """
    if not isinstance(s, Link):
        return s
    else:
        return Link(f(s.first), map_link(f, s.rest))

def filter_link(f, s: LinkedList) -> LinkedList:
    """Return a linked list with the items of s for which f returns a true value.

    >>> print(filter_link(lambda x: x % 2 == 0, range_link(1, 10)))
    (2 4 6 8)
    """
    if not isinstance(s, Link):
        return s
    else:
        kept = filter_link(f, s.rest)
        if f(s.first):
            return Link(s.first, kept)
        else:
            return kept

def join_link(s: LinkedList, separator: str) -> str:
    """Return a string of all items in s separated by separator.

    >>> join_link(four, " + ")
    '1 + 2 + 3 + 4'
    """
    if not isinstance(s, Link):
        return ""
    elif not isinstance(s.rest, Link):
        return str(s.first)
    else:
        return str(s.first) + separator + join_link(s.rest, separator)

def partitions(n: int, m: int) -> list[LinkedList[int]]:
    """Return a list of partitions of n using parts of up to m.
    Each partition is represented as a linked list.
    """
    if n == 0:
        return [()] # A list containing the empty partition
    elif n < 0 or m == 0:
        return []
    else:
        with_m = [Link(m, s) for s in partitions(n-m, m)]
        without_m = partitions(n, m-1)
        return with_m + without_m

def print_partitions(n: int, m: int) -> None:
    """Print the partitions of n using parts up to size m.

    >>> print_partitions(6, 4)
    4 + 2
    4 + 1 + 1
    3 + 3
    3 + 2 + 1
    3 + 1 + 1 + 1
    2 + 2 + 2
    2 + 2 + 1 + 1
    2 + 1 + 1 + 1 + 1
    1 + 1 + 1 + 1 + 1 + 1
    """
    for p in partitions(n, m):
        print(join_link(p, " + "))
