"""Homework 7: Classes."""


class Account:
    """An account has a balance and a holder.

    >>> a = Account('John')
    >>> a.deposit(10)
    10
    >>> a.balance
    10
    >>> a.interest
    0.02
    >>> a.time_to_retire(10.25)  # 10 -> 10.2 -> 10.404
    2
    >>> a.balance                # time_to_retire should not change the balance
    10
    >>> a.time_to_retire(11)     # 10 -> 10.2 -> ... -> 11.040808032
    5
    >>> a.time_to_retire(100)
    117
    """
    max_withdrawal = 10
    interest = 0.02

    def __init__(self, account_holder):
        self.balance = 0
        self.holder = account_holder

    def deposit(self, amount):
        self.balance = self.balance + amount
        return self.balance

    def withdraw(self, amount):
        if amount > self.balance:
            return "Insufficient funds"
        if amount > self.max_withdrawal:
            return "Can't withdraw that amount"
        self.balance = self.balance - amount
        return self.balance

    def time_to_retire(self, amount):
        """Return the number of years until balance would grow to amount."""
        assert self.balance > 0 and amount > 0 and self.interest > 0
        "*** YOUR CODE HERE ***"

class FreeChecking(Account):
    """A bank account that charges for withdrawals, but the first two are free!

    >>> ch = FreeChecking('Jack')
    >>> ch.balance = 20
    >>> ch.withdraw(100)  # First one's free, even though it was unsuccessful
    'Insufficient funds'
    >>> ch.withdraw(3)    # Second withdrawal is also free
    17
    >>> ch.balance
    17
    >>> ch.withdraw(3)    # Now there is a fee, since free_withdrawals is 2
    13
    >>> ch.withdraw(3)
    9
    >>> ch2 = FreeChecking('John')
    >>> ch2.balance = 10
    >>> ch2.withdraw(3)   # No fee
    7
    >>> ch.withdraw(3)    # ch still charges a fee
    5
    >>> ch.withdraw(5)    # Not enough to cover fee + withdraw
    'Insufficient funds'
    """
    withdraw_fee = 1
    free_withdrawals = 2

    "*** YOUR CODE HERE ***"


class Cucumber:
    """A game of Cucumber that records the winner of each completed round.

    Each (who, card) pair in cards indicates who plays and what card they play.

    >>> g = Cucumber(4)
    >>> g.play_round(3, [(3, 4), (0, 8), (1, 8), (2, 5)])
    >>> g.winners
    [1]
    >>> g.play_round(1, [(3, 5), (1, 4), (2, 5), (0, 8), (3, 7), (0, 6), (1, 7)])
    It is not your turn, player 3
    It is not your turn, player 0
    The round is over, player 1
    >>> g.winners
    [1, 3]
    >>> g.play_round(3, [(3, 7), (2, 5), (0, 9)]) # Round is never completed
    It is not your turn, player 2
    >>> g.winners
    [1, 3]

    >>> h = Cucumber(3)
    >>> h.play_round(2, [(2, 5), (0, 6), (1, 4), (2, 9)])
    The round is over, player 2
    >>> h.winners
    [0]
    """
    def __init__(self, num_players):
        self.winners = []
        self.players = num_players

    def play_round(self, starter, cards):
        r = Round(starter, self)
        for who, card in cards:
            error = r.play(who, card)
            if error is not None:
                print(error)
        if r.winner is not None:
            self.winners.append(r.winner)


class Round:
    """One round of Cucumber."""
    def __init__(self, starter, game):
        self.starter = starter
        self.next_player = starter
        self.winner = None
        "*** YOUR CODE HERE ***"

    def play(self, who, card):
        """Play card for player who, or return an error string if who can't play."""
        if self.is_complete():
            return f'The round is over, player {who}'
        if who != self.next_player:
            return f'It is not your turn, player {who}'
        self.next_player = _____
        if _____:
            "*** YOUR CODE HERE ***"
        if self.is_complete():
            "*** YOUR CODE HERE ***"

    def is_complete(self):
        """Return whether every player has played once in this round."""
        "*** YOUR CODE HERE ***"
