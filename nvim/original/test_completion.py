"""Test file for Python completion"""

def greet(name: str) -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"


class Calculator:
    """Simple calculator class."""

    def add(self, a: int, b: int) -> int:
        return a + b

    def multiply(self, a: int, b: int) -> int:
        return a * b


# Test completion by typing:
# calc = Calculator()
# calc.  # <-- Press Ctrl-Space here to see completion options
