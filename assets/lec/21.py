from __future__ import annotations
from dataclasses import dataclass, field

def prefixes(s):
    """Return a list of all of the list prefixes of s, including s.
    
    >>> prefixes([1, 2, 3])
    [[1], [1, 2], [1, 2, 3]
    """
    so_far = []
    result = []
    for x in s:
        so_far.append(x)
        result.append(so_far)
        # Fixed version: result.append(list(so_far))
    return result

@dataclass
class Tree[T]:
    label: T
    branches: list[Tree[T]] = field(default_factory=list)  # branches defaults to []

    def __str__(self):
        return format_tree(self)

def format_tree(t: Tree, indent='') -> str:
    "Format a tree with each branch indented below its label."
    assert isinstance(t, Tree), f'{t!r} is not a Tree'
    assert isinstance(t.branches, list), f'branches of {t!r} is not a list'
    string = indent + str(t.label)
    for b in t.branches:
        string += '\n' + format_tree(b, indent + '  ')
    return string

def is_leaf(t: Tree) -> bool:
    "Return whether a Tree t is a leaf with no branches."
    return not t.branches

def exclude(t, x):
    """Return a tree with the non-root nodes of tree t labeled anything but x.

    >>> t = Tree(1, [Tree(2, [Tree(2), Tree(3), Tree(4)]), Tree(5, [Tree(1)])])
    >>> print(exclude(t, 2))
    1
      3
      4
      5
        1
    """
    #filtered_branches = map(lambda y: exclude(y, x), t.branches)
    filtered_branches = [exclude(y, x) for y in t.branches]
    bs = []
    for b in filtered_branches:
        if b.label == x:
            bs.extend(b.branches)
        else:
            bs.append(b)
    return Tree(t.label, bs)

class A:
    x, y, z = 0, 1, 2

    def f(self):
        return [self.x, self.y, self.z]

class B(A):
    """What would Python Do?

    >>> A().f()

    [0, 1, 2]

    >>> B().f()

    _____________

    """
    x = 6
    def __init__(self):
        self.z = 'A'