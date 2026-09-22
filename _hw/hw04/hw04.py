"""Homework 4: Recursion."""


def num_eights(n):
    """Returns the number of times 8 appears as a digit of n.

    >>> num_eights(3)
    0
    >>> num_eights(8)
    1
    >>> num_eights(88888888)
    8
    >>> num_eights(2638)
    1
    >>> num_eights(86380)
    2
    >>> num_eights(12345)
    0
    >>> num_eights(8782089)
    3
    >>> # This test checks that you used no assignment statements or loops.
    >>> import inspect, ast
    >>> banned = ['Assign', 'AnnAssign', 'AugAssign', 'NamedExpr', 'For', 'While']
    >>> tree = ast.parse(inspect.getsource(num_eights))
    >>> [type(x).__name__ for x in ast.walk(tree) if type(x).__name__ in banned]
    []
    """
    "*** YOUR CODE HERE ***"


def digit_distance(n):
    """Determines the digit distance of n.

    >>> digit_distance(3)
    0
    >>> digit_distance(777) # 0 + 0
    0
    >>> digit_distance(314) # 2 + 3
    5
    >>> digit_distance(31415926535) # 2 + 3 + 3 + 4 + ... + 2
    32
    >>> digit_distance(3464660003)  # 1 + 2 + 2 + 2 + ... + 3
    16
    >>> # This test checks that you used no loops.
    >>> import inspect, ast
    >>> tree = ast.parse(inspect.getsource(digit_distance))
    >>> [type(x).__name__ for x in ast.walk(tree) if type(x).__name__ in ('For', 'While')]
    []
    """
    "*** YOUR CODE HERE ***"


def interleaved_sum(n, f_odd, f_even):
    """Compute the sum f_odd(1) + f_even(2) + f_odd(3) + ..., up
    to n.

    >>> identity = lambda x: x
    >>> square = lambda x: x * x
    >>> triple = lambda x: x * 3
    >>> interleaved_sum(5, identity, square) # 1   + 2*2 + 3   + 4*4 + 5
    29
    >>> interleaved_sum(5, square, identity) # 1*1 + 2   + 3*3 + 4   + 5*5
    41
    >>> interleaved_sum(4, triple, square)   # 1*3 + 2*2 + 3*3 + 4*4
    32
    >>> interleaved_sum(4, square, triple)   # 1*1 + 2*3 + 3*3 + 4*3
    28
    >>> # This test checks that you used no loops, no % (or equivalent workarounds), and
    >>> # no bitwise operators (&, |, ^); don't worry if you don't know what those are.
    >>> import inspect, ast
    >>> banned = ['For', 'While', 'Mod', 'BitAnd', 'BitOr', 'BitXor', 'FloorDiv', 'Mult']
    >>> tree = ast.parse(inspect.getsource(interleaved_sum))
    >>> [type(x).__name__ for x in ast.walk(tree) if type(x).__name__ in banned]
    []
    """
    "*** YOUR CODE HERE ***"


def next_smaller_coin(coin):
    """Returns the next smaller coin in order."""
    if coin == 25:
        return 10
    elif coin == 10:
        return 5
    elif coin == 5:
        return 1

def count_coins(total):
    """Return the number of ways to make change.

    >>> count_coins(15)  # 15 1-cent coins, 10 1-cent & 1 5-cent coins, ... 1 5-cent & 1 10-cent coins
    6
    >>> count_coins(10)  # 10 1-cent coins, 5 1-cent & 1 5-cent coins, 2 5-cent coins, 1 10-cent coin
    4
    >>> count_coins(20)  # 20 1-cent coins, 15 1-cent & 1 5-cent coins, ... 2 10-cent coins
    9
    >>> count_coins(45)  # How many ways to make change for 45 cents?
    39
    >>> count_coins(100) # How many ways to make change for 100 cents?
    242
    >>> count_coins(200) # How many ways to make change for 200 cents?
    1463
    >>> # This test checks that you used no loops.
    >>> import inspect, ast
    >>> tree = ast.parse(inspect.getsource(count_coins))
    >>> [type(x).__name__ for x in ast.walk(tree) if type(x).__name__ in ('For', 'While')]
    []
    """
    "*** YOUR CODE HERE ***"


def max_subseq(n, t):
    """Return the largest subsequence of at most t digits found in n.

    For example, for n = 2012 and t = 2 the subsequences are 2, 0, 1, 2, 20,
    21, 22, 01, 02, and 12; the largest is 22.

    >>> max_subseq(2012, 2)
    22
    >>> max_subseq(20125, 3)
    225
    >>> max_subseq(20125, 5)
    20125
    >>> max_subseq(20125, 6)  # note that 20125 == 020125
    20125
    >>> max_subseq(12345, 3)
    345
    >>> max_subseq(12345, 0)  # 0 is of length 0
    0
    >>> max_subseq(12345, 1)
    5
    >>> # This test checks that you used no loops.
    >>> import inspect, ast
    >>> tree = ast.parse(inspect.getsource(max_subseq))
    >>> [type(x).__name__ for x in ast.walk(tree) if type(x).__name__ in ('For', 'While')]
    []
    """
    "*** YOUR CODE HERE ***"


def print_move(origin, destination):
    """Print instructions to move a disk."""
    print("Move the top disk from rod", origin, "to rod", destination)

def move_stack(n, start, end):
    """Print the moves required to move n disks on the start pole to the end
    pole without violating the rules of Towers of Hanoi.

    n -- number of disks
    start -- a pole position, either 1, 2, or 3
    end -- a pole position, either 1, 2, or 3

    There are exactly three poles, and start and end must be different. Assume
    that the start pole has at least n disks of increasing size, and the end
    pole is either empty or has a top disk larger than the top n start disks.

    >>> move_stack(1, 1, 3)
    Move the top disk from rod 1 to rod 3
    >>> move_stack(2, 1, 3)
    Move the top disk from rod 1 to rod 2
    Move the top disk from rod 1 to rod 3
    Move the top disk from rod 2 to rod 3
    >>> move_stack(3, 1, 3)
    Move the top disk from rod 1 to rod 3
    Move the top disk from rod 1 to rod 2
    Move the top disk from rod 3 to rod 2
    Move the top disk from rod 1 to rod 3
    Move the top disk from rod 2 to rod 1
    Move the top disk from rod 2 to rod 3
    Move the top disk from rod 1 to rod 3
    """
    assert 1 <= start <= 3 and 1 <= end <= 3 and start != end, "Bad start/end"
    "*** YOUR CODE HERE ***"


from operator import sub, mul

def make_anonymous_factorial():
    """Return the value of an expression that computes factorial.

    >>> make_anonymous_factorial()(5)
    120
    >>> # This test checks that the body is just a return statement that
    >>> # doesn't refer to make_anonymous_factorial.
    >>> import inspect, ast
    >>> body = ast.parse(inspect.getsource(make_anonymous_factorial)).body[0].body
    >>> [type(x).__name__ for x in body]
    ['Expr', 'Return']
    >>> 'make_anonymous_factorial' in ast.dump(body[-1])
    False
    """
    return 'YOUR_EXPRESSION_HERE'
