'use strict';
// HUMAN VETTED

function Levels(expressions) {
    const c = expressions.constant;
    const v = expressions.variable;
    const a = expressions.add;
    const m = expressions.mul;
    const d = expressions.div;
    const nonzero_context = 'Assume x is nonzero whenever it appears as a divisor.';
    const e = (left, right) => new Equation(left, right);
    const x = () => v('x');

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
