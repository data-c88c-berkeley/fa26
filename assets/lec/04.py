def get_name(first_name, last_name):
    """
    >>> first_name = 'Kay'
    >>> first_name and True
    True
    >>> get_name("", "Ousterhout")
    'Ousterhout'
    """
    if first_name != "": # Poll: how would you simplify this code?
        return first_name
    else:
        return last_name


def same_length(a, b):
    """
    Return whether a and b have the same number of digits.
    
    >>> same_length(4, 8)
    True
    >>> same_length(100, 657)
    True
    >>> same_length(4, 100)
    False
    """
    a_digits = 0
    while a > 0:
        a_digits = a_digits + 1
        a = a // 10

    b_digits = 0
    while b > 0:
        b_digits = b_digits + 1
        b = b // 10

    return a_digits == b_digits

def cube(k):
    return pow(k, 3)
    
def summation(n, term):
    """Sum the first n terms of a sequence.
    
    >>> summation(5, cube)
    225
    """
    total, k = 0, 1
    while k <= n:
        total, k = total + term(k), k + 1
    return total

def simple_strategy(score):
    if score < 15:
        return 3
    return 2

def interactive_strategy(score):
    print("Current score", score, "What do you want to play (1-3)?")
    next_play = int(input())
    return next_play

def make_heckling_strategy(strategy, heckle):
    def heckling_strategy(s):
        print(heckle)
        return strategy(s)
    return heckling_strategy

def play(strategy0, strategy1):
    current_score = 0
    player0 = 0
    player1 = 1
    current_player = player0
    while current_score < 21:
        if current_player == player0:
            # Do player 0's turn
            current_score = current_score + strategy0(current_score)
            current_player = player1
        else:
            # Do player 1's turn
            current_score = current_score + strategy1(current_score)
            current_player = player0
    # Current score has reached 21
    print("Player", current_player, "wins the game")

play(make_heckling_strategy(simple_strategy, "you're going down!"),
     make_heckling_strategy(simple_strategy, "thanks for playing with me!"))