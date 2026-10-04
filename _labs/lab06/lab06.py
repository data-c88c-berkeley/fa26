"""Lab 6: Dictionaries and Strings."""


def display(fruit: str, count: int) -> str:
    """Display a count of a fruit in angle brackets.

    >>> display('apples', 3)
    '<3 apples>'
    >>> display('apples', 1)
    '<1 apple>'
    >>> display('kiwis', 12)
    '<12 kiwis>'
    >>> print(display('apples', 3) + display('kiwis', 3))
    <3 apples><3 kiwis>
    """
    assert count >= 1 and fruit[-1] == 's'
    "*** YOUR CODE HERE ***"


def buy(fruits_to_buy: list[str], prices: dict[str, int], total_amount: int) -> None:
    """Print ways to buy some of each fruit so that the sum of prices is amount.

    >>> prices = {'oranges': 4, 'apples': 3, 'bananas': 2, 'kiwis': 9}
    >>> buy(['apples', 'oranges', 'bananas'], prices, 12)  # We can only buy apple, orange, and banana, but not kiwi
    <2 apples><1 orange><1 banana>
    >>> buy(['apples', 'oranges', 'bananas'], prices, 16)
    <2 apples><1 orange><3 bananas>
    <2 apples><2 oranges><1 banana>
    >>> buy(['apples', 'kiwis'], prices, 36)
    <3 apples><3 kiwis>
    <6 apples><2 kiwis>
    <9 apples><1 kiwi>
    """
    def add(fruits: list[str], amount: int, cart: str) -> None:
        if fruits == [] and amount == 0:
            print(cart)
        elif fruits and amount > 0:
            fruit = fruits[0]
            price = ____
            for k in ____:
                # Hint: The display function will help you add fruit to the cart.
                add(____, ____, ____)
    add(fruits_to_buy, total_amount, '')
