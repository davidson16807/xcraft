'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
[
    'scripts/models/structure/MonoidStructure.js',
    'scripts/models/structure/PowerStructure.js',
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
    'scripts/models/equation/EquationDragOperations.js',
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
const algebra = EquationDragOperations({
    expression_paths: paths,
    equations: Equations({
        expressions: expressions,
        scale_expressions: scale_expressions,
        power_expressions: power_expressions,
        expression_paths: paths,
    }),
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

function assertEquationLayers(equation, message) {
    for (const [name, side] of [['left', equation.left], ['right', equation.right]]) {
        assert(
            side.type === 'add',
            `${message}: ${name} side should retain a top-level add`
        );
        assert(
            side.contents.length > 0 &&
            side.contents.every(term => term.type === 'mul' && term.contents.length > 0),
            `${message}: every top-level ${name} addend should retain a nonempty mul`
        );
    }
}

function move(equation, source, target) {
    const updated = algebra.move(equation, source, target);
    assert(updated !== equation, `move should be valid: ${source} -> ${target}`);
    assertEquationLayers(updated, `${source} -> ${target}`);
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
    q = move(q, 'L/0/0', 'side:R');
    q = move(q, 'R/0/1', 'path:R/0/0');
    assertShape(q, levels[2].goal, 'level 3');
}

function solveLevel4() {
    let q = levels[3].equation;
    q = move(q, 'L/0/1', 'side:R');
    q = move(q, 'R/0/1', 'path:R/0/0');
    assertShape(q, levels[3].goal, 'level 4');
}

function solveLevel5() {
    let q = levels[4].equation;
    q = move(q, 'L/0', 'path:L/1');
    q = move(q, 'L/0/0', 'side:R');
    q = move(q, 'R/0/1', 'path:R/0/0');
    assertShape(q, levels[4].goal, 'level 5');
}

function solveLevel6() {
    let q = levels[5].equation;
    q = move(q, 'R/0', 'side:L');
    q = move(q, 'L/0', 'path:L/2');
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    q = move(q, 'L/0/0', 'side:R');
    q = move(q, 'R/0/1', 'path:R/0/0');
    assertShape(q, levels[5].goal, 'level 6');
}

function solveLevel7() {
    let q = levels[6].equation;
    q = move(q, 'L/0/0', 'path:L/0/1');
    assertShape(q, levels[6].goal, 'level 7');
}

function solveLevel8() {
    let q = levels[7].equation;
    q = move(q, 'L/0/0', 'path:L/0/1');
    q = move(q, 'L/1', 'path:L/2');
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    q = move(q, 'L/0/0', 'side:R');
    q = move(q, 'R/0/1', 'path:R/0/0');
    assertShape(q, levels[7].goal, 'level 8');
}

function solveLevel9() {
    let q = levels[8].equation;
    q = move(q, 'L/0/1', 'side:R');
    q = move(q, 'R/0/1', 'path:R/0/0');
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
    q = move(q, 'L/0/0', 'side:R');
    q = move(q, 'R/0/1', 'path:R/0/0');
    assertShape(q, levels[9].goal, 'level 10');
}

// -----------------------------------------------------------------------------
// Property-test vocabulary and cases
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Property-test vocabulary and cases
// -----------------------------------------------------------------------------

const x = expressions.variable('x');
const zero = expressions.constant(0);
const one = expressions.constant(1);

/*
The ring pool contains expressions without division by a variable expression.
The field pool extends it with reciprocals and negative powers.  Algebraic
metavariables a, b, and c range over the field pool; only x ranges over raw
Numbers during semantic evaluation.
*/
const ring_expression_cases = Object.freeze([
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

const field_expression_cases = Object.freeze([
    ...ring_expression_cases,
    expressions.reciprocal(x),
    expressions.reciprocal(
        expressions.add([x, expressions.constant(1)])
    ),
    expressions.reciprocal(
        expressions.add([x, expressions.constant(-2)])
    ),
    expressions.mul([
        expressions.constant(3),
        expressions.reciprocal(x),
    ]),
    expressions.pow(x, -2),
    expressions.div(
        expressions.add([x, expressions.constant(1)]),
        expressions.add([x, expressions.constant(-1)])
    ),
]);

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
    domain_skips: 0,
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

function valueOf(expression, variables) {
    return expressions.evaluate(expression, variables);
}

function isDefined(expression, variables) {
    return Number.isFinite(valueOf(expression, variables));
}

function isDefinedNonzero(expression, variables) {
    const value = valueOf(expression, variables);
    return Number.isFinite(value) && value !== 0;
}

function allDefined(items, variables) {
    return items.every(expression => isDefined(expression, variables));
}

function allDefinedNonzero(items, variables) {
    return items.every(expression => isDefinedNonzero(expression, variables));
}

function hasAdmissibleAssignment(where) {
    return x_values.some(value => where({x:value}));
}

/*
Semantic properties over rational expressions are pointwise: assignments at
which a premise is false (for example a denominator is zero) are outside the
property's domain and are skipped.  Once the premise is true, both sides must
be finite and equal; undefined results are failures, not additional skips.
*/
function assertExpressionsEquivalent(left, right, property, context, where) {
    const predicate = where || (() => true);
    let evaluated = 0;

    for (const value of x_values) {
        const variables = {x:value};
        if (!predicate(variables)) {
            stats.domain_skips++;
            continue;
        }

        const left_value = valueOf(left, variables);
        const right_value = valueOf(right, variables);
        stats.evaluations++;
        evaluated++;

        assert(
            Number.isFinite(left_value) && Number.isFinite(right_value),
            `${property} became undefined on an admissible assignment\n`+
            `${context}\n`+
            `x = ${value}\n`+
            `left:  ${orderedExpressionKey(left)} = ${left_value}\n`+
            `right: ${orderedExpressionKey(right)} = ${right_value}`
        );

        assert(
            approximatelyEqual(left_value, right_value),
            `${property} failed\n`+
            `${context}\n`+
            `x = ${value}\n`+
            `left:  ${orderedExpressionKey(left)} = ${left_value}\n`+
            `right: ${orderedExpressionKey(right)} = ${right_value}`
        );
    }

    assert(
        evaluated > 0,
        `${property}: no admissible sampled assignments\n${context}`
    );
    stats.semantic_cases++;
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
Verify the whole public local-move contract for a property: the move is
advertised, changes the equation, produces the expected expression, leaves the
other side alone, and is semantically valid throughout the property's domain.
*/
function assertMoveTransforms(before, source, target, expected, property, context, where) {
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
    assertEquationLayers(updated, property);

    const expected_equation = new Equation(expected, sentinel);
    assertSameExpression(updated.left, expected_equation.left, property, context);
    assertSameExpression(updated.right, expected_equation.right, property, `${context}\nright side changed`);
    assertExpressionsEquivalent(before, updated.left, property, `${context}\nmove semantics`, where);
    stats.moves++;
}

/* Balance moves do not preserve either side's value; they preserve equality. */
function assertEquationsEquivalent(before, after, property, context, where) {
    const predicate = where || (() => true);
    let evaluated = 0;

    for (const value of x_values) {
        const variables = {x:value};
        if (!predicate(variables)) {
            stats.domain_skips++;
            continue;
        }

        const before_left = valueOf(before.left, variables);
        const before_right = valueOf(before.right, variables);
        const after_left = valueOf(after.left, variables);
        const after_right = valueOf(after.right, variables);
        stats.evaluations++;
        evaluated++;

        assert(
            [before_left, before_right, after_left, after_right].every(Number.isFinite),
            `${property}: balance move became undefined on an admissible assignment\n`+
            `${context}\nx = ${value}`
        );

        const before_true = approximatelyEqual(before_left, before_right);
        const after_true = approximatelyEqual(after_left, after_right);
        assert(
            before_true === after_true,
            `${property}: balance move changed equation truth\n`+
            `${context}\nx = ${value}\n`+
            `before: ${before_left} = ${before_right}\n`+
            `after:  ${after_left} = ${after_right}`
        );
    }

    assert(
        evaluated > 0,
        `${property}: no admissible sampled assignments\n${context}`
    );
    stats.semantic_cases++;
}

function assertEquationMoveTransforms(before, source, target, expected, property, context, where) {
    const advertised = algebra.moves_for_source(before, source);
    assert(
        advertised.includes(target),
        `${property}: expected balance move was not advertised\n`+
        `${context}\nsource: ${source}\ntarget: ${target}\n`+
        `advertised: ${advertised.join(', ')}`
    );

    const updated = algebra.move(before, source, target);
    assert(
        updated !== before,
        `${property}: advertised balance move returned the original equation\n${context}`
    );
    assertEquationLayers(updated, property);

    assertSameExpression(updated.left, expected.left, property, `${context}\nleft side`);
    assertSameExpression(updated.right, expected.right, property, `${context}\nright side`);
    assertEquationsEquivalent(before, updated, property, `${context}\nmove semantics`, where);
    stats.moves++;
}

function forEachPair(callback) {
    for (const a of field_expression_cases)
    for (const b of field_expression_cases)
        callback(a, b);
}

function forEachTriple(callback) {
    for (const a of field_expression_cases)
    for (const b of field_expression_cases)
    for (const c of field_expression_cases)
        callback(a, b, c);
}

// -----------------------------------------------------------------------------
// Equation-side operation contexts
// Every side is add([mul([...]), ...]).  A lone value can therefore be
// addressed either as its only addend or as its only factor.
// -----------------------------------------------------------------------------

function equationSideOperationContexts() {
    for (const level of levels) {
        assertEquationLayers(level.equation, `level ${level.index + 1} equation`);
        assertEquationLayers(level.goal, `level ${level.index + 1} goal`);
    }

    const cases = [
        { name:'variable', value:x, nonzero:true },
        { name:'constant', value:expressions.constant(3), nonzero:true },
    ];
    const five = expressions.constant(5);

    for (const item of cases) {
        const before = new Equation(item.value, five);
        const context = `lone ${item.name}`;
        assertEquationLayers(before, context);

        const draggable = algebra.draggable_paths(before);
        assert(
            draggable.includes('L/0') &&
            algebra.moves_for_source(before, 'L/0').includes('side:R'),
            `${context}: the sole addend should be draggable across equality`
        );
        assert(
            draggable.includes('L/0/0') &&
            algebra.moves_for_source(before, 'L/0/0').includes('side:R'),
            `${context}: the sole factor should be draggable across equality`
        );

        const additive = algebra.move(before, 'L/0', 'side:R');
        assertEquationLayers(additive, `${context} additive drag`);
        assertSameExpression(
            additive.left,
            new Equation(zero, zero).left,
            'additive identity remainder',
            context
        );
        assertEquationsEquivalent(
            before,
            additive,
            'additive singleton balance',
            context,
            variables => isDefined(item.value, variables)
        );
        stats.moves++;

        const multiplicative = algebra.move(before, 'L/0/0', 'side:R');
        assertEquationLayers(multiplicative, `${context} multiplicative drag`);
        assertSameExpression(
            multiplicative.left,
            new Equation(one, zero).left,
            'multiplicative identity remainder',
            context
        );
        assertEquationsEquivalent(
            before,
            multiplicative,
            'multiplicative singleton balance',
            context,
            variables => isDefinedNonzero(item.value, variables)
        );
        stats.moves++;
    }
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
        const where = variables => allDefined([a, b], variables);

        if (!hasAdmissibleAssignment(where)) return;
        assertExpressionsEquivalent(left, right, 'additive commutativity', context, where);

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
                context,
                where
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
        const where = variables => allDefined([a, b, c], variables);
        if (!hasAdmissibleAssignment(where)) return;

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
            `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`,
            where
        );
    });
}

// -----------------------------------------------------------------------------
// Additive identity
// a + 0 = a = 0 + a
// -----------------------------------------------------------------------------

function additiveIdentity() {
    for (const a of field_expression_cases) {
        const where = variables => isDefined(a, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const context = `a = ${describeCase(a)}`;
        assertExpressionsEquivalent(
            expressions.add([a, zero]),
            a,
            'additive identity',
            `${context}\nright identity`,
            where
        );
        assertExpressionsEquivalent(
            expressions.add([zero, a]),
            a,
            'additive identity',
            `${context}\nleft identity`,
            where
        );
    }
}

// -----------------------------------------------------------------------------
// Additive inverse
// a + (-a) = 0
// -----------------------------------------------------------------------------

function additiveInverse() {
    for (const a of field_expression_cases) {
        const where = variables => isDefined(a, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const negative_a = scale_expressions.negate(a);
        const left = expressions.add([a, negative_a]);
        const context = `a = ${describeCase(a)}`;

        assertExpressionsEquivalent(left, zero, 'additive inverse', context, where);

        if (a.type !== 'add') {
            assertMoveTransforms(
                left,
                'L/0',
                'path:L/1',
                zero,
                'additive inverse',
                context,
                where
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
        const where = variables => allDefined([a, b], variables);

        if (!hasAdmissibleAssignment(where)) return;
        assertExpressionsEquivalent(left, right, 'multiplicative commutativity', context, where);

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
                'L/0/0',
                'path:L/0/1',
                right,
                'multiplicative commutativity',
                context,
                where
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
        const where = variables => allDefined([a, b, c], variables);
        if (!hasAdmissibleAssignment(where)) return;

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
            `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`,
            where
        );
    });
}

// -----------------------------------------------------------------------------
// Multiplicative identity
// a * 1 = a = 1 * a
// -----------------------------------------------------------------------------

function multiplicativeIdentity() {
    for (const a of field_expression_cases) {
        const where = variables => isDefined(a, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const context = `a = ${describeCase(a)}`;
        assertExpressionsEquivalent(
            expressions.mul([a, one]),
            a,
            'multiplicative identity',
            `${context}\nright identity`,
            where
        );
        assertExpressionsEquivalent(
            expressions.mul([one, a]),
            a,
            'multiplicative identity',
            `${context}\nleft identity`,
            where
        );
    }
}

// -----------------------------------------------------------------------------
// Multiplicative inverse
// a * a^-1 = 1, for a != 0
// -----------------------------------------------------------------------------

function multiplicativeInverse() {
    for (const a of field_expression_cases) {
        const where = variables => isDefinedNonzero(a, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const reciprocal_a = expressions.reciprocal(a);
        const product = expressions.mul([a, reciprocal_a]);
        const context = `a = ${describeCase(a)}`;

        assertExpressionsEquivalent(
            product,
            one,
            'multiplicative inverse',
            context,
            where
        );

        // Test cancellation through the public move API when a and a^-1 are
        // represented as two direct sibling factors *and* PowerExpressions
        // currently recognizes them as a combinable pair.  For example x*x^-1
        // is supported, while (x^2)*(x^2)^-1 would require power-of-a-power
        // normalization that the game does not yet implement.
        const combined = power_expressions.combine(a, reciprocal_a);
        if (
            combined != null &&
            orderedExpressionKey(combined) === orderedExpressionKey(one) &&
            product.type === 'mul' &&
            product.contents.length === 2 &&
            product.contents[0] === a &&
            product.contents[1] === reciprocal_a
        ) {
            assertMoveTransforms(
                product,
                'L/0/0',
                'path:L/0/1',
                one,
                'multiplicative inverse',
                context,
                where
            );
        }
    }
}

// -----------------------------------------------------------------------------
// Double reciprocal
// (a^-1)^-1 = a, for a != 0
// -----------------------------------------------------------------------------

function doubleReciprocal() {
    for (const a of field_expression_cases) {
        const where = variables => isDefinedNonzero(a, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        assertExpressionsEquivalent(
            expressions.reciprocal(expressions.reciprocal(a)),
            a,
            'double reciprocal',
            `a = ${describeCase(a)}`,
            where
        );
    }
}

// -----------------------------------------------------------------------------
// Inverse of a product
// (ab)^-1 = a^-1 b^-1, for a != 0 and b != 0
// -----------------------------------------------------------------------------

function inverseOfProduct() {
    forEachPair((a, b) => {
        const where = variables => allDefinedNonzero([a, b], variables);
        if (!hasAdmissibleAssignment(where)) return;

        const left = expressions.reciprocal(expressions.mul([a, b]));
        const right = expressions.mul([
            expressions.reciprocal(a),
            expressions.reciprocal(b),
        ]);

        assertExpressionsEquivalent(
            left,
            right,
            'inverse of product',
            `a = ${describeCase(a)}\nb = ${describeCase(b)}`,
            where
        );
    });
}

// -----------------------------------------------------------------------------
// Multiplicative cancellation
// (ab)b^-1 = a, for b != 0
// -----------------------------------------------------------------------------

function multiplicativeCancellation() {
    forEachPair((a, b) => {
        const where = variables =>
            isDefined(a, variables) && isDefinedNonzero(b, variables);
        if (!hasAdmissibleAssignment(where)) return;

        const left = expressions.mul([
            a,
            b,
            expressions.reciprocal(b),
        ]);

        assertExpressionsEquivalent(
            left,
            a,
            'multiplicative cancellation',
            `a = ${describeCase(a)}\nb = ${describeCase(b)}`,
            where
        );
    });
}

// -----------------------------------------------------------------------------
// Division definition
// a / b = a * b^-1, for b != 0
// -----------------------------------------------------------------------------

function divisionDefinition() {
    forEachPair((a, b) => {
        const where = variables =>
            isDefined(a, variables) && isDefinedNonzero(b, variables);
        if (!hasAdmissibleAssignment(where)) return;

        assertExpressionsEquivalent(
            expressions.div(a, b),
            expressions.mul([a, expressions.reciprocal(b)]),
            'division definition',
            `a = ${describeCase(a)}\nb = ${describeCase(b)}`,
            where
        );
    });
}

// -----------------------------------------------------------------------------
// Multiplicative balance
// ax = b  <->  x = b a^-1, for a != 0
// x a^-1 = b  <->  x = ba, for a != 0
// -----------------------------------------------------------------------------

function multiplicativeBalance() {
    const factor_cases = field_expression_cases.filter(a =>
        a.type !== 'mul' &&
        !(a.type === 'constant' && a.contents === 0)
    );

    for (const a of factor_cases)
    for (const b of field_expression_cases) {
        const where = variables =>
            isDefinedNonzero(a, variables) && isDefined(b, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const inverse_a = expressions.reciprocal(a);
        const before = new Equation(
            expressions.mul([a, x]),
            b
        );
        const expected = new Equation(
            x,
            expressions.append('mul', b, inverse_a)
        );
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}`;

        assertEquationMoveTransforms(
            before,
            'L/0/0',
            'side:R',
            expected,
            'multiplicative balance',
            `${context}\ndivide both sides by a`,
            where
        );

        const reciprocal_factor = expressions.reciprocal(a);
        const reverse_before = new Equation(
            expressions.mul([x, reciprocal_factor]),
            b
        );
        const reverse_expected = new Equation(
            x,
            expressions.append(
                'mul',
                b,
                expressions.reciprocal(reciprocal_factor)
            )
        );

        assertEquationMoveTransforms(
            reverse_before,
            'L/0/1',
            'side:R',
            reverse_expected,
            'multiplicative balance',
            `${context}\nmultiply both sides by a`,
            where
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
        const where = variables => allDefined([a, b, c], variables);
        if (!hasAdmissibleAssignment(where)) return;

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
            context,
            where
        );
        assertExpressionsEquivalent(
            right_product,
            right_expanded,
            'right distributivity',
            context,
            where
        );
    });

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
        expressions.reciprocal(expressions.add([x, expressions.constant(1)])),
    ];

    for (const a of scalar_cases)
    for (const b of addend_cases)
    for (const c of addend_cases) {
        const where = variables => allDefined([a, b, c], variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const sum = expressions.add([b, c]);
        const expanded = expressions.add(
            sum.contents.map(term => scale_expressions.scale(a, term))
        );
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`;

        assertMoveTransforms(
            expressions.mul([a, sum]),
            'L/0/0',
            'path:L/0/1',
            expanded,
            'left distributivity',
            context,
            where
        );

        assertMoveTransforms(
            expressions.mul([sum, a]),
            'L/0/1',
            'path:L/0/0',
            expanded,
            'right distributivity',
            context,
            where
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
    equationSideOperationContexts,
    additiveClosure,
    additiveCommutativity,
    additiveAssociativity,
    additiveIdentity,
    additiveInverse,
    multiplicativeClosure,
    multiplicativeCommutativity,
    multiplicativeAssociativity,
    multiplicativeIdentity,
    multiplicativeInverse,
    doubleReciprocal,
    inverseOfProduct,
    multiplicativeCancellation,
    divisionDefinition,
    multiplicativeBalance,
    distributivity,
].forEach(test => test());

console.log(
    `ok - 10 level solutions; `+
    `${stats.semantic_cases} property cases; `+
    `${stats.evaluations} evaluations; `+
    `${stats.domain_skips} domain exclusions; `+
    `${stats.moves} advertised property moves`
);