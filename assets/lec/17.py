from __future__ import annotations
from dataclasses import dataclass

@dataclass
class SimpleStudent:
    name: str
    mt1_points: int

class Student:
    """
    >>> bao = Student('Bao', False)
    >>> eve = Student('Eve', False)
    >>> bao.mt1_points
    0
    >>> bao.total_points()
    0
    >>> bao.assign_mt1_grade(26)
    >>> bao.mt1_points
    20
    >>> eve.mt1_points
    0
    """
    def __init__(self, name, in_mega):
        self.name = name
        self.lab_points = 0
        if in_mega:
            self.lab_points = 10
        self.mt1_points = 0
        self.a_plus_points = 0

    def total_points(self):
        return self.lab_points + self.mt1_points

    def assign_mt1_grade(self, points):
        self.mt1_points = min(20, points)
        if points == 26:
            self.a_plus_points += 5

    def retake_mt1(self, points):
        """ Replaces MT1 grade with points, if points is higher than the existing MT1 grade.
         
        Caps mt1_grade at 20, even if points is higher.

        >>> s = Student('Bao', False)
        >>> s.assign_mt1_grade(8)
        >>> s.mt1_points
        8
        >>> s.retake_mt1(26)
        >>> s.mt1_points
        20
        """
        if points > self.mt1_points:
            self.mt1_points = min(points, 20)

def create_students(regular: list[str], mega: list[str]) -> dict[str, Student]:
    """
    >>> s = create_students(["Daniel", "Darren", "Peyton"], ["Terry", "Tejas"])
    >>> s["Darren"].lab_points
    0
    >>> s["Terry"].lab_points
    10
    """
    # Alternative: return {name: Student(name, name not in regular) for name in regular + mega}
    result = {name: Student(name, False) for name in regular}
    for name in mega:
        result[name] = Student(name, True)
    return result
