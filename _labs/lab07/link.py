from __future__ import annotations

from dataclasses import dataclass

type LinkedList[T] = Link[T] | tuple[()]

@dataclass
class Link[T]:
    """A Link has a first value of type T and the rest of the linked list.

    The rest is either another Link or the empty tuple.

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
    """
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
