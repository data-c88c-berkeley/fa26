"""Lab 7: Linked Lists."""


from __future__ import annotations
from link import Link, LinkedList


def change[T](s: LinkedList[T], old: T, new: T) -> LinkedList[T]:
    """Returns a linked list matching s but with all instances of old (if any)
    replaced by new.

    >>> s = Link(1, Link(2, Link(3)))
    >>> t = change(s, 3, 1)
    >>> print(t)
    (1 2 1)
    >>> u = change(t, 1, 2)
    >>> print(u)
    (2 2 2)
    >>> v = change(u, 5, 1)
    >>> print(v)
    (2 2 2)
    >>> print(s)   # The original linked list s is unchanged.
    (1 2 3)
    """
    "*** YOUR CODE HERE ***"  # replace the code below
    return ()


def without(s: LinkedList, i: int) -> LinkedList:
    """Return a linked list like s but without the element at index i.

    >>> s = Link(3, Link(5, Link(7, Link(9))))
    >>> print(without(s, 0))
    (5 7 9)
    >>> print(without(s, 2))
    (3 5 9)
    >>> print(without(s, 4))  # There is no index 4, so all of s is retained.
    (3 5 7 9)
    >>> print(s)              # The original linked list s is unchanged.
    (3 5 7 9)
    >>> without((), 0)
    ()
    """
    "*** YOUR CODE HERE ***"  # replace the code below
    return ()


def store_digits(n: int) -> LinkedList[int]:
    """Stores the digits of a positive number n in a linked list.

    >>> s = store_digits(1)
    >>> s
    Link(first=1, rest=())
    >>> print(store_digits(2345))
    (2 3 4 5)
    >>> print(store_digits(876))
    (8 7 6)
    >>> print(store_digits(2450))
    (2 4 5 0)
    >>> print(store_digits(20105))
    (2 0 1 0 5)
    >>> # a check that you do not use str or reversed
    >>> import inspect, ast
    >>> [n.id for n in ast.walk(ast.parse(inspect.getsource(store_digits)))
    ...  if isinstance(n, ast.Name) and n.id in ('str', 'reversed')]
    []
    """
    "*** YOUR CODE HERE ***"  # replace the code below
    return ()
