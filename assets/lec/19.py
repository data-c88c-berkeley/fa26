from __future__ import annotations
from dataclasses import dataclass

@dataclass
class SimpleStudent:
    name: str
    mt2_points: int

class Student:
    """
    >>> bao = Student('Bao', False)
    >>> eve = Student('Eve', False)
    >>> bao.mt2_points
    0
    >>> bao.total_points()
    0
    >>> bao.assign_mt2_grade(26)
    >>> bao.mt2_points
    20
    >>> eve.mt2_points
    0
    """
    def __init__(self, name, in_mega):
        self.name = name
        self.discussion_points = 0
        if in_mega:
            self.discussion_points = 10
        self.mt2_points = 0
        self.a_plus_points = 0

    def total_points(self):
        return self.discussion_points + self.mt2_points

    def assign_mt2_grade(self, points):
        self.mt2_points = min(20, points)
        if points == 26:
            self.a_plus_points += 5

    def retake_mt2(self, points):
        """ Replaces MT2 grade with points, if points is higher than the existing MT2 grade.
         
        Caps mt2_grade at 20, even if points is higher.

        >>> s = Student('Bao', False)
        >>> s.assign_mt2_grade(8)
        >>> s.mt2_points
        8
        >>> s.retake_mt2(26)
        >>> s.mt2_points
        20
        """
        if points > self.mt2_points:
            self.mt2_points = min(points, 20)

def create_students(regular: list[str], mega: list[str]) -> dict[str, Student]:
    """
    >>> s = create_students(["Daniel", "Darren", "Peyton"], ["Terry", "Tejas"])
    >>> s["Darren"].discussion_points
    0
    >>> s["Terry"].discussion_points
    10
    """
    # Alternative: return {name: Student(name, name not in regular) for name in regular + mega}
    result = {name: Student(name, False) for name in regular}
    for name in mega:
        result[name] = Student(name, True)
    return result
