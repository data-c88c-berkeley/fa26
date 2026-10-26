"""Lab 10: Classes."""


class Mint:
    """A mint creates coins by stamping on years.

    The update method sets the mint's stamp to Mint.present_year.

    >>> mint = Mint()
    >>> mint.year
    2026
    >>> dime = mint.create(Dime)
    >>> dime.year
    2026
    >>> Mint.present_year = 2106  # Time passes
    >>> nickel = mint.create(Nickel)
    >>> nickel.year     # The mint has not updated its stamp yet
    2026
    >>> nickel.worth()  # 5 cents + (80 - 50 years)
    35
    >>> mint.update()   # The mint's year is updated to 2106
    >>> Mint.present_year = 2181     # More time passes
    >>> mint.create(Dime).worth()    # 10 cents + (75 - 50 years)
    35
    >>> Mint().create(Dime).worth()  # A new mint has the current year
    10
    >>> dime.worth()     # 10 cents + (155 - 50 years)
    115
    >>> Dime.cents = 20  # Upgrade all dimes!
    >>> dime.worth()     # 20 cents + (155 - 50 years)
    125
    """
    present_year = 2026

    def __init__(self):
        self.update()

    def create(self, coin) -> 'Coin':
        # Hint: coin is a class, such as Nickel or Dime, not an instance!
        "*** YOUR CODE HERE ***"

    def update(self) -> None:
        "*** YOUR CODE HERE ***"

class Coin:
    cents = None  # will be provided by subclasses, but not by Coin itself

    def __init__(self, year: int):
        self.year = year

    def worth(self) -> int:
        assert self.cents is not None
        "*** YOUR CODE HERE ***"

class Nickel(Coin):
    cents = 5

class Dime(Coin):
    cents = 10
