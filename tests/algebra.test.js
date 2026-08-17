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
    'scripts/models/expression/RingExpressions.js',
    'scripts/models/equation/Equation.js',
    'scripts/models/equation/EquationShape.js',
    'scripts/models/expression/ExpressionPaths.js',
    'scripts/models/equation/Equations.js',
    'scripts/models/equation/EquationDragOperations.js',
    'scripts/models/app/AppState.js',
    'scripts/models/app/AppHistoryTraversal.js',
    'scripts/models/app/AppDragOperations.js',
    'scripts/updaters/drags/DragState.js',
    'scripts/updaters/drags/EquationDrags.js',
    'scripts/updaters/AppUpdater.js',
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
const ring_expressions = RingExpressions({
    add: scale_expressions,
    mul: power_expressions,
});
const equation_shape = EquationShape(expression_shape);
const paths = ExpressionPaths(expressions);
const equations = Equations({
    expressions: expressions,
    ring_expressions: ring_expressions,
    expression_paths: paths,
});
const algebra = EquationDragOperations({
    expression_paths: paths,
    equations: equations,
});
const levels = Levels(expressions);
const history = AppHistoryTraversal(Infinity);
const equation_drags = EquationDrags(algebra);
const app_updater = AppUpdater({
    app_history_traversal: history,
    drag_ops: AppDragOperations(equation_drags, history),
    equation_drags: equation_drags,
    equation_shape: equation_shape,
});

const manual_drag_options = Object.freeze({
    enabled: Object.freeze({ add:true, mul:true }),
    auto_simplify: false,
});
const auto_simplify_drag_options = Object.freeze({
    enabled: Object.freeze({ add:true, mul:true }),
    auto_simplify: true,
});
const add_only_drag_options = Object.freeze({
    enabled: Object.freeze({ add:true, mul:false }),
    auto_simplify: false,
});
const multiply_only_drag_options = Object.freeze({
    enabled: Object.freeze({ add:false, mul:true }),
    auto_simplify: false,
});

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

function move(equation, source, target, drag_options) {
    const updated = algebra.move(equation, source, target, drag_options);
    assert(updated !== equation, `move should be valid: ${source} -> ${target}`);
    return updated;
}

// -----------------------------------------------------------------------------
// Level solutions
// -----------------------------------------------------------------------------

function solveLevel1() {
    let q = levels[0].equation;
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[0].goal, 'level 1');
}

function solveLevel2() {
    let q = levels[1].equation;
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[1].goal, 'level 2');
}

function solveLevel3() {
    let q = levels[2].equation;
    q = move(q, 'L/0', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[2].goal, 'level 3');
}

function solveLevel4() {
    let q = levels[3].equation;
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[3].goal, 'level 4');
}

function solveLevel5() {
    let q = levels[4].equation;
    q = move(q, 'L/0', 'path:L/1', manual_drag_options);
    q = move(q, 'L/0', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[4].goal, 'level 5');
}

function solveLevel6() {
    let q = levels[5].equation;
    q = move(q, 'R/0', 'side:L', manual_drag_options);
    q = move(q, 'L/0', 'path:L/2', manual_drag_options);
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    q = move(q, 'L/0', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[5].goal, 'level 6');
}

function solveLevel7() {
    let q = levels[6].equation;
    q = move(q, 'L/0', 'path:L/1', manual_drag_options);
    assertShape(q, levels[6].goal, 'level 7');
}

function solveLevel8() {
    let q = levels[7].equation;
    q = move(q, 'L/0/0', 'path:L/0/1', manual_drag_options);
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    q = move(q, 'L/0', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[7].goal, 'level 8');
}

function solveLevel9() {
    let q = levels[8].equation;
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[8].goal, 'level 9');
}

function solveLevel10() {
    let q = levels[9].equation;
    q = move(q, 'L/0/0', 'path:L/0/1', manual_drag_options);
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'side:L', manual_drag_options);
    q = move(q, 'L/0', 'path:L/2', manual_drag_options);
    q = move(q, 'L/1', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    q = move(q, 'L/0', 'side:R', manual_drag_options);
    q = move(q, 'R/1', 'path:R/0', manual_drag_options);
    assertShape(q, levels[9].goal, 'level 10');
}

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
    ring_expressions.inverse('add', x),
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
    ring_expressions.inverse('mul', x),
    ring_expressions.inverse('mul', 
        expressions.add([x, expressions.constant(1)])
    ),
    ring_expressions.inverse('mul', 
        expressions.add([x, expressions.constant(-2)])
    ),
    expressions.mul([
        expressions.constant(3),
        ring_expressions.inverse('mul', x),
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
function assertMoveTransforms(before, source, target, expected, property, context, where, drag_options) {
    const sentinel = expressions.constant(17);
    const equation = new Equation(before, sentinel);
    const advertised = algebra.moves_for_source(equation, source, drag_options);

    assert(
        advertised.includes(target),
        `${property}: expected move was not advertised\n`+
        `${context}\nsource: ${source}\ntarget: ${target}\n`+
        `advertised: ${advertised.join(', ')}`
    );

    const updated = algebra.move(equation, source, target, drag_options);
    assert(
        updated !== equation,
        `${property}: advertised move returned the original equation\n${context}`
    );

    assertSameExpression(updated.left, expected, property, context);
    assertSameExpression(updated.right, sentinel, property, `${context}\nright side changed`);
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

function assertEquationMoveTransforms(before, source, target, expected, property, context, where, drag_options) {
    const advertised = algebra.moves_for_source(before, source, drag_options);
    assert(
        advertised.includes(target),
        `${property}: expected balance move was not advertised\n`+
        `${context}\nsource: ${source}\ntarget: ${target}\n`+
        `advertised: ${advertised.join(', ')}`
    );

    const updated = algebra.move(before, source, target, drag_options);
    assert(
        updated !== before,
        `${property}: advertised balance move returned the original equation\n${context}`
    );

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
// Enabled drag operations
// Only enabled operations are draggable. A lone root is draggable only when
// exactly one operation is enabled, which supplies its otherwise-ambiguous
// additive or multiplicative meaning.
// -----------------------------------------------------------------------------

function enabledDragOperations() {
    const rhs = expressions.constant(2);

    for (const a of [x, expressions.constant(2)]) {
        const equation = new Equation(a, rhs);
        const context = `lone expression a = ${describeCase(a)}`;

        assert(
            algebra.moves_for_source(equation, 'L', manual_drag_options).length === 0,
            `enabled drag operations: lone expression should be ambiguous when add and mul are enabled\n${context}`
        );
        assert(
            !algebra.draggable_paths(equation, manual_drag_options).includes('L'),
            `enabled drag operations: ambiguous lone expression should not be draggable\n${context}`
        );

        assertEquationMoveTransforms(
            equation,
            'L',
            'side:R',
            new Equation(
                zero,
                expressions.add([rhs, ring_expressions.inverse('add', a)])
            ),
            'enabled drag operations',
            `${context}\nadd only`,
            variables => isDefined(a, variables),
            add_only_drag_options
        );

        assertEquationMoveTransforms(
            equation,
            'L',
            'side:R',
            new Equation(
                one,
                expressions.mul([rhs, ring_expressions.inverse('mul', a)])
            ),
            'enabled drag operations',
            `${context}\nmultiply only`,
            variables => isDefinedNonzero(a, variables),
            multiply_only_drag_options
        );
    }

    const sum = new Equation(expressions.add([x, expressions.constant(3)]), rhs);
    assert(
        algebra.move(sum, 'L/0', 'side:R', multiply_only_drag_options) === sum,
        'enabled drag operations: additive drag should be a no-op when add is disabled'
    );
    assert(
        !algebra.moves_for_source(sum, 'L/0', multiply_only_drag_options).includes('side:R'),
        'enabled drag operations: disabled additive drag should not be advertised'
    );

    const product = new Equation(expressions.mul([expressions.constant(3), x]), rhs);
    assert(
        algebra.move(product, 'L/1', 'side:R', add_only_drag_options) === product,
        'enabled drag operations: multiplicative drag should be a no-op when mul is disabled'
    );
    assert(
        !algebra.moves_for_source(product, 'L/1', add_only_drag_options).includes('side:R'),
        'enabled drag operations: disabled multiplicative drag should not be advertised'
    );

    const zero_equation = new Equation(zero, rhs);
    assert(
        algebra.move(zero_equation, 'L', 'side:R', multiply_only_drag_options) === zero_equation,
        'enabled drag operations: zero must not be draggable multiplicatively'
    );

    // Verify the same options make it through AppUpdater -> AppDragOperations
    // -> EquationDrags rather than only working through direct algebra calls.
    const released = equation_drags.release();
    const make_app = drag_options => new AppState(
        levels,
        0,
        new Equation(x, rhs),
        released,
        released.initialize(),
        [],
        [],
        'day',
        drag_options
    );

    const ambiguous_app = make_app(manual_drag_options);
    assert(
        app_updater.drag_start(ambiguous_app, 'L', 0, 0) === ambiguous_app,
        'enabled drag operations: AppUpdater should not start an ambiguous root drag'
    );

    const additive_app = make_app(add_only_drag_options);
    const additive_drag = app_updater.drag_start(additive_app, 'L', 0, 0);
    assert(additive_drag !== additive_app,
        'enabled drag operations: AppUpdater should start an Add-only root drag');
    const additive_drop = app_updater.drag_drop(additive_drag, 'side:R');
    assertSameExpression(additive_drop.equation.left, zero,
        'enabled drag operations', 'AppUpdater Add-only root drag');

    const multiplicative_app = make_app(multiply_only_drag_options);
    const multiplicative_drag = app_updater.drag_start(multiplicative_app, 'L', 0, 0);
    assert(multiplicative_drag !== multiplicative_app,
        'enabled drag operations: AppUpdater should start a Multiply-only root drag');
    const multiplicative_drop = app_updater.drag_drop(multiplicative_drag, 'side:R');
    assertSameExpression(multiplicative_drop.equation.left, one,
        'enabled drag operations', 'AppUpdater Multiply-only root drag');
}

// -----------------------------------------------------------------------------
// Operation toggle invariant
// At least one of add/mul is always enabled, and unrelated drag options survive.
// -----------------------------------------------------------------------------

function operationToggleInvariant() {
    const released = equation_drags.release();
    const make_app = enabled => new AppState(
        levels,
        0,
        levels[0].equation,
        released,
        released.initialize(),
        [],
        [],
        'day',
        { enabled:enabled, auto_simplify:false }
    );

    let app = make_app({ add:true, mul:true });
    app = app_updater.toggle_add(app);
    assert(!app.drag_options.enabled.add && app.drag_options.enabled.mul,
        'operation toggle invariant: disabling Add from both should leave Multiply enabled');
    assert(app.drag_options.auto_simplify === false,
        'operation toggle invariant: toggling operations should preserve auto_simplify');

    app = app_updater.toggle_multiply(app);
    assert(app.drag_options.enabled.add && !app.drag_options.enabled.mul,
        'operation toggle invariant: disabling the last enabled operation should switch to the other operation');

    app = app_updater.toggle_multiply(app);
    assert(app.drag_options.enabled.add && app.drag_options.enabled.mul,
        'operation toggle invariant: enabling an inactive operation should enable both');

    app = app_updater.toggle_multiply(app);
    assert(app.drag_options.enabled.add && !app.drag_options.enabled.mul,
        'operation toggle invariant: disabling Multiply from both should leave Add enabled');

    app = app_updater.toggle_add(app);
    assert(!app.drag_options.enabled.add && app.drag_options.enabled.mul,
        'operation toggle invariant: disabling the last Add should switch to Multiply');
}

// -----------------------------------------------------------------------------
// Automatic simplification
// Constant-valued expressions fold only after successful new drags.
// -----------------------------------------------------------------------------

function automaticSimplification() {
    const seven = expressions.constant(7);
    const minus_one = expressions.constant(-1);
    const unsimplified = expressions.add([seven, minus_one]);

    const manual = algebra.move(
        new Equation(expressions.add([x, one]), seven),
        'L/1',
        'side:R',
        manual_drag_options
    );
    assertSameExpression(
        manual.right,
        unsimplified,
        'automatic simplification',
        'disabled should preserve the arithmetic expression'
    );

    const automatic = algebra.move(
        new Equation(expressions.add([x, one]), seven),
        'L/1',
        'side:R',
        auto_simplify_drag_options
    );
    assertSameExpression(
        automatic.right,
        expressions.constant(6),
        'automatic simplification',
        'enabled should fold 7 - 1 after the drag'
    );

    const nested = new Equation(
        expressions.add([
            x,
            expressions.mul([
                expressions.constant(2),
                expressions.add([
                    expressions.constant(3),
                    expressions.constant(4),
                ]),
            ]),
        ]),
        zero
    );
    assertSameExpression(
        equations.simplify(nested).left,
        expressions.add([x, expressions.constant(14)]),
        'automatic simplification',
        'constant-valued subexpressions should fold recursively'
    );

    const flat = new Equation(
        expressions.add([x, expressions.constant(7), expressions.constant(-1)]),
        zero
    );
    assertSameExpression(
        equations.simplify(flat).left,
        expressions.add([x, expressions.constant(6)]),
        'automatic simplification',
        'constant-valued siblings should fold within a nonconstant expression'
    );

    const invalid = new Equation(unsimplified, x);
    assert(
        algebra.move(invalid, 'R', 'path:R', auto_simplify_drag_options) === invalid,
        'automatic simplification: an invalid drag must not simplify unrelated arithmetic'
    );

    // A drag commits the already-simplified equation. Undo/redo then traverse
    // those exact historical references without invoking simplification again.
    const released = equation_drags.release();
    const original_equation = new Equation(expressions.add([x, one]), seven);
    let app = new AppState(
        levels,
        0,
        original_equation,
        released,
        released.initialize(),
        [],
        [],
        'day',
        auto_simplify_drag_options
    );
    app = app_updater.drag_start(app, 'L/1', 0, 0);
    app = app_updater.drag_drop(app, 'side:R');
    const simplified_equation = app.equation;
    assertSameExpression(
        simplified_equation.right,
        expressions.constant(6),
        'automatic simplification',
        'drag should commit the simplified result'
    );

    app = app_updater.undo(app);
    assert(
        app.equation === original_equation,
        'automatic simplification: undo should restore the exact pre-drag equation reference'
    );

    app = app_updater.redo(app);
    assert(
        app.equation === simplified_equation,
        'automatic simplification: redo should restore the exact simplified equation reference'
    );

    const before_toggle = app;
    app = app_updater.toggle_auto_simplify(app);
    assert(app.drag_options.auto_simplify === false,
        'automatic simplification: toolbar toggle should disable auto-simplify');
    assert(app.drag_options.enabled === before_toggle.drag_options.enabled,
        'automatic simplification: toolbar toggle should preserve enabled operations');
    assert(app.equation === before_toggle.equation,
        'automatic simplification: toggling should not modify the equation');
}

// -----------------------------------------------------------------------------
// Fraction-preserving constant arithmetic
// Exact reciprocal structure is retained unless evaluation yields a whole
// number within the numerical tolerance.
// -----------------------------------------------------------------------------

function fractionPreservation() {
    const two = expressions.constant(2);
    const three = expressions.constant(3);
    const six = expressions.constant(6);
    const third = ring_expressions.inverse('mul', three);
    const one_third = expressions.mul([one, third]);
    const six_thirds = expressions.mul([six, third]);

    assertSameExpression(
        expressions.simplify(one_third),
        one_third,
        'fraction preservation',
        'simplify should retain a non-integral constant quotient as a reciprocal'
    );
    assertSameExpression(
        expressions.simplify(six_thirds),
        two,
        'fraction preservation',
        'simplify should collapse an integral constant quotient'
    );

    assert(
        expressions.combine('mul', two, third) == null,
        'fraction preservation: combine should decline 2/3 rather than produce a decimal'
    );
    assertSameExpression(
        expressions.combine('mul', six, third),
        two,
        'fraction preservation',
        'combine should collapse 6/3 to 2'
    );
    assert(
        power_expressions.combine(six, third) == null,
        'fraction preservation: PowerExpressions.combine should remain limited to power laws'
    );

    const thirds = expressions.add([
        expressions.mul([one, third]),
        expressions.mul([two, third]),
    ]);
    assertSameExpression(
        expressions.simplify(thirds),
        one,
        'fraction preservation',
        'several constant fractions may collapse when their total is whole'
    );

    const ordinary_decimal = expressions.add([
        expressions.constant(0.5),
        expressions.constant(0.25),
    ]);
    assertSameExpression(
        expressions.simplify(ordinary_decimal),
        expressions.constant(0.75),
        'fraction preservation',
        'non-integral arithmetic without a reciprocal should still simplify normally'
    );
}

// -----------------------------------------------------------------------------
// Ring-expression interface
// additive and multiplicative groups expose inversion polymorphically.
// -----------------------------------------------------------------------------

function ringExpressionInterface() {
    const negative_x = ring_expressions.inverse('add', x);
    assert(
        ring_expressions.is_inverse('add', negative_x),
        'RingExpressions: additive inverse should be recognized'
    );
    assert(
        !ring_expressions.is_inverse('add', x),
        'RingExpressions: ordinary additive expression should not be inverse'
    );
    assertSameExpression(
        ring_expressions.inverse('add', negative_x),
        x,
        'RingExpressions',
        'additive inverse should be involutive'
    );

    const reciprocal_x = ring_expressions.inverse('mul', x);
    assert(
        ring_expressions.is_inverse('mul', reciprocal_x),
        'RingExpressions: multiplicative inverse should be recognized'
    );
    assert(
        !ring_expressions.is_inverse('mul', x),
        'RingExpressions: ordinary multiplicative expression should not be inverse'
    );
    assertSameExpression(
        ring_expressions.inverse('mul', reciprocal_x),
        x,
        'RingExpressions',
        'multiplicative inverse should be involutive'
    );
    assert(
        ring_expressions.inverse('mul', zero) == null,
        'RingExpressions: zero should not have a multiplicative inverse'
    );
    assertSameExpression(
        ring_expressions.inverse('mul', one),
        one,
        'RingExpressions',
        'multiplicative identity should be its own inverse'
    );


    assertSameExpression(
        ring_expressions.absolute('add', negative_x),
        x,
        'RingExpressions',
        'absolute should invert an additive inverse'
    );
    assertSameExpression(
        ring_expressions.absolute('add', x),
        x,
        'RingExpressions',
        'absolute should preserve a non-inverse expression'
    );
    assertSameExpression(
        ring_expressions.absolute('mul', reciprocal_x),
        x,
        'RingExpressions',
        'absolute should invert a multiplicative inverse'
    );
    assertSameExpression(
        ring_expressions.absolute('mul', x),
        x,
        'RingExpressions',
        'absolute should preserve an ordinary multiplicative expression'
    );

    const two = expressions.constant(2);
    const three = expressions.constant(3);
    const x_plus_three = expressions.add([x, three]);
    assertSameExpression(
        ring_expressions.left_distribute('add', two, x_plus_three),
        expressions.add([
            expressions.mul([two, x]),
            expressions.constant(6),
        ]),
        'RingExpressions',
        'left distribution should delegate through the additive group expression'
    );
    assertSameExpression(
        ring_expressions.right_distribute('add', x_plus_three, two),
        expressions.add([
            expressions.mul([two, x]),
            expressions.constant(6),
        ]),
        'RingExpressions',
        'right distribution should delegate through the additive group expression'
    );
    assert(
        ring_expressions.left_distribute('mul', two, x_plus_three) == null,
        'RingExpressions: unsupported left distribution should return null'
    );
    assert(
        ring_expressions.right_distribute('mul', x_plus_three, two) == null,
        'RingExpressions: unsupported right distribution should return null'
    );
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
            expressions.combine('add', a, b) == null &&
            ring_expressions.combine('add', a, b) == null
        ) {
            assertMoveTransforms(
                left,
                'L/0',
                'path:L/1',
                right,
                'additive commutativity',
                context,
                where,
                manual_drag_options
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

        // Combining with 0 removes 0 regardless of which expression is
        // dragged.  This is a direct player action, not constructor
        // normalization, so an explicit identity can remain visible until
        // the user combines it.
        const identity_source = expressions.add([zero, a]);
        assertMoveTransforms(
            identity_source,
            'L/0',
            'path:L/1',
            a,
            'additive identity',
            `${context}\nidentity is the dragged source`,
            where,
            manual_drag_options
        );

        const identity_target = expressions.add([a, zero]);
        const identity_index = identity_target.contents.length - 1;
        assertMoveTransforms(
            identity_target,
            'L/0',
            `path:L/${identity_index}`,
            a,
            'additive identity',
            `${context}\nidentity is the drop target`,
            where,
            manual_drag_options
        );
    }

    const identity_equation = new Equation(zero, x);
    assertEquationMoveTransforms(
        identity_equation,
        'L',
        'side:R',
        new Equation(zero, expressions.add([x, zero])),
        'additive identity',
        'a lone additive identity remains draggable across equality',
        variables => isDefined(x, variables),
        add_only_drag_options
    );
}

// -----------------------------------------------------------------------------
// Additive inverse
// a + (-a) = 0
// -----------------------------------------------------------------------------

function additiveInverse() {
    for (const a of field_expression_cases) {
        const where = variables => isDefined(a, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const negative_a = ring_expressions.inverse('add', a);
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
                where,
                manual_drag_options
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
            expressions.combine('mul', a, b) == null &&
            ring_expressions.combine('mul', a, b) == null &&
            a.type !== 'add' &&
            b.type !== 'add'
        ) {
            assertMoveTransforms(
                left,
                'L/0',
                'path:L/1',
                right,
                'multiplicative commutativity',
                context,
                where,
                manual_drag_options
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

        // Combining with 1 removes 1 regardless of which expression is
        // dragged.
        const identity_source = expressions.mul([one, a]);
        assertMoveTransforms(
            identity_source,
            'L/0',
            'path:L/1',
            a,
            'multiplicative identity',
            `${context}\nidentity is the dragged source`,
            where,
            manual_drag_options
        );

        const identity_target = expressions.mul([a, one]);
        const identity_index = identity_target.contents.length - 1;
        assertMoveTransforms(
            identity_target,
            'L/0',
            `path:L/${identity_index}`,
            a,
            'multiplicative identity',
            `${context}\nidentity is the drop target`,
            where,
            manual_drag_options
        );
    }

    const identity_equation = new Equation(one, x);
    assertEquationMoveTransforms(
        identity_equation,
        'L',
        'side:R',
        new Equation(one, expressions.mul([x, one])),
        'multiplicative identity',
        'a lone multiplicative identity remains draggable across equality',
        variables => isDefined(x, variables),
        multiply_only_drag_options
    );
}

// -----------------------------------------------------------------------------
// Multiplicative inverse
// a * a^-1 = 1, for a != 0
// -----------------------------------------------------------------------------

function multiplicativeInverse() {
    for (const a of field_expression_cases) {
        const where = variables => isDefinedNonzero(a, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const reciprocal_a = ring_expressions.inverse('mul', a);
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
                'L/0',
                'path:L/1',
                one,
                'multiplicative inverse',
                context,
                where,
                manual_drag_options
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
            ring_expressions.inverse('mul', ring_expressions.inverse('mul', a)),
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

        const left = ring_expressions.inverse('mul', expressions.mul([a, b]));
        const right = expressions.mul([
            ring_expressions.inverse('mul', a),
            ring_expressions.inverse('mul', b),
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
            ring_expressions.inverse('mul', b),
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
            expressions.mul([a, ring_expressions.inverse('mul', b)]),
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

        const inverse_a = ring_expressions.inverse('mul', a);
        const before = new Equation(
            expressions.mul([a, x]),
            b
        );
        const expected = new Equation(
            x,
            expressions.append('mul', b, inverse_a)
        );
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}`;

        // Construction can only expose `a` as L/0 when it remains a direct
        // factor.  The filter above excludes products, and this check guards
        // against any future constructor changes.
        if (
            before.left.type === 'mul' &&
            before.left.contents[0] === a
        ) {
            assertEquationMoveTransforms(
                before,
                'L/0',
                'side:R',
                expected,
                'multiplicative balance',
                `${context}\ndivide both sides by a`,
                where,
                manual_drag_options
            );
        }

        const reciprocal_factor = ring_expressions.inverse('mul', a);
        const reverse_before = new Equation(
            expressions.mul([x, reciprocal_factor]),
            b
        );
        const reverse_expected = new Equation(
            x,
            expressions.append(
                'mul',
                b,
                ring_expressions.inverse('mul', reciprocal_factor)
            )
        );

        if (
            reverse_before.left.type === 'mul' &&
            reverse_before.left.contents.length === 2 &&
            reverse_before.left.contents[1] === reciprocal_factor
        ) {
            assertEquationMoveTransforms(
                reverse_before,
                'L/1',
                'side:R',
                reverse_expected,
                'multiplicative balance',
                `${context}\nmultiply both sides by a`,
                where,
                manual_drag_options
            );
        }
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
            where,
            manual_drag_options
        );
        assertExpressionsEquivalent(
            right_product,
            right_expanded,
            'right distributivity',
            context,
            where,
            manual_drag_options
        );
    });

    const factor_cases = [
        expressions.constant(-3),
        expressions.constant(-1),
        expressions.constant(0),
        expressions.constant(1),
        expressions.constant(2),
        x,
        expressions.pow(x, 2),
        ring_expressions.inverse('mul', x),
        ring_expressions.inverse('mul', expressions.add([x, expressions.constant(1)])),
    ];
    const addend_cases = [
        x,
        ring_expressions.inverse('add', x),
        expressions.mul([expressions.constant(3), x]),
        expressions.pow(x, 2),
        ring_expressions.inverse('mul', expressions.add([x, expressions.constant(1)])),
    ];

    for (const a of factor_cases)
    for (const b of addend_cases)
    for (const c of addend_cases) {
        const where = variables => allDefined([a, b, c], variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const sum = expressions.add([b, c]);
        const left_expanded = expressions.add(
            ring_expressions.left_distribute('add', a, sum).contents
        );
        const right_expanded = expressions.add(
            ring_expressions.right_distribute('add', sum, a).contents
        );
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`;

        assertMoveTransforms(
            expressions.mul([a, sum]),
            'L/0',
            'path:L/1',
            left_expanded,
            'left distributivity',
            context,
            where,
            manual_drag_options
        );

        assertMoveTransforms(
            expressions.mul([sum, a]),
            'L/1',
            'path:L/0',
            right_expanded,
            'right distributivity',
            context,
            where,
            manual_drag_options
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
    enabledDragOperations,
    operationToggleInvariant,
    automaticSimplification,
    fractionPreservation,
    ringExpressionInterface,
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