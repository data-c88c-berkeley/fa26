# Trees

from __future__ import annotations
from dataclasses import dataclass, field

@dataclass
class Tree[T]:
    """A Tree has a label (of type T) and a list of branches, which are trees.

    >>> t = Tree(3, [Tree(1, []), Tree(2, [Tree(1, []), Tree(1, [])])])
    >>> t.branches[0]
    Tree(label=1, branches=[])
    >>> len(t.branches)
    2
    >>> t.branches[1].label
    2
    >>> len(t.branches[1].branches)
    2
    >>> expr = Tree(10, [Tree(6, [Tree(2), Tree('*'), Tree(3)]), Tree('+'), Tree(4)])
    >>> print(expr)
    10
      6
        2
        *
        3
      +
      4
    """
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
    return not t.branches

t = Tree(1, 
         [Tree(9, [
             Tree(2, [
                 Tree(5, [
                     Tree(6), 
                     Tree(7)]), 
                 Tree(8), 
                 Tree(3)]), 
             Tree(4)])])

def print_leaves(t):
    """print the leaf labels of Tree t."""
    if is_leaf(t):
        print(t.label)
    else:
        for b in t.branches:
            print_leaves(b)

def count_leaves(t: Tree) -> int:
    """The number of leaves in tree.

    >>> count_leaves(t)
    5
    """
    if is_leaf(t):
        return 1
    else:
        return sum([count_leaves(b) for b in t.branches])

def largest_label(t: Tree):
    """Return the largest leaf label in t.

    >>> largest_label(Tree(6, [Tree(4), Tree(5), Tree(3)]))
    6
    """
    if is_leaf(t):
        return t.label
    else:
        return max([largest_label(b) for b in t.branches] + [t.label])

def largest_path_sum(t: Tree):
    """Return the largest sum of the labels along a path from the root to a leaf.

    >>> largest_path_sum(t)
    24
    """
    if is_leaf(t):
        return t.label
    else:
        return t.label + max([largest_path_sum(b) for b in t.branches])
