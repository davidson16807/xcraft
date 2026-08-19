'use strict';

function Levels(grouplikes) {
    const c = grouplikes.constant;
    const v = grouplikes.variable;
    const a = grouplikes.add;
    const m = grouplikes.mul;
    const p = grouplikes.pow;
    const d = grouplikes.div;
    const nonzero_context = 'Assume x is nonzero whenever it appears as a divisor.';
    const positive_context = 'Assume variables are positive real numbers.';
    const e = (left, right) => new Equation(left, right);
    const x = () => v('x');
    const av = () => v('a');
    const bv = () => v('b');
    const reciprocal = expression => p(expression, c(-1));

    const levels = [
        {
            title: 'Balance',
            concept: 'Move an addend across equality; its sign changes.',
            equation: e(a([x(), c(3)]), c(7)),
            goal: e(x(), c(4)),
        },
        {
            title: 'Subtraction',
            concept: 'Subtracting on one side is adding the opposite on the other.',
            equation: e(a([x(), c(-5)]), c(9)),
            goal: e(x(), c(14)),
        },
        {
            title: 'Division',
            concept: 'A nonzero factor crossing equality becomes a divisor.',
            context: nonzero_context,
            equation: e(m([c(4), x()]), c(28)),
            goal: e(x(), c(7)),
        },
        {
            title: 'Multiplication',
            concept: 'A nonzero denominator crossing equality becomes a factor.',
            context: nonzero_context,
            equation: e(d(x(), c(6)), c(5)),
            goal: e(x(), c(30)),
        },
        {
            title: 'Like terms',
            concept: 'Like terms combine by adding their coefficients.',
            context: nonzero_context,
            equation: e(a([m([c(2), x()]), m([c(3), x()])]), c(20)),
            goal: e(x(), c(4)),
        },
        {
            title: 'Both sides',
            concept: 'Terms containing the unknown may cross equality too.',
            context: nonzero_context,
            equation: e(a([m([c(3), x()]), c(2)]), a([x(), c(10)])),
            goal: e(x(), c(4)),
        },
        {
            title: 'Distribution',
            concept: 'Drag a factor onto parentheses to distribute it.',
            equation: e(m([c(2), a([x(), c(3)])]), c(14)),
            goal: e(a([m([c(2), x()]), c(6)]), c(14)),
        },
        {
            title: 'Distribute and solve',
            concept: 'Compose distribution, collection, balance, and division.',
            context: nonzero_context,
            equation: e(a([m([c(3), a([x(), c(-2)])]), c(4)]), c(19)),
            goal: e(x(), c(7)),
        },
        {
            title: 'A fraction',
            concept: 'Clear a constant denominator, then rebalance.',
            context: nonzero_context,
            equation: e(d(a([x(), c(2)]), c(3)), c(5)),
            goal: e(x(), c(13)),
        },
        {
            title: 'Challenge',
            concept: 'Use several earlier ideas in whatever valid order you find.',
            context: nonzero_context,
            equation: e(a([m([c(2), a([x(), c(4)])]), m([c(3), x()])]), c(28)),
            goal: e(x(), c(4)),
        },

        // Power behavior and roadmap fixtures. These are intentionally present
        // before every rewrite is implemented so each new law becomes directly
        // observable as it lands.
        {
            title: 'Power identity',
            concept: 'An exponent of 1 leaves the base unchanged: a^1 = a.',
            equation: e(p(x(), c(1)), av()),
            goal: e(x(), av()),
        },
        {
            title: 'Zero exponent',
            concept: 'A nonzero base to the zero power is 1: a^0 = 1.',
            context: 'Assume a is nonzero.',
            equation: e(p(av(), c(0)), x()),
            goal: e(c(1), x()),
        },
        {
            title: 'Undo an exponent',
            concept: 'Cancel a right exponent by applying its reciprocal: a^b = c -> a = c^(1/b).',
            equation: e(p(x(), c(3)), av()),
            goal: e(x(), p(av(), reciprocal(c(3)))),
        },
        {
            title: 'Same base',
            concept: 'Multiplying powers with the same base adds their exponents.',
            equation: e(m([p(x(), c(2)), p(x(), c(3))]), av()),
            goal: e(p(x(), c(5)), av()),
        },
        {
            title: 'Power of a product',
            concept: 'A power distributes over a product: (ab)^c = a^c b^c.',
            equation: e(p(m([x(), av()]), c(2)), bv()),
            goal: e(m([p(x(), c(2)), p(av(), c(2))]), bv()),
        },
        {
            title: 'Quotient of powers',
            concept: 'A quotient of like bases subtracts exponents: a^b / a^c = a^(b-c).',
            context: nonzero_context,
            equation: e(m([p(x(), c(5)), p(x(), c(-2))]), av()),
            goal: e(p(x(), c(3)), av()),
        },
        {
            title: 'Same exponent',
            concept: 'Powers with the same exponent combine their bases: a^c b^c = (ab)^c.',
            equation: e(m([p(x(), c(2)), p(av(), c(2))]), bv()),
            goal: e(p(m([x(), av()]), c(2)), bv()),
        },
        {
            title: 'Align exponent',
            concept: 'Rewrite one factor to the target exponent: a^d b^c = (a^(d/c)b)^c.',
            context: positive_context,
            equation: e(m([p(x(), c(2)), p(av(), c(3))]), bv()),
            goal: e(
                p(m([p(x(), d(c(2), c(3))), av()]), c(3)),
                bv()
            ),
        },
        {
            title: 'Negative exponent',
            concept: 'A negative exponent is the reciprocal of the corresponding positive power.',
            context: nonzero_context,
            equation: e(p(x(), c(-2)), av()),
            goal: e(p(p(x(), c(2)), c(-1)), av()),
        },
        {
            title: 'Split an exponent sum',
            concept: 'Exponent addition distributes into multiplication: a^(b+c) = a^b a^c.',
            equation: e(p(x(), a([av(), bv()])), v('c')),
            goal: e(m([p(x(), av()), p(x(), bv())]), v('c')),
        },
        {
            title: 'Power of a power',
            concept: 'Nested powers multiply their exponents: (a^b)^c = a^(bc).',
            context: positive_context,
            equation: e(p(p(x(), c(2)), c(3)), av()),
            goal: e(p(x(), c(6)), av()),
        },
        {
            title: 'Root then power',
            concept: 'Sequential reciprocal exponents cancel: (a^(1/c))^c = a.',
            context: positive_context,
            equation: e(p(p(x(), reciprocal(c(3))), c(3)), av()),
            goal: e(x(), av()),
        },
        {
            title: 'Power then root',
            concept: 'The opposite nesting also cancels under the active domain assumptions: (a^c)^(1/c) = a.',
            context: positive_context,
            equation: e(p(p(x(), c(3)), reciprocal(c(3))), av()),
            goal: e(x(), av()),
        },
        {
            title: 'Factor an exponent',
            concept: 'Factor an exponent to form a nested power: x^(ab) = (x^a)^b.',
            context: positive_context,
            equation: e(p(x(), m([av(), bv()])), v('c')),
            goal: e(p(p(x(), av()), bv()), v('c')),
        },
        {
            title: 'Power of a quotient',
            concept: 'A power distributes through a quotient: (a/b)^c = a^c/b^c.',
            context: positive_context,
            equation: e(p(d(x(), av()), c(2)), bv()),
            goal: e(d(p(x(), c(2)), p(av(), c(2))), bv()),
        },
        {
            title: 'Rational exponent',
            concept: 'A rational exponent can be expressed as a power followed by a root.',
            context: positive_context,
            equation: e(p(x(), d(c(2), c(3))), av()),
            goal: e(p(p(x(), c(2)), reciprocal(c(3))), av()),
        },
    ];

    return Object.freeze(levels.map((level, index) => Object.freeze({
        index: index,
        title: level.title,
        concept: level.concept,
        context: level.context || '',
        equation: level.equation,
        goal: level.goal,
    })));
}
