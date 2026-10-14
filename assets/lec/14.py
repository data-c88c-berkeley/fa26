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

def above_first(s: LinkedList):
    """ Print all of the labels of t that are larger than first.
    
    >>> above_first(Link(3, Link(5, Link(1))))
    5
    >>> above_first(Link(3, Link(0, Link(8, Link(5)))))
    8
    5
    """
    def process(t: LinkedList):
        if isinstance(t, Link):
            if t.first > s.first:
                print(t.first)
            process(t.rest)
    process(s)

def above_first_new(s: LinkedList):
    """ Return a new list with only the items in s larger than first.
    
    >>> above_first_new(Link(3, Link(5, Link(1))))
    Link(first=5, rest=())
    >>> above_first_new(Link(3, Link(0, Link(8, Link(5)))))
    Link(first=8, rest=Link(first=5, rest=()))
    """
    def process(t: LinkedList) -> LinkedList:
        if not isinstance(t, Link):
            return ()
        if t.first > s.first:
            return Link(t.first, process(t.rest))
        return process(t.rest)
    return process(s)


def smallest_ones_digit(s: list[int]):
    """ Return the number in s with the smallest ones digit.

    >>> smallest_ones_digit([45, 8, 91, 107])
    91
    """
    return min(s, key = lambda x: x % 10)

def closest_to_index(s):
    """ Return the item in non-empty list s whose value has the
    smallest absolute difference from its index.
    
    >>> closest_to_index([8, 3, 10])
    3
    >>> closest_to_index([-3, 2, 100])
    2
    """
    smallest = 0
    for i in range(len(s)):
        if abs(i - s[i]) < abs(smallest - s[smallest]):
            smallest = i
    return s[smallest]

def closest_to_index2(s):
    """ Return the item in non-empty list s whose value has the
    smallest absolute difference from its index.
    
    >>> closest_to_index2([4, 2, 10])
    2
    >>> closest_to_index2([-1, 100])
    -1
    """
    return s[min(range(len(s)), key=lambda i: abs(i - s[i]))]

def aggregation_examples():
    quiz_practices = {'Bruno': 12, 'Rabia': 20, 'Riley': 52, 'John': 1}
    students = ['Riley', 'Rabia', 'Bruno', 'John']
    print("Total practices", sum([quiz_practices[name] for name in students]))
    print("Fewest practices", min([quiz_practices[name] for name in students]))

def everyone_practiced(practices, students):
    """ Return true if all of the students did 1 or more practices.

    >>> everyone_practiced({'Bruno': 12, 'Rabia': 20}, ['Chris', 'Bruno', 'Rabia'])
    False
    >>> everyone_practiced({'Bruno': 12, 'Rabia': 20, 'Chris': 0}, ['Chris', 'Bruno', 'Rabia'])
    False
    >>> everyone_practiced({'Bruno': 12, 'Rabia': 20}, ['Bruno', 'Rabia'])
    True
    """
    return all([s in practices and practices[s] > 0 for s in students])

def anyone_practiced(practices, students, n):
    """ Return true if any of the students did n or more practices.
    >>> anyone_practiced({'Bruno': 12, 'Rabia': 20}, ['Chris', 'Bruno', 'Rabia'], 50)
    False
    >>> anyone_practiced({'Bruno': 12, 'Rabia': 20}, ['Bruno', 'Rabia'], 2)
    True
    """
    return any([s in practices and practices[s] > n for s in students])

def practiced_most(practices, students):
    """ Return the name of the student who practiced most.
    
    >>> practiced_most({'Bruno': 12, 'Rabia': 20}, ['Bruno', 'Rabia'])
    'Rabia'
    """
    return max(students, key=lambda s: practices[s])

