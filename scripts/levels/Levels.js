'use strict';

function Levels(grouplikes) {
    const c = grouplikes.constant;
    const v = grouplikes.variable;
    const a = grouplikes.add;
    const m = grouplikes.mul;
    const p = grouplikes.pow;
    const l = grouplikes.log;
    const r = grouplikes.root;
    const d = grouplikes.div;
    const harmonic = grouplikes.harmonic;
    const e = (left, right) => new Relation('eq', left, right);
    const x = () => v('x');
    const y = () => v('y');
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
            equation: e(m([c(4), x()]), c(28)),
            goal: e(x(), c(7)),
        },
        {
            title: 'Multiplication',
            concept: 'A nonzero denominator crossing equality becomes a factor.',
            equation: e(d(x(), c(6)), c(5)),
            goal: e(x(), c(30)),
        },
        {
            title: 'Like terms',
            concept: 'Like terms combine by adding their coefficients.',
            equation: e(a([m([c(2), x()]), m([c(3), x()])]), c(20)),
            goal: e(x(), c(4)),
        },
        {
            title: 'Both sides',
            concept: 'Terms containing the unknown may cross equality too.',
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
            equation: e(a([m([c(3), a([x(), c(-2)])]), c(4)]), c(19)),
            goal: e(x(), c(7)),
        },
        {
            title: 'A fraction',
            concept: 'Clear a constant denominator, then rebalance.',
            equation: e(d(a([x(), c(2)]), c(3)), c(5)),
            goal: e(x(), c(13)),
        },
        {
            title: 'Challenge',
            concept: 'Use several earlier ideas in whatever valid order you find.',
            equation: e(a([m([c(2), a([x(), c(4)])]), m([c(3), x()])]), c(28)),
            goal: e(x(), c(4)),
        },

        // Power behavior and roadmap fixtures. These are intentionally present
        // before every rewrite is implemented so each new law becomes directly
        // observable as it lands.
        {
            title: 'Power identity',
            concept: 'An exponent of 1 leaves the base unchanged: a^1 = a.',
            equation: e(p(x(), c(1)), c(7)),
            goal: e(x(), c(7)),
        },
        {
            title: 'Zero exponent',
            concept: 'A nonzero base to the zero power is 1: y^0 = 1.',
            equation: e(p(v('y'), c(0)), x()),
            goal: e(c(1), x()),
        },
        {
            title: 'Undo an exponent',
            concept: 'Holding the exponent fixed solves the missing base: a^b = c -> a = root_b(c).',
            equation: e(p(x(), c(3)), c(8)),
            goal: e(x(), r(c(3), c(8))),
        },
        {
            title: 'Same base',
            concept: 'Multiplying powers with the same base adds their exponents.',
            equation: e(m([p(x(), c(2)), p(x(), c(3))]), c(32)),
            goal: e(p(x(), c(5)), c(32)),
        },
        {
            title: 'Power of a product',
            concept: 'A power distributes over a product: (ab)^c = a^c b^c.',
            equation: e(p(m([x(), c(3)]), c(2)), c(36)),
            goal: e(m([p(x(), c(2)), c(9)]), c(36)),
        },
        {
            title: 'Quotient of powers',
            concept: 'A quotient of like bases subtracts exponents: a^b / a^c = a^(b-c).',
            equation: e(m([p(x(), c(5)), p(x(), c(-2))]), c(8)),
            goal: e(p(x(), c(3)), c(8)),
        },
        {
            title: 'Same exponent',
            concept: 'Powers with the same exponent combine their bases: a^c b^c = (ab)^c.',
            equation: e(m([p(x(), c(2)), p(c(3), c(2))]), c(36)),
            goal: e(p(m([x(), c(3)]), c(2)), c(36)),
        },
        {
            title: 'Align exponent',
            concept: 'Rewrite one factor to the target exponent: a^d b^c = (a^(d/c)b)^c.',
            equation: e(m([p(x(), c(2)), p(av(), c(3))]), bv()),
            goal: e(
                p(m([p(x(), d(c(2), c(3))), av()]), c(3)),
                bv()
            ),
        },
        {
            title: 'Negative exponent',
            concept: 'A negative exponent is the reciprocal of the corresponding positive power.',
            equation: e(p(x(), c(-2)), av()),
            goal: e(p(p(x(), c(2)), c(-1)), av()),
        },
        {
            title: 'Split an exponent sum',
            concept: 'Exponent addition distributes into multiplication: a^(b+c) = a^b a^c.',
            equation: e(p(x(), a([c(2), c(3)])), c(32)),
            goal: e(m([p(x(), c(2)), p(x(), c(3))]), c(32)),
        },
        {
            title: 'Power of a power',
            concept: 'Nested powers multiply their exponents: (a^b)^c = a^(bc).',
            equation: e(p(p(x(), c(2)), c(3)), c(64)),
            goal: e(p(x(), c(6)), c(64)),
        },
        {
            title: 'Root then power',
            concept: 'A root and matching power are inverse projections: (root_c(a))^c = a.',
            equation: e(p(r(c(3), x()), c(3)), av()),
            goal: e(x(), av()),
        },
        {
            title: 'Power then root',
            concept: 'The mirrored inverse also cancels under the active domain assumptions: root_c(a^c) = a.',
            equation: e(r(c(3), p(x(), c(3))), av()),
            goal: e(x(), av()),
        },
        {
            title: 'Factor an exponent',
            concept: 'Factor an exponent to form a nested power: x^(ab) = (x^a)^b.',
            equation: e(p(x(), m([av(), bv()])), v('c')),
            goal: e(p(p(x(), av()), bv()), v('c')),
        },
        {
            title: 'Power of a quotient',
            concept: 'A power distributes through a quotient: (a/b)^c = a^c/b^c.',
            equation: e(p(d(x(), c(2)), c(2)), c(9)),
            goal: e(d(p(x(), c(2)), c(4)), c(9)),
        },
        {
            title: 'Rational exponent',
            concept: 'A rational exponent can be expressed as a power followed by a root.',
            equation: e(p(x(), d(c(2), c(3))), av()),
            goal: e(p(p(x(), c(2)), reciprocal(c(3))), av()),
        },

        {
            title: 'Solve an exponent',
            concept: 'Holding the base fixed turns an exponential equation into a logarithm: a^x = b -> x = log_a(b).',
            equation: e(p(c(2), x()), c(8)),
            goal: e(x(), l(c(2), c(8))),
        },
        {
            title: 'Solve a logarithm',
            concept: 'The mirrored fixed-base inverse turns a logarithm back into a power: log_a(x) = b -> x = a^b.',
            equation: e(l(c(2), x()), c(3)),
            goal: e(x(), p(c(2), c(3))),
        },
        {
            title: 'Power-log cancellation',
            concept: 'Power and logarithm projections with the same base cancel: a^log_a(x) = x.',
            equation: e(p(c(2), l(c(2), x())), av()),
            goal: e(x(), av()),
        },
        {
            title: 'Log-power cancellation',
            concept: 'The mirrored inverse also cancels: log_a(a^x) = x.',
            equation: e(l(c(2), p(c(2), x())), av()),
            goal: e(x(), av()),
        },
        {
            title: 'Root product',
            concept: 'Roots with the same exponent combine their results: root_n(x)root_n(y) = root_n(xy).',
            equation: e(m([r(c(2), x()), r(c(2), y())]), av()),
            goal: e(r(c(2), m([x(), y()])), av()),
        },
        {
            title: 'Same result roots',
            concept: 'Roots with the same result combine their exponents harmonically.',
            equation: e(m([r(x(), av()), r(y(), av())]), bv()),
            goal: e(r(harmonic([x(), y()]), av()), bv()),
        },

        // Power-triangle logarithm sameness/inverse demonstrations, followed
        // by projection self-composition examples for roots.
        {
            title: 'Logarithm of a product',
            concept: 'Same-base logarithms combine additively: log_a(x) + log_a(y) = log_a(xy).',
            equation: e(a([l(c(2), x()), l(c(2), y())]), av()),
            goal: e(l(c(2), m([x(), y()])), av()),
        },
        {
            title: 'Split a logarithm',
            concept: 'The same-base logarithm law distributes in reverse: log_a(xy) = log_a(x) + log_a(y).',
            equation: e(l(c(2), m([x(), y()])), av()),
            goal: e(a([l(c(2), x()), l(c(2), y())]), av()),
        },
        {
            title: 'Solve a logarithm base',
            concept: 'Holding the result fixed solves the missing base: log_x(a) = b -> x = root_b(a).',
            equation: e(l(x(), c(8)), c(3)),
            goal: e(x(), r(c(3), c(8))),
        },
        {
            title: 'Same result logarithms',
            concept: 'With result fixed, harmonic addition of logarithms corresponds to multiplication of their bases.',
            equation: e(harmonic([l(x(), av()), l(y(), av())]), bv()),
            goal: e(l(m([x(), y()]), av()), bv()),
        },
        {
            title: 'Split same result logarithms',
            concept: 'The same-result logarithm law also distributes from a product base into harmonic addition.',
            equation: e(l(m([x(), y()]), av()), bv()),
            goal: e(harmonic([l(x(), av()), l(y(), av())]), bv()),
        },
        {
            title: 'Root of a root',
            concept: 'Nested roots multiply their indices: root_m(root_n(x)) = root_(nm)(x).',
            equation: e(r(c(3), r(c(2), x())), av()),
            goal: e(r(m([c(2), c(3)]), x()), av()),
        },
        {
            title: 'Split a root index',
            concept: 'Factoring a root index forms nested roots: root_(nm)(x) = root_m(root_n(x)).',
            equation: e(r(m([c(2), c(3)]), x()), av()),
            goal: e(r(c(3), r(c(2), x())), av()),
        },
        {
            title: 'Factor a root index',
            concept: 'A product root index can be split repeatedly into nested roots.',
            equation: e(r(m([c(2), c(3), av()]), x()), bv()),
            goal: e(r(m([c(3), av()]), r(c(2), x())), bv()),
        },
    ];

    return Object.freeze(levels.map((level, index) => Object.freeze({
        index: index,
        title: level.title,
        concept: level.concept,
        equation: level.equation,
        goal: level.goal,
    })));
}
