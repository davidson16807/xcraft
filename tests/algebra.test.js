'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
[
    'scripts/models/expression/Expression.js',
    'scripts/models/expression/ExpressionShape.js',
    'scripts/models/expression/Expressions.js',
    'scripts/models/expression/Scale.js',
    'scripts/models/expression/Scales.js',
    'scripts/models/expression/ScaleExpressions.js',
    'scripts/models/expression/Power.js',
    'scripts/models/expression/Powers.js',
    'scripts/models/expression/PowerExpressions.js',
    'scripts/models/equation/Equation.js',
    'scripts/models/equation/EquationShape.js',
    'scripts/models/expression/ExpressionPaths.js',
    'scripts/models/equation/Equations.js',
    'scripts/levels/Levels.js',
].forEach(file => {
    vm.runInThisContext(
        fs.readFileSync(path.join(root, file), 'utf8'),
        { filename:file }
    );
});

const expression_shape = ExpressionShape();
const expressions = Expressions({
    'add': MonoidStructure(
        'add',
        new Expression('constant', 0),
        true,
        evaluate => expression => expression.contents.reduce(
            (accumulator, item) => accumulator + evaluate(item),
            0
        )
    ),
    'mul': MonoidStructure(
        'mul',
        new Expression('constant', 1),
        true,
        evaluate => expression => expression.contents.reduce(
            (accumulator, item) => accumulator * evaluate(item),
            1
        )
    ),
    'pow': PowerStructure('pow'),
});
const scales = Scales(expressions, expression_shape);
const scale_expressions = ScaleExpressions(expressions, scales);
const powers = Powers(expressions, expression_shape);
const power_expressions = PowerExpressions(expressions, powers);
const equation_shape = EquationShape(expression_shape);
const paths = ExpressionPaths(expressions);
const algebra = Equations({
    expressions: expressions,
    scale_expressions: scale_expressions,
    power_expressions: power_expressions,
    expression_paths: paths,
});
const levels = Levels(expressions);

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertShape(actual, expected, message) {
    const actual_shape = equation_shape.encode(actual);
    const expected_shape = equation_shape.encode(expected);
    assert(
        actual_shape === expected_shape,
        `${message}\nexpected: ${expected_shape}\nactual:   ${actual_shape}`
    );
}

function move(equation, source, target) {
    const updated = algebra.move(equation, source, target);
    assert(updated !== equation, `move should be valid: ${source} -> ${target}`);
    return updated;
}

// -----------------------------------------------------------------------------
// Level solutions
// -----------------------------------------------------------------------------

function solveLevel1() {
    let q = levels[0].equation;
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[0].goal, 'level 1');
}

function solveLevel2() {
    let q = levels[1].equation;
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[1].goal, 'level 2');
}

function solveLevel3() {
    let q = levels[2].equation;
    q = move(q, 'L/0', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[2].goal, 'level 3');
}

function solveLevel4() {
    let q = levels[3].equation;
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[3].goal, 'level 4');
}

function solveLevel5() {
    let q = levels[4].equation;
    q = move(q, 'L/0', 'path:L/1');
    q = move(q, 'L/0', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[4].goal, 'level 5');
}

function solveLevel6() {
    let q = levels[5].equation;
    q = move(q, 'R/0', 'side:L');
    q = move(q, 'L/0', 'path:L/2');
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    q = move(q, 'L/0', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[5].goal, 'level 6');
}

function solveLevel7() {
    let q = levels[6].equation;
    q = move(q, 'L/0', 'path:L/1');
    assertShape(q, levels[6].goal, 'level 7');
}

function solveLevel8() {
    let q = levels[7].equation;
    q = move(q, 'L/0/0', 'path:L/0/1');
    q = move(q, 'L/1', 'path:L/2');
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    q = move(q, 'L/0', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[7].goal, 'level 8');
}

function solveLevel9() {
    let q = levels[8].equation;
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[8].goal, 'level 9');
}

function solveLevel10() {
    let q = levels[9].equation;
    q = move(q, 'L/0/0', 'path:L/0/1');
    q = move(q, 'L/0', 'path:L/2');
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    q = move(q, 'L/0', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[9].goal, 'level 10');
}

// -----------------------------------------------------------------------------
// Property-test vocabulary and cases
// -----------------------------------------------------------------------------

const x = expressions.variable('x');
const zero = expressions.constant(0);
const one = expressions.constant(1);

/*
`a`, `b`, and `c` range over expressions, not just numbers.  The pool is
intentionally small enough that ternary laws can be tested exhaustively, but
contains nested sums, products, powers, signs, constants, and variables.
*/
const expression_cases = Object.freeze([
    expressions.constant(-3),
    expressions.constant(0),
    expressions.constant(1),
    expressions.constant(2),
    x,
    scale_expressions.negate(x),
    expressions.add([x, expressions.constant(2)]),
    expressions.add([x, expressions.constant(-3)]),
    expressions.mul([expressions.constant(3), x]),
    expressions.pow(x, 2),
    expressions.add([
        expressions.pow(x, 2),
        x,
        expressions.constant(1),
    ]),
    expressions.mul([
        expressions.add([x, expressions.constant(1)]),
        expressions.add([x, expressions.constant(-2)]),
    ]),
]);

/* `x` alone ranges over numbers during semantic evaluation. */
const x_values = Object.freeze([
    -10,
    -2,
    -1,
    -0.5,
    0,
    0.5,
    1,
    2,
    10,
]);

const stats = {
    semantic_cases: 0,
    evaluations: 0,
    moves: 0,
};

function orderedExpressionKey(expression) {
    switch (expression.type) {
        case 'constant': return `C(${expression.contents})`;
        case 'variable': return `V(${expression.contents})`;
        case 'pow': return `P(${orderedExpressionKey(expression.contents[0])},${orderedExpressionKey(expression.contents[1])})`;
        case 'add': return `A(${expression.contents.map(orderedExpressionKey).join(',')})`;
        case 'mul': return `M(${expression.contents.map(orderedExpressionKey).join(',')})`;
        default: return `${expression.type}(?)`;
    }
}

function describeCase(expression) {
    return orderedExpressionKey(expression);
}

function approximatelyEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    return Math.abs(a - b) <= 1e-10 * scale;
}

function assertExpressionsEquivalent(left, right, property, context) {
    stats.semantic_cases++;

    for (const value of x_values) {
        const variables = {x:value};
        const left_value = expressions.evaluate(left, variables);
        const right_value = expressions.evaluate(right, variables);
        stats.evaluations++;

        assert(
            approximatelyEqual(left_value, right_value),
            `${property} failed\n`+
            `${context}\n`+
            `x = ${value}\n`+
            `left:  ${orderedExpressionKey(left)} = ${left_value}\n`+
            `right: ${orderedExpressionKey(right)} = ${right_value}`
        );
    }
}

function assertSameExpression(actual, expected, property, context) {
    const actual_key = orderedExpressionKey(actual);
    const expected_key = orderedExpressionKey(expected);
    assert(
        actual_key === expected_key,
        `${property}: move produced the wrong expression\n`+
        `${context}\n`+
        `expected: ${expected_key}\n`+
        `actual:   ${actual_key}`
    );
}

/*
Verify the whole public move contract for a property: the move is discoverable,
it changes the equation, produces the expected expression, leaves the other
side alone, and is semantically equivalent to the original expression.
*/
function assertMoveTransforms(before, source, target, expected, property, context) {
    const sentinel = expressions.constant(17);
    const equation = new Equation(before, sentinel);
    const advertised = algebra.moves_for_source(equation, source);

    assert(
        advertised.includes(target),
        `${property}: expected move was not advertised\n`+
        `${context}\nsource: ${source}\ntarget: ${target}\n`+
        `advertised: ${advertised.join(', ')}`
    );

    const updated = algebra.move(equation, source, target);
    assert(
        updated !== equation,
        `${property}: advertised move returned the original equation\n${context}`
    );

    assertSameExpression(updated.left, expected, property, context);
    assertSameExpression(updated.right, sentinel, property, `${context}\nright side changed`);
    assertExpressionsEquivalent(before, updated.left, property, `${context}\nmove semantics`);
    stats.moves++;
}

function forEachPair(callback) {
    for (const a of expression_cases)
    for (const b of expression_cases)
        callback(a, b);
}

function forEachTriple(callback) {
    for (const a of expression_cases)
    for (const b of expression_cases)
    for (const c of expression_cases)
        callback(a, b, c);
}

// -----------------------------------------------------------------------------
// Additive closure
// a + b is an Expression.
// -----------------------------------------------------------------------------

function additiveClosure() {
    forEachPair((a, b) => {
        const result = expressions.add([a, b]);
        assert(
            result instanceof Expression,
            `additive closure failed\na = ${describeCase(a)}\nb = ${describeCase(b)}`
        );
    });
}

// -----------------------------------------------------------------------------
// Additive commutativity
// a + b = b + a
// -----------------------------------------------------------------------------

function additiveCommutativity() {
    forEachPair((a, b) => {
        const left = expressions.add([a, b]);
        const right = expressions.add([b, a]);
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}`;

        assertExpressionsEquivalent(left, right, 'additive commutativity', context);

        // If either operand is itself a sum, construction flattens it and the
        // two metavariables are no longer single draggable siblings.  If the
        // terms combine, simplification intentionally has priority over swap.
        if (
            a !== b &&
            a.type !== 'add' &&
            b.type !== 'add' &&
            scale_expressions.combine(a, b) == null
        ) {
            assertMoveTransforms(
                left,
                'L/0',
                'path:L/1',
                right,
                'additive commutativity',
                context
            );
        }
    });
}

// -----------------------------------------------------------------------------
// Additive associativity
// (a + b) + c = a + (b + c)
// -----------------------------------------------------------------------------

function additiveAssociativity() {
    forEachTriple((a, b, c) => {
        const left = expressions.add([
            expressions.add([a, b]),
            c,
        ]);
        const right = expressions.add([
            a,
            expressions.add([b, c]),
        ]);
        assertExpressionsEquivalent(
            left,
            right,
            'additive associativity',
            `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`
        );
    });
}

// -----------------------------------------------------------------------------
// Additive identity
// a + 0 = a = 0 + a
// -----------------------------------------------------------------------------

function additiveIdentity() {
    for (const a of expression_cases) {
        const context = `a = ${describeCase(a)}`;
        assertExpressionsEquivalent(
            expressions.add([a, zero]),
            a,
            'additive identity',
            `${context}\nright identity`
        );
        assertExpressionsEquivalent(
            expressions.add([zero, a]),
            a,
            'additive identity',
            `${context}\nleft identity`
        );
    }
}

// -----------------------------------------------------------------------------
// Additive inverse
// a + (-a) = 0
// -----------------------------------------------------------------------------

function additiveInverse() {
    for (const a of expression_cases) {
        const negative_a = scale_expressions.negate(a);
        const left = expressions.add([a, negative_a]);
        const context = `a = ${describeCase(a)}`;

        assertExpressionsEquivalent(left, zero, 'additive inverse', context);

        // A nested sum is flattened by construction, so `a` is not a single
        // draggable sibling in that representation.  All other sample forms
        // should expose the cancellation as a player move.
        if (a.type !== 'add') {
            assertMoveTransforms(
                left,
                'L/0',
                'path:L/1',
                zero,
                'additive inverse',
                context
            );
        }
    }
}

// -----------------------------------------------------------------------------
// Multiplicative closure
// ab is an Expression.
// -----------------------------------------------------------------------------

function multiplicativeClosure() {
    forEachPair((a, b) => {
        const result = expressions.mul([a, b]);
        assert(
            result instanceof Expression,
            `multiplicative closure failed\na = ${describeCase(a)}\nb = ${describeCase(b)}`
        );
    });
}

// -----------------------------------------------------------------------------
// Multiplicative commutativity
// ab = ba
// -----------------------------------------------------------------------------

function multiplicativeCommutativity() {
    forEachPair((a, b) => {
        const left = expressions.mul([a, b]);
        const right = expressions.mul([b, a]);
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}`;

        assertExpressionsEquivalent(left, right, 'multiplicative commutativity', context);

        // As with addition, nested products flatten.  Like powers and numeric
        // products simplify before swapping, so only test the explicit swap
        // gesture when that gesture is the operation the player will get.
        if (
            a !== b &&
            a.type !== 'mul' &&
            b.type !== 'mul' &&
            power_expressions.combine(a, b) == null &&
            !((a.type === 'constant' && b.type === 'add') ||
              (a.type === 'add' && b.type === 'constant'))
        ) {
            assertMoveTransforms(
                left,
                'L/0',
                'path:L/1',
                right,
                'multiplicative commutativity',
                context
            );
        }
    });
}

// -----------------------------------------------------------------------------
// Multiplicative associativity
// (ab)c = a(bc)
// -----------------------------------------------------------------------------

function multiplicativeAssociativity() {
    forEachTriple((a, b, c) => {
        const left = expressions.mul([
            expressions.mul([a, b]),
            c,
        ]);
        const right = expressions.mul([
            a,
            expressions.mul([b, c]),
        ]);
        assertExpressionsEquivalent(
            left,
            right,
            'multiplicative associativity',
            `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`
        );
    });
}

// -----------------------------------------------------------------------------
// Multiplicative identity
// a * 1 = a = 1 * a
// -----------------------------------------------------------------------------

function multiplicativeIdentity() {
    for (const a of expression_cases) {
        const context = `a = ${describeCase(a)}`;
        assertExpressionsEquivalent(
            expressions.mul([a, one]),
            a,
            'multiplicative identity',
            `${context}\nright identity`
        );
        assertExpressionsEquivalent(
            expressions.mul([one, a]),
            a,
            'multiplicative identity',
            `${context}\nleft identity`
        );
    }
}

// -----------------------------------------------------------------------------
// Distributivity
// a(b + c) = ab + ac
// (a + b)c = ac + bc
// -----------------------------------------------------------------------------

function distributivity() {
    forEachTriple((a, b, c) => {
        const sum_bc = expressions.add([b, c]);
        const sum_ab = expressions.add([a, b]);
        const left_product = expressions.mul([a, sum_bc]);
        const left_expanded = expressions.add([
            expressions.mul([a, b]),
            expressions.mul([a, c]),
        ]);
        const right_product = expressions.mul([sum_ab, c]);
        const right_expanded = expressions.add([
            expressions.mul([a, c]),
            expressions.mul([b, c]),
        ]);
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`;

        assertExpressionsEquivalent(
            left_product,
            left_expanded,
            'left distributivity',
            context
        );
        assertExpressionsEquivalent(
            right_product,
            right_expanded,
            'right distributivity',
            context
        );
    });

    // The current game exposes distribution specifically for a numeric scale
    // and a sum.  Use nonconstant addends so constant folding cannot take
    // precedence over the distribution gesture.
    const scalar_cases = [
        expressions.constant(-3),
        expressions.constant(-1),
        expressions.constant(0),
        expressions.constant(1),
        expressions.constant(2),
    ];
    const addend_cases = [
        x,
        scale_expressions.negate(x),
        expressions.mul([expressions.constant(3), x]),
        expressions.pow(x, 2),
        expressions.mul([
            expressions.add([x, expressions.constant(1)]),
            expressions.add([x, expressions.constant(-2)]),
        ]),
    ];

    for (const a of scalar_cases)
    for (const b of addend_cases)
    for (const c of addend_cases) {
        const sum = expressions.add([b, c]);
        const expanded = expressions.add(
            sum.contents.map(term => scale_expressions.scale(a, term))
        );
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`;

        assertMoveTransforms(
            expressions.mul([a, sum]),
            'L/0',
            'path:L/1',
            expanded,
            'left distributivity',
            context
        );

        assertMoveTransforms(
            expressions.mul([sum, a]),
            'L/1',
            'path:L/0',
            expanded,
            'right distributivity',
            context
        );
    }
}

// -----------------------------------------------------------------------------
// Run the specification
// -----------------------------------------------------------------------------

[
    solveLevel1,
    solveLevel2,
    solveLevel3,
    solveLevel4,
    solveLevel5,
    solveLevel6,
    solveLevel7,
    solveLevel8,
    solveLevel9,
    solveLevel10,
].forEach(test => test());

[
    additiveClosure,
    additiveCommutativity,
    additiveAssociativity,
    additiveIdentity,
    additiveInverse,
    multiplicativeClosure,
    multiplicativeCommutativity,
    multiplicativeAssociativity,
    multiplicativeIdentity,
    distributivity,
].forEach(test => test());

console.log(
    `ok - 10 level solutions; `+
    `${stats.semantic_cases} property cases; `+
    `${stats.evaluations} evaluations; `+
    `${stats.moves} advertised property moves`
);
