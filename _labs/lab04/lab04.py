"""Lab 4: Recursion."""


def skip_factorial(n):
    """Return the product of positive integers n * (n - 2) * (n - 4) * ...

    >>> skip_factorial(5) # 5 * 3 * 1
    15
    >>> skip_factorial(8) # 8 * 6 * 4 * 2
    384
    """
    if ___:
        return ___
    else:
        return ___


def hailstone(n):
    """Print out the hailstone sequence starting at n,
    and return the number of elements in the sequence.
    >>> a = hailstone(10)
    10
    5
    16
    8
    4
    2
    1
    >>> a
    7
    >>> b = hailstone(1)
    1
    >>> b
    1
    """
    print(n)
    if n % 2 == 0:
        return even(n)
    else:
        return odd(n)

def even(n):
    return ____

def odd(n):
    "*** YOUR CODE HERE ***"


def make_func_repeater(f, x):
    """Return a function that applies f to x a given number of times.

    >>> increment_repeater = make_func_repeater(lambda x: x + 1, 1)
    >>> increment_repeater(2)  # same as f(f(x))
    3
    >>> increment_repeater(5)
    6
    >>> increment_repeater(0)
    1
    """
    def repeat(____):
        if ____:
            return ____
        else:
            return ____
    return ____
