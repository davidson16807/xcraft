'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
[
    'scripts/models/expression/Expression.js',
    'scripts/models/expression/ExpressionShape.js',
    'scripts/models/grouplike/Grouplike.js',
    'scripts/models/grouplike/Grouplikes.js',
    'scripts/models/ringlike/Scale.js',
    'scripts/models/ringlike/Scales.js',
    'scripts/models/ringlike/ScaleExpressions.js',
    'scripts/models/ringlike/AddMultiplyExpressions.js',
    'scripts/models/ringlike/MultiplyAddExpressions.js',
    'scripts/models/ringlike/Power.js',
    'scripts/models/ringlike/Powers.js',
    'scripts/models/ringlike/PowerExpressions.js',
    'scripts/models/ringlike/MultiplyPowerExpressions.js',
    'scripts/models/ringlike/PowerMultiplyExpressions.js',
    'scripts/models/ringlike/Ringlike.js',
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
const grouplikes = Grouplikes({
    'add': Grouplike(
        'add',
        new Expression('constant', 0),
        new Expression('constant', 0),
        true,
        true,
        true,
        evaluate => expression => expression.contents.reduce(
            (accumulator, item) => accumulator + evaluate(item),
            0
        )
    ),
    'mul': Grouplike(
        'mul',
        new Expression('constant', 1),
        new Expression('constant', 1),
        true,
        true,
        true,
        evaluate => expression => expression.contents.reduce(
            (accumulator, item) => accumulator * evaluate(item),
            1
        )
    ),
    'pow': Grouplike(
        'pow',
        undefined,
        new Expression('constant', 1),
        false,
        false,
        false,
        evaluate => expression => Math.pow(
            evaluate(expression.contents[0]),
            evaluate(expression.contents[1])
        )
    ),
});
const scales = Scales(grouplikes, expression_shape);
const scale_expressions = ScaleExpressions(scales);
const add_multiply_expressions = AddMultiplyExpressions(scales);
const multiply_add_expressions = MultiplyAddExpressions(grouplikes);
const powers = Powers(grouplikes, expression_shape);
const power_expressions = PowerExpressions(powers);
const multiply_power_expressions = MultiplyPowerExpressions(powers);
const power_multiply_expressions = PowerMultiplyExpressions(grouplikes);
const precedence_for_tag = tag => {
    switch (tag) {
        case 'add': return 1;
        case 'mul': return 2;
        case 'pow': return 3;
        default: return 4;
    }
};
const ringlikes = Ringlike({
    unary: {
        add: scale_expressions,
        mul: power_expressions,
    },
    binary: {
        addmul: add_multiply_expressions,
        muladd: multiply_add_expressions,
        mulpow: multiply_power_expressions,
        powmul: power_multiply_expressions,
    },
    demote: grouplikes.demote,
    precedence_for_tag: precedence_for_tag,
});
const equation_shape = EquationShape(expression_shape);
const paths = ExpressionPaths(grouplikes);
const equations = Equations({
    grouplikes: grouplikes,
    ringlikes: ringlikes,
    expression_paths: paths,
});
const algebra = EquationDragOperations({
    expression_paths: paths,
    equations: equations,
});
const levels = Levels(grouplikes);
const history = AppHistoryTraversal(Infinity);
const equation_drags = EquationDrags(algebra);
const app_updater = AppUpdater({
    app_history_traversal: history,
    drag_ops: AppDragOperations(equation_drags, history),
    equation_drags: equation_drags,
    equation_shape: equation_shape,
});

const manual_drag_options = Object.freeze({
    enabled: new Set(['add', 'mul', 'pow']),
    auto_simplify: false,
});
const auto_simplify_drag_options = Object.freeze({
    enabled: new Set(['add', 'mul', 'pow']),
    auto_simplify: true,
});
const add_only_drag_options = Object.freeze({
    enabled: new Set(['add', 'pow']),
    auto_simplify: false,
});
const multiply_only_drag_options = Object.freeze({
    enabled: new Set(['mul', 'pow']),
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
    q = move(q, 'L/1/0', 'path:L/1/1', manual_drag_options);
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

const x = grouplikes.variable('x');
const zero = grouplikes.constant(0);
const one = grouplikes.constant(1);

/*
The ringlikes pool contains grouplikes without division by a variable expression.
The field pool extends it with reciprocals and negative powers.  Algebraic
metavariables a, b, and c range over the field pool; only x ranges over raw
Numbers during semantic evaluation.
*/
const ring_expression_cases = Object.freeze([
    grouplikes.constant(-3),
    grouplikes.constant(0),
    grouplikes.constant(1),
    grouplikes.constant(2),
    x,
    ringlikes.inverse('add', x),
    grouplikes.add([x, grouplikes.constant(2)]),
    grouplikes.add([x, grouplikes.constant(-3)]),
    grouplikes.mul([grouplikes.constant(3), x]),
    grouplikes.pow(x, 2),
    grouplikes.add([
        grouplikes.pow(x, 2),
        x,
        grouplikes.constant(1),
    ]),
    grouplikes.mul([
        grouplikes.add([x, grouplikes.constant(1)]),
        grouplikes.add([x, grouplikes.constant(-2)]),
    ]),
]);

const field_expression_cases = Object.freeze([
    ...ring_expression_cases,
    ringlikes.inverse('mul', x),
    ringlikes.inverse('mul', 
        grouplikes.add([x, grouplikes.constant(1)])
    ),
    ringlikes.inverse('mul', 
        grouplikes.add([x, grouplikes.constant(-2)])
    ),
    grouplikes.mul([
        grouplikes.constant(3),
        ringlikes.inverse('mul', x),
    ]),
    grouplikes.pow(x, -2),
    grouplikes.div(
        grouplikes.add([x, grouplikes.constant(1)]),
        grouplikes.add([x, grouplikes.constant(-1)])
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
    return grouplikes.evaluate(expression, variables);
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
Semantic properties over rational grouplikes are pointwise: assignments at
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
    const sentinel = grouplikes.constant(17);
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
// exactly one enabled operation admits a valid inverse/identity rewrite, which
// supplies its otherwise-ambiguous additive or multiplicative meaning.
// -----------------------------------------------------------------------------

function enabledDragOperations() {
    const rhs = grouplikes.constant(2);

    for (const a of [x, grouplikes.constant(2)]) {
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
                grouplikes.add([rhs, ringlikes.inverse('add', a)])
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
                grouplikes.mul([rhs, ringlikes.inverse('mul', a)])
            ),
            'enabled drag operations',
            `${context}\nmultiply only`,
            variables => isDefinedNonzero(a, variables),
            multiply_only_drag_options
        );
    }

    const sum = new Equation(grouplikes.add([x, grouplikes.constant(3)]), rhs);
    assert(
        algebra.move(sum, 'L/0', 'side:R', multiply_only_drag_options) === sum,
        'enabled drag operations: additive drag should be a no-op when add is disabled'
    );
    assert(
        !algebra.moves_for_source(sum, 'L/0', multiply_only_drag_options).includes('side:R'),
        'enabled drag operations: disabled additive drag should not be advertised'
    );

    const product = new Equation(grouplikes.mul([grouplikes.constant(3), x]), rhs);
    assert(
        algebra.move(product, 'L/1', 'side:R', add_only_drag_options) === product,
        'enabled drag operations: multiplicative drag should be a no-op when mul is disabled'
    );
    assert(
        !algebra.moves_for_source(product, 'L/1', add_only_drag_options).includes('side:R'),
        'enabled drag operations: disabled multiplicative drag should not be advertised'
    );

    const zero_equation = new Equation(zero, rhs);
    assertEquationMoveTransforms(
        zero_equation,
        'L',
        'side:R',
        new Equation(zero, grouplikes.add([rhs, zero])),
        'enabled drag operations',
        'only the additive interpretation of zero is valid even when add and mul are enabled',
        () => true,
        manual_drag_options
    );
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

    let app = make_app(new Set(['add', 'mul', 'pow']));
    app = app_updater.toggle_add(app);
    assert(!app.drag_options.enabled.has('add') && app.drag_options.enabled.has('mul'),
        'operation toggle invariant: disabling Add from both should leave Multiply enabled');
    assert(app.drag_options.auto_simplify === false,
        'operation toggle invariant: toggling operations should preserve auto_simplify');

    app = app_updater.toggle_multiply(app);
    assert(app.drag_options.enabled.has('add') && !app.drag_options.enabled.has('mul'),
        'operation toggle invariant: disabling the last enabled operation should switch to the other operation');

    app = app_updater.toggle_multiply(app);
    assert(app.drag_options.enabled.has('add') && app.drag_options.enabled.has('mul'),
        'operation toggle invariant: enabling an inactive operation should enable both');

    app = app_updater.toggle_multiply(app);
    assert(app.drag_options.enabled.has('add') && !app.drag_options.enabled.has('mul'),
        'operation toggle invariant: disabling Multiply from both should leave Add enabled');

    app = app_updater.toggle_add(app);
    assert(!app.drag_options.enabled.has('add') && app.drag_options.enabled.has('mul'),
        'operation toggle invariant: disabling the last Add should switch to Multiply');
    assert(app.drag_options.enabled.has('pow'),
        'operation toggle invariant: toggling Add/Multiply should preserve unrelated enabled operations');
}

// -----------------------------------------------------------------------------
// Automatic simplification
// Constant-valued grouplikes fold only after successful new drags.
// -----------------------------------------------------------------------------

function automaticSimplification() {
    const seven = grouplikes.constant(7);
    const minus_one = grouplikes.constant(-1);
    const unsimplified = grouplikes.add([seven, minus_one]);

    const manual = algebra.move(
        new Equation(grouplikes.add([x, one]), seven),
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
        new Equation(grouplikes.add([x, one]), seven),
        'L/1',
        'side:R',
        auto_simplify_drag_options
    );
    assertSameExpression(
        automatic.right,
        grouplikes.constant(6),
        'automatic simplification',
        'enabled should fold 7 - 1 after the drag'
    );

    const nested = new Equation(
        grouplikes.add([
            x,
            grouplikes.mul([
                grouplikes.constant(2),
                grouplikes.add([
                    grouplikes.constant(3),
                    grouplikes.constant(4),
                ]),
            ]),
        ]),
        zero
    );
    assertSameExpression(
        equations.simplify(nested).left,
        grouplikes.add([x, grouplikes.constant(14)]),
        'automatic simplification',
        'constant-valued subgrouplikes should fold recursively'
    );

    const flat = new Equation(
        grouplikes.add([x, grouplikes.constant(7), grouplikes.constant(-1)]),
        zero
    );
    assertSameExpression(
        equations.simplify(flat).left,
        grouplikes.add([x, grouplikes.constant(6)]),
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
    const original_equation = new Equation(grouplikes.add([x, one]), seven);
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
        grouplikes.constant(6),
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
    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const six = grouplikes.constant(6);
    const third = ringlikes.inverse('mul', three);
    const one_third = grouplikes.mul([one, third]);
    const six_thirds = grouplikes.mul([six, third]);

    assertSameExpression(
        grouplikes.simplify(one_third),
        one_third,
        'fraction preservation',
        'simplify should retain a non-integral constant quotient as a reciprocal'
    );
    assertSameExpression(
        grouplikes.simplify(six_thirds),
        two,
        'fraction preservation',
        'simplify should collapse an integral constant quotient'
    );

    assert(
        grouplikes.combine('mul', two, third) == null,
        'fraction preservation: combine should decline 2/3 rather than produce a decimal'
    );
    assertSameExpression(
        grouplikes.combine('mul', six, third),
        two,
        'fraction preservation',
        'combine should collapse 6/3 to 2'
    );
    assert(
        multiply_power_expressions.combine(six, third) == null,
        'fraction preservation: MultiplyPowerExpressions.combine should remain limited to power laws'
    );

    const thirds = grouplikes.add([
        grouplikes.mul([one, third]),
        grouplikes.mul([two, third]),
    ]);
    assertSameExpression(
        grouplikes.simplify(thirds),
        one,
        'fraction preservation',
        'several constant fractions may collapse when their total is whole'
    );

    const ordinary_decimal = grouplikes.add([
        grouplikes.constant(0.5),
        grouplikes.constant(0.25),
    ]);
    assertSameExpression(
        grouplikes.simplify(ordinary_decimal),
        grouplikes.constant(0.75),
        'fraction preservation',
        'non-integral arithmetic without a reciprocal should still simplify normally'
    );
}

// -----------------------------------------------------------------------------
// Ring-expression interface
// additive and multiplicative groups expose inversion polymorphically.
// -----------------------------------------------------------------------------

function ringExpressionInterface() {
    const negative_x = ringlikes.inverse('add', x);
    assert(
        ringlikes.is_inverse('add', negative_x),
        'Ringlike: additive inverse should be recognized'
    );
    assert(
        !ringlikes.is_inverse('add', x),
        'Ringlike: ordinary additive expression should not be inverse'
    );
    assertSameExpression(
        ringlikes.inverse('add', negative_x),
        x,
        'Ringlike',
        'additive inverse should be involutive'
    );

    const reciprocal_x = ringlikes.inverse('mul', x);
    assert(
        ringlikes.is_inverse('mul', reciprocal_x),
        'Ringlike: multiplicative inverse should be recognized'
    );
    assert(
        !ringlikes.is_inverse('mul', x),
        'Ringlike: ordinary multiplicative expression should not be inverse'
    );
    assertSameExpression(
        ringlikes.inverse('mul', reciprocal_x),
        x,
        'Ringlike',
        'multiplicative inverse should be involutive'
    );
    assert(
        ringlikes.inverse('mul', zero) == null,
        'Ringlike: zero should not have a multiplicative inverse'
    );
    assertSameExpression(
        ringlikes.inverse('mul', one),
        one,
        'Ringlike',
        'multiplicative identity should be its own inverse'
    );


    assertSameExpression(
        ringlikes.absolute('add', negative_x),
        x,
        'Ringlike',
        'absolute should invert an additive inverse'
    );
    assertSameExpression(
        ringlikes.absolute('add', x),
        x,
        'Ringlike',
        'absolute should preserve a non-inverse expression'
    );
    assertSameExpression(
        ringlikes.absolute('mul', reciprocal_x),
        x,
        'Ringlike',
        'absolute should invert a multiplicative inverse'
    );
    assertSameExpression(
        ringlikes.absolute('mul', x),
        x,
        'Ringlike',
        'absolute should preserve an ordinary multiplicative expression'
    );

    assert(
        power_expressions.combine == null &&
        power_expressions.left_distribute == null &&
        power_expressions.right_distribute == null,
        'Ringlike: unary PowerExpressions should not expose binary relationships'
    );

    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const x_plus_three = grouplikes.add([x, three]);
    assertSameExpression(
        ringlikes.left_distribute(
            grouplikes.mul([two, x_plus_three]),
            two,
            x_plus_three
        ),
        grouplikes.add([
            grouplikes.mul([two, x]),
            grouplikes.mul([two, three]),
        ]),
        'Ringlike',
        'left distribution should delegate through the additive group expression'
    );
    assertSameExpression(
        ringlikes.right_distribute(
            grouplikes.mul([x_plus_three, two]),
            x_plus_three,
            two
        ),
        grouplikes.add([
            grouplikes.mul([x, two]),
            grouplikes.mul([three, two]),
        ]),
        'Ringlike',
        'right distribution should delegate through the additive group expression'
    );
    assert(
        ringlikes.left_distribute(grouplikes.add([two, x_plus_three]), two, x_plus_three) == null,
        'Ringlike: unsupported left distribution should return null'
    );
    assert(
        ringlikes.right_distribute(grouplikes.add([x_plus_three, two]), x_plus_three, two) == null,
        'Ringlike: unsupported right distribution should return null'
    );

    assertSameExpression(
        grouplikes.demote(grouplikes.pow(x, one)),
        x,
        'demotion',
        'power right identity should demote independently of simplification'
    );
    assertSameExpression(
        grouplikes.demote(grouplikes.mul([one, x])),
        x,
        'demotion',
        'multiplicative left identity should demote independently of simplification'
    );
    assertSameExpression(
        grouplikes.demote(grouplikes.mul([x, one])),
        x,
        'demotion',
        'multiplicative right identity should demote independently of simplification'
    );
    const unsimplified_exponent = grouplikes.add([one, two]);
    const unsimplified_power = grouplikes.pow(x, unsimplified_exponent);
    assertSameExpression(
        grouplikes.demote(unsimplified_power),
        unsimplified_power,
        'demotion',
        'demotion must not perform optional arithmetic simplification'
    );

    const x_squared = grouplikes.pow(x, two);
    const x_cubed = grouplikes.pow(x, three);
    assertSameExpression(
        multiply_power_expressions.combine(
            x_squared,
            x_cubed
        ),
        grouplikes.pow(x, 5),
        'MultiplyPowerExpressions',
        'common-base multiplication should combine exponents'
    );
    assert(
        ringlikes.combine(grouplikes.pow(x, two), x, two) == null,
        'Ringlike: binary power laws must not combine the base and exponent children of pow'
    );
    assertSameExpression(
        ringlikes.combine(grouplikes.mul([x, x_squared]), x, x_squared),
        grouplikes.pow(x, 3),
        'Ringlike',
        'an atomic factor should promote to the degenerate power x^1 for mulpow combination'
    );
    assertSameExpression(
        ringlikes.combine(
            grouplikes.mul([two, grouplikes.pow(two, three)]),
            two,
            grouplikes.pow(two, three)
        ),
        grouplikes.pow(two, 4),
        'Ringlike',
        'mulpow promotion should work for constant bases'
    );

    const product = grouplikes.mul([x, three]);
    const square = grouplikes.pow(product, two);
    assertSameExpression(
        ringlikes.right_distribute(square, product, two),
        grouplikes.mul([
            grouplikes.pow(x, two),
            grouplikes.pow(three, two),
        ]),
        'Ringlike',
        'right distribution should distribute powers over multiplication'
    );
    const powered_factor_product = grouplikes.mul([x_squared, x_plus_three]);
    assertSameExpression(
        ringlikes.left_distribute(powered_factor_product, x_squared, x_plus_three),
        grouplikes.add([
            grouplikes.mul([x_squared, x]),
            grouplikes.mul([x_squared, three]),
        ]),
        'Ringlike',
        'distribution should dispatch from the target structure even when the source has higher precedence'
    );

    assertMoveTransforms(
        square,
        'L/1',
        'path:L/0',
        grouplikes.mul([
            grouplikes.pow(x, two),
            grouplikes.pow(three, two),
        ]),
        'power distributivity',
        '(3x)^2 = x^2 * 3^2',
        variables => isDefined(x, variables),
        manual_drag_options
    );
}

// -----------------------------------------------------------------------------
// Additive closure
// a + b is an Expression.
// -----------------------------------------------------------------------------

function additiveClosure() {
    forEachPair((a, b) => {
        const result = grouplikes.add([a, b]);
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
        const left = grouplikes.add([a, b]);
        const right = grouplikes.add([b, a]);
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}`;
        const where = variables => allDefined([a, b], variables);

        if (!hasAdmissibleAssignment(where)) return;
        assertExpressionsEquivalent(left, right, 'additive commutativity', context, where);

        if (
            a !== b &&
            a.type !== 'add' &&
            b.type !== 'add' &&
            grouplikes.combine('add', a, b) == null &&
            ringlikes.combine(grouplikes.add([a, b]), a, b) == null
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

        const left = grouplikes.add([
            grouplikes.add([a, b]),
            c,
        ]);
        const right = grouplikes.add([
            a,
            grouplikes.add([b, c]),
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
            grouplikes.add([a, zero]),
            a,
            'additive identity',
            `${context}\nright identity`,
            where
        );
        assertExpressionsEquivalent(
            grouplikes.add([zero, a]),
            a,
            'additive identity',
            `${context}\nleft identity`,
            where
        );

        // Combining with 0 removes 0 regardless of which expression is
        // dragged.  This is a direct player action, not constructor
        // normalization, so an explicit identity can remain visible until
        // the user combines it.
        const identity_source = grouplikes.add([zero, a]);
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

        const identity_target = grouplikes.add([a, zero]);
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
        new Equation(zero, grouplikes.add([x, zero])),
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

        const negative_a = ringlikes.inverse('add', a);
        const left = grouplikes.add([a, negative_a]);
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
        const result = grouplikes.mul([a, b]);
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
        const left = grouplikes.mul([a, b]);
        const right = grouplikes.mul([b, a]);
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}`;
        const where = variables => allDefined([a, b], variables);

        if (!hasAdmissibleAssignment(where)) return;
        assertExpressionsEquivalent(left, right, 'multiplicative commutativity', context, where);

        if (
            a !== b &&
            a.type !== 'mul' &&
            b.type !== 'mul' &&
            grouplikes.combine('mul', a, b) == null &&
            ringlikes.combine(grouplikes.mul([a, b]), a, b) == null &&
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

        const left = grouplikes.mul([
            grouplikes.mul([a, b]),
            c,
        ]);
        const right = grouplikes.mul([
            a,
            grouplikes.mul([b, c]),
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
            grouplikes.mul([a, one]),
            a,
            'multiplicative identity',
            `${context}\nright identity`,
            where
        );
        assertExpressionsEquivalent(
            grouplikes.mul([one, a]),
            a,
            'multiplicative identity',
            `${context}\nleft identity`,
            where
        );

        // Combining with 1 removes 1 regardless of which expression is
        // dragged.
        const identity_source = grouplikes.mul([one, a]);
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

        const identity_target = grouplikes.mul([a, one]);
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
        new Equation(one, grouplikes.mul([x, one])),
        'multiplicative identity',
        'a lone multiplicative identity remains draggable across equality',
        variables => isDefined(x, variables),
        multiply_only_drag_options
    );
}

// -----------------------------------------------------------------------------
// Power right identity
// a^1 = a, while 1^a is not an identity law.
// -----------------------------------------------------------------------------

function powerIdentity() {
    for (const a of field_expression_cases) {
        const where = variables => isDefined(a, variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const powered = grouplikes.pow(a, one);
        const context = `a = ${describeCase(a)}`;

        assertExpressionsEquivalent(
            powered,
            a,
            'power right identity',
            context,
            where
        );

        // Either child may be the drag source; Grouplike.combine receives the
        // operands in expression order, so the right identity remains right-sided.
        assertMoveTransforms(
            powered,
            'L/0',
            'path:L/1',
            a,
            'power right identity',
            `${context}\nbase is the dragged source`,
            where,
            manual_drag_options
        );
        assertMoveTransforms(
            powered,
            'L/1',
            'path:L/0',
            a,
            'power right identity',
            `${context}\nexponent is the dragged source`,
            where,
            manual_drag_options
        );
    }

    const left_identity_candidate = grouplikes.pow(one, x);
    const equation = new Equation(left_identity_candidate, grouplikes.constant(17));
    assert(
        !algebra.moves_for_source(equation, 'L/0', manual_drag_options).includes('path:L/1') &&
        !algebra.moves_for_source(equation, 'L/1', manual_drag_options).includes('path:L/0'),
        'power identity: 1 is not a left identity for exponentiation'
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

        const reciprocal_a = ringlikes.inverse('mul', a);
        const product = grouplikes.mul([a, reciprocal_a]);
        const context = `a = ${describeCase(a)}`;

        assertExpressionsEquivalent(
            product,
            one,
            'multiplicative inverse',
            context,
            where
        );

        // Test cancellation through the public move API when a and a^-1 are
        // represented as two direct sibling factors *and* MultiplyPowerExpressions
        // currently recognizes them as a combinable pair.  For example x*x^-1
        // is supported, while (x^2)*(x^2)^-1 would require power-of-a-power
        // normalization that the game does not yet implement.
        const combined = multiply_power_expressions.combine(a, reciprocal_a);
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
            ringlikes.inverse('mul', ringlikes.inverse('mul', a)),
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

        const left = ringlikes.inverse('mul', grouplikes.mul([a, b]));
        const right = grouplikes.mul([
            ringlikes.inverse('mul', a),
            ringlikes.inverse('mul', b),
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

        const left = grouplikes.mul([
            a,
            b,
            ringlikes.inverse('mul', b),
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
            grouplikes.div(a, b),
            grouplikes.mul([a, ringlikes.inverse('mul', b)]),
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

        const inverse_a = ringlikes.inverse('mul', a);
        const before = new Equation(
            grouplikes.mul([a, x]),
            b
        );
        const expected = new Equation(
            x,
            grouplikes.append('mul', b, inverse_a)
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

        const reciprocal_factor = ringlikes.inverse('mul', a);
        const reverse_before = new Equation(
            grouplikes.mul([x, reciprocal_factor]),
            b
        );
        const reverse_expected = new Equation(
            x,
            grouplikes.append(
                'mul',
                b,
                ringlikes.inverse('mul', reciprocal_factor)
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

        const sum_bc = grouplikes.add([b, c]);
        const sum_ab = grouplikes.add([a, b]);
        const left_product = grouplikes.mul([a, sum_bc]);
        const left_expanded = grouplikes.add([
            grouplikes.mul([a, b]),
            grouplikes.mul([a, c]),
        ]);
        const right_product = grouplikes.mul([sum_ab, c]);
        const right_expanded = grouplikes.add([
            grouplikes.mul([a, c]),
            grouplikes.mul([b, c]),
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
        grouplikes.constant(-3),
        grouplikes.constant(-1),
        grouplikes.constant(0),
        grouplikes.constant(1),
        grouplikes.constant(2),
        x,
        grouplikes.pow(x, 2),
        ringlikes.inverse('mul', x),
        ringlikes.inverse('mul', grouplikes.add([x, grouplikes.constant(1)])),
    ];
    const addend_cases = [
        x,
        ringlikes.inverse('add', x),
        grouplikes.mul([grouplikes.constant(3), x]),
        grouplikes.pow(x, 2),
        ringlikes.inverse('mul', grouplikes.add([x, grouplikes.constant(1)])),
    ];

    for (const a of factor_cases)
    for (const b of addend_cases)
    for (const c of addend_cases) {
        const where = variables => allDefined([a, b, c], variables);
        if (!hasAdmissibleAssignment(where)) continue;

        const sum = grouplikes.add([b, c]);
        if (
            grouplikes.combine('mul', a, sum) != null ||
            ringlikes.combine(grouplikes.mul([a, sum]), a, sum) != null
        ) continue;
        const left_expanded = grouplikes.add(
            ringlikes.left_distribute(grouplikes.mul([a, sum]), a, sum).contents
        );
        const right_expanded = grouplikes.add(
            ringlikes.right_distribute(grouplikes.mul([sum, a]), sum, a).contents
        );
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`;

        assertMoveTransforms(
            grouplikes.mul([a, sum]),
            'L/0',
            'path:L/1',
            left_expanded,
            'left distributivity',
            context,
            where,
            manual_drag_options
        );

        assertMoveTransforms(
            grouplikes.mul([sum, a]),
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
    powerIdentity,
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