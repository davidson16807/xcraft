'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
[
    'scripts/models/expression/Expression.js',
    'scripts/models/expression/ExpressionCaveats.js',
    'scripts/models/expression/ExpressionShape.js',
    'scripts/models/relation/Relation.js',
    'scripts/models/orderlike/Orderlike.js',
    'scripts/models/orderlike/Orderlikes.js',
    'scripts/models/grouplike/Grouplike.js',
    'scripts/models/grouplike/Grouplikes.js',
    'scripts/models/ringlike/Scale.js',
    'scripts/models/ringlike/Scales.js',
    'scripts/models/ringlike/ScaleExpressions.js',
    'scripts/models/ringlike/Power.js',
    'scripts/models/ringlike/Powers.js',
    'scripts/models/ringlike/PowerExpressions.js',
    'scripts/models/powertriangle/PowerTriangle.js',
    'scripts/models/powertriangle/PowerTriangles.js',
    'scripts/models/powertriangle/PowerTriangleSameness.js',
    'scripts/models/powertriangle/PowerTriangleComposition.js',
    'scripts/models/powertriangle/PowerTriangleInverse.js',
    'scripts/models/ringlike/Ringlikes.js',
    'scripts/models/equation/Equation.js',
    'scripts/models/equation/EquationDragChoice.js',
    'scripts/models/expression/ExpressionPaths.js',
    'scripts/models/equation/Equations.js',
    'scripts/models/equation/EquationPathOperations.js',
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
const expression_caveats = ExpressionCaveats(expression_shape);
const grouplikes = Grouplikes({
    'add': Grouplike(
        'add',
        new Expression('constant', 0),
        {
            is_commutative: true,
            is_associative: true,
            is_invertible: true,
            is_left_cancellative: true,
            is_right_cancellative: true,
        },
        evaluate => expression => expression.contents.reduce(
            (accumulator, item) => accumulator + evaluate(item),
            0
        ),
        expression_caveats
    ),
    'mul': Grouplike(
        'mul',
        new Expression('constant', 1),
        {
            is_commutative: true,
            is_associative: true,
            is_invertible: true,
            is_left_cancellative: true,
            is_right_cancellative: true,
        },
        evaluate => expression => expression.contents.reduce(
            (accumulator, item) => accumulator * evaluate(item),
            1
        ),
        expression_caveats
    ),
    'pow': Grouplike(
        'pow',
        new Expression('constant', 1),
        {
            is_right_cancellative: true,
        },
        evaluate => expression => Math.pow(
            evaluate(expression.contents[0]),
            evaluate(expression.contents[1])
        ),
        expression_caveats
    ),
    'log': Grouplike(
        'log',
        undefined,
        {},
        evaluate => expression => Math.log(evaluate(expression.contents[1])) /
            Math.log(evaluate(expression.contents[0])),
        expression_caveats
    ),
    'root': Grouplike(
        'root',
        undefined,
        {},
        evaluate => expression => Math.pow(
            evaluate(expression.contents[1]),
            1 / evaluate(expression.contents[0])
        ),
        expression_caveats
    ),
    'harmonic': Grouplike(
        'harmonic',
        undefined,
        {
            is_commutative: true,
            is_associative: true,
        },
        evaluate => expression => 1 / expression.contents.reduce(
            (sum, item) => sum + 1 / evaluate(item),
            0
        ),
        expression_caveats
    ),
}, expression_caveats);
const comparable = comparison => evaluate => relation => {
    const left = evaluate(relation.left);
    const right = evaluate(relation.right);
    return Number.isFinite(left) && Number.isFinite(right)? comparison(left, right) : undefined;
};
const orderlikes = Orderlikes({
    eq: Orderlike('eq', {
        is_reflexive: true,
        is_symmetric: true,
        is_transitive: true,
        is_antisymmetric: true,
        converse: 'eq',
    }, comparable((left, right) => left === right)),
    neq: Orderlike('neq', {
        is_symmetric: true,
        converse: 'neq',
    }, comparable((left, right) => left !== right)),
    lt: Orderlike('lt', {
        is_transitive: true,
        is_asymmetric: true,
        converse: 'gt',
    }, comparable((left, right) => left < right)),
    lte: Orderlike('lte', {
        is_reflexive: true,
        is_transitive: true,
        is_antisymmetric: true,
        converse: 'gte',
    }, comparable((left, right) => left <= right)),
    gt: Orderlike('gt', {
        is_transitive: true,
        is_asymmetric: true,
        converse: 'lt',
    }, comparable((left, right) => left > right)),
    gte: Orderlike('gte', {
        is_reflexive: true,
        is_transitive: true,
        is_antisymmetric: true,
        converse: 'lte',
    }, comparable((left, right) => left >= right)),
}, grouplikes);
const scales = Scales(grouplikes, expression_shape);
const scale_expressions = ScaleExpressions(grouplikes, scales);
const powers = Powers(grouplikes, expression_shape);
const power_triangles = PowerTriangles(grouplikes, expression_shape, orderlikes, expression_caveats);
const triangle_sameness = PowerTriangleSameness(power_triangles, grouplikes);
const triangle_composition = PowerTriangleComposition(power_triangles, grouplikes);
const triangle_inverse = PowerTriangleInverse(power_triangles, expression_shape);
const ringlikes = Ringlikes({
    add: scale_expressions,
    mul: PowerExpressions(grouplikes, powers, orderlikes, expression_caveats),
}, expression_caveats);
const paths = ExpressionPaths(grouplikes, expression_caveats);
const equations = Equations({
    grouplikes: grouplikes,
    ringlikes: ringlikes,
    orderlikes: orderlikes,
    expression_shape: expression_shape,
    expression_caveats: expression_caveats,
    invertibles: Object.freeze([
        triangle_inverse,
    ]),
    equivalences: Object.freeze([
        triangle_sameness,
        triangle_composition,
    ]),
});
const equation_path_operations = EquationPathOperations({
    expression_paths: paths,
    equations: equations,
});
const algebra = EquationDragOperations({
    expression_paths: paths,
    expression_shape: expression_shape,
    expression_caveats: expression_caveats,
    equations: equations,
    equation_path_operations: equation_path_operations,
});
const levels = Levels(grouplikes);
const history = AppHistoryTraversal(Infinity);
const equation_drags = EquationDrags(algebra);
const app_updater = AppUpdater({
    app_history_traversal: history,
    drag_ops: AppDragOperations(equation_drags, history),
    equation_drags: equation_drags,
    expression_shape: expression_shape,
});

const manual_drag_options = Object.freeze({ auto_simplify:false });
const auto_simplify_drag_options = Object.freeze({ auto_simplify:true });

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertShape(actual, expected, message) {
    const actual_shape = expression_shape.encode(actual);
    const expected_shape = expression_shape.encode(expected);
    assert(
        actual_shape === expected_shape,
        `${message}\nexpected: ${expected_shape}\nactual:   ${actual_shape}`
    );
}

function move(equation, source, target, drag_options) {
    const choices = algebra.choices(equation, source, target, drag_options);
    assert(choices.length > 0, `move should be valid: ${source} -> ${target}`);
    return choices[0].equation;
}

// -----------------------------------------------------------------------------
// Level solutions
// -----------------------------------------------------------------------------

function solveLevel1() {
    let q = levels[0].equation;
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[0].goal, 'level 1');
}

function solveLevel2() {
    let q = levels[1].equation;
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[1].goal, 'level 2');
}

function solveLevel3() {
    let q = levels[2].equation;
    q = move(q, '0/0/0', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[2].goal, 'level 3');
}

function solveLevel4() {
    let q = levels[3].equation;
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[3].goal, 'level 4');
}

function solveLevel5() {
    let q = levels[4].equation;
    q = move(q, '0/0/0', '0/0/1', manual_drag_options);
    q = move(q, '0/0/0', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[4].goal, 'level 5');
}

function solveLevel6() {
    let q = levels[5].equation;
    q = move(q, '1/0/0', '0', manual_drag_options);
    q = move(q, '0/0/0', '0/0/2', manual_drag_options);
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    q = move(q, '0/0/0', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[5].goal, 'level 6');
}

function solveLevel7() {
    let q = levels[6].equation;
    q = move(q, '0/0/0', '0/0/1', manual_drag_options);
    q = move(q, '0/0/1/0', '0/0/1/1', manual_drag_options);
    assertShape(q, levels[6].goal, 'level 7');
}

function solveLevel8() {
    let q = levels[7].equation;
    q = move(q, '0/0/0/0', '0/0/0/1', manual_drag_options);
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    q = move(q, '0/0/0', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[7].goal, 'level 8');
}

function solveLevel9() {
    let q = levels[8].equation;
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[8].goal, 'level 9');
}

function solveLevel10() {
    let q = levels[9].equation;
    q = move(q, '0/0/0/0', '0/0/0/1', manual_drag_options);
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '0', manual_drag_options);
    q = move(q, '0/0/0', '0/0/2', manual_drag_options);
    q = move(q, '0/0/1', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    q = move(q, '0/0/0', '1', manual_drag_options);
    q = move(q, '1/0/1', '1/0/0', manual_drag_options);
    assertShape(q, levels[9].goal, 'level 10');
}


function solvePowerTriangleLevels() {
    const cases = [
        [26, '0/0/0', '1'],                 // 2^x = 8 -> x = log_2(8)
        [27, '0/0/0', '1'],                 // log_2(x) = 3 -> x = 2^3
        [28, '0/0/0', '0/0/1/0'],             // 2^log_2(x) -> x
        [29, '0/0/0', '0/0/1/0'],             // log_2(2^x) -> x
        [30, '0/0/0', '0/0/1'],               // sqrt(x)sqrt(y) -> sqrt(xy)
        [31, '0/0/0', '0/0/1'],               // a^(1/x)a^(1/y) -> a^(1/x+1/y)
        [32, '0/0/0', '0/0/1'],               // log_2(x)+log_2(y) -> log_2(xy)
        [33, '0/0/0', '0/0/1'],               // log_2(xy) -> log_2(x)+log_2(y)
        [34, '0/0/1', '1'],                  // log_x(8)=3 -> x=8^(1/3)
        [35, '0/0/0', '0/0/1'],               // log_x(a)||log_y(a) -> log_(xy)(a)
        [36, '0/0/1', '0/0/0'],               // log_(xy)(a) -> log_x(a)||log_y(a)
        [37, '0/0/0', '0/0/1'],               // root_3(root_2(x)) -> root_6(x)
        [38, '0/0/1', '0/0/0'],               // root_6(x) -> root_3(root_2(x))
        [39, '0/0/1', '0/0/0'],               // root_(2*3*a)(x) -> root_(3*a)(root_2(x))
    ];

    cases.forEach(([index, source, target]) => {
        const q = move(levels[index].equation, source, target, manual_drag_options);
        assertShape(q, levels[index].goal, `level ${index+1}: ${levels[index].title}`);
    });
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
        case 'log': return `L(${orderedExpressionKey(expression.contents[0])},${orderedExpressionKey(expression.contents[1])})`;
        case 'root': return `R(${orderedExpressionKey(expression.contents[0])},${orderedExpressionKey(expression.contents[1])})`;
        case 'add': return `A(${expression.contents.map(orderedExpressionKey).join(',')})`;
        case 'mul': return `M(${expression.contents.map(orderedExpressionKey).join(',')})`;
        case 'harmonic': return `H(${expression.contents.map(orderedExpressionKey).join(',')})`;
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
        `${property}: expected move was not advertised
`+
        `${context}
source: ${source}
target: ${target}
`+
        `advertised: ${advertised.join(', ')}`
    );

    const choices = algebra.choices(equation, source, target, drag_options);
    const updated_choice = choices.find(choice =>
        orderedExpressionKey(choice.equation.left) === orderedExpressionKey(expected) &&
        orderedExpressionKey(choice.equation.right) === orderedExpressionKey(sentinel)
    );
    assert(
        updated_choice != null,
        `${property}: expected expression was not among drag choices
${context}`
    );

    const updated = updated_choice.equation;
    assertSameExpression(updated.left, expected, property, context);
    assertSameExpression(updated.right, sentinel, property, `${context}
right side changed`);
    assertExpressionsEquivalent(before, updated.left, property, `${context}
move semantics`, where);
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
        `${property}: expected balance move was not advertised
`+
        `${context}
source: ${source}
target: ${target}
`+
        `advertised: ${advertised.join(', ')}`
    );

    const expected_key = expression_shape.encode(expected);
    const updated_choice = algebra.choices(before, source, target, drag_options)
        .find(choice => expression_shape.encode(choice.equation) === expected_key);
    assert(
        updated_choice != null,
        `${property}: expected equation was not among drag choices
${context}`
    );

    const updated = updated_choice.equation;
    assertSameExpression(updated.left, expected.left, property, `${context}
left side`);
    assertSameExpression(updated.right, expected.right, property, `${context}
right side`);
    assertEquationsEquivalent(before, updated, property, `${context}
move semantics`, where);
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
// Drag choices
// Ambiguous drags remain draggable and expose every distinct valid operation.
// Lone-side drags enumerate ordinary inverse-capable grouplike operations.
// -----------------------------------------------------------------------------

function relationalExpressions() {
    const two = grouplikes.constant(2);
    const equation = new Equation(x, two);

    assert(equation instanceof Expression,
        'relations: Equation should be an Expression');
    assert(equation instanceof Relation,
        'relations: Equation should be a Relation');
    assert(
        equation.type === 'eq' &&
        equation.contents[0].type === 'side' && equation.contents[0].contents[0] === x &&
        equation.contents[1].type === 'side' && equation.contents[1].contents[0] === two,
        'relations: Equation should encode equality with unary side expressions'
    );
    assert(equation.left === x && equation.right === two,
        'relations: Equation should preserve left/right accessors');
    assert(
        paths.resolve(equation, '0') === equation.contents[0] &&
        paths.resolve(equation, '0/0') === x &&
        paths.resolve(equation, '1') === equation.contents[1] &&
        paths.resolve(equation, '1/0') === two,
        'relations: numeric paths should distinguish side nodes from their contents'
    );

    const equality = Orderlike('eq', {
        is_reflexive: true,
        is_symmetric: true,
        is_transitive: true,
        is_antisymmetric: true,
        converse: 'eq',
    });
    assert(
        equality.is_reflexive && equality.is_symmetric &&
        equality.is_transitive && equality.is_antisymmetric,
        'relations: equality should expose its relation properties'
    );

    const order = Orderlikes({
        lt: Orderlike('lt', {
            is_transitive: true,
            is_asymmetric: true,
            converse: 'gt',
        }),
        gt: Orderlike('gt', {
            is_transitive: true,
            is_asymmetric: true,
            converse: 'lt',
        }),
    }, grouplikes);
    const less_than = new Relation('lt', x, two);
    const greater_than = order.swap(less_than);
    assert(
        greater_than.type === 'gt' && greater_than.left === two && greater_than.right === x,
        'relations: swapping should use the converse relation'
    );

    const expression_choices = algebra.choices(
        equation, '0/0', '1/0', manual_drag_options
    );
    assert(
        expression_choices.every(choice => choice.type !== 'swap'),
        'relations: an expression drag should not stand in for a relation-side drag'
    );

    const side_choices = algebra.choices(
        equation, '0', '1', manual_drag_options
    );
    assert(side_choices.length === 1 && side_choices[0].type === 'swap',
        'relations: dragging one relation-side handle onto the other should advertise swap');
    assertShape(
        side_choices[0].equation,
        new Equation(two, x),
        'relations: equality swap should exchange equation sides'
    );
    assert(
        algebra.moves_for_source(equation, '0', manual_drag_options).includes('1'),
        'relations: relation-side swap should be advertised only from the side source'
    );
    assert(
        !algebra.moves_for_source(equation, '0/0', manual_drag_options).includes('1/0'),
        'relations: a lone expression should remain distinct from its containing relation side'
    );

    const released = equation_drags.release();
    let app = new AppState(
        levels,
        0,
        equation,
        released,
        released.initialize(),
        [],
        [],
        [],
        'day',
        manual_drag_options
    );
    app = app_updater.drag_start(app, '0', 0, 0);
    assert(
        Object.keys(app.drag_type).sort().join(',') === 'choices,id,initialize,move',
        'relations: side dragging should not add lifecycle behavior to drag types'
    );
    app = app_updater.drag_move(app, 10, 10, '1');
    assert(
        app.drag_type.id === DragState.symbol &&
        app.drag_choices.length === 1 &&
        app.drag_choices[0].type === 'swap' &&
        app.undo_history.length === 0,
        'relations: side swap should remain a provisional drag choice until release'
    );
    assertShape(
        app.equation,
        equation,
        'relations: provisional side swap should not mutate application equation state'
    );
    assertShape(
        app.drag_choices[0].equation,
        new Equation(two, x),
        'relations: crossing to the opposite side should expose the swapped equation for preview'
    );

    app = app_updater.drag_move(app, 0, 0, '0');
    assert(
        app.drag_choices.length === 0,
        'relations: crossing back before release should remove the provisional swap'
    );
    assertShape(
        app.equation,
        equation,
        'relations: crossing back should leave the application equation unchanged'
    );
    assert(
        app.drag_type.id === DragState.symbol && app.undo_history.length === 0,
        'relations: reversing a provisional swap should keep the drag active and history unchanged'
    );

    app = app_updater.drag_move(app, 10, 10, '1');
    app = app_updater.drag_drop(app, '1');
    assert(
        app.drag_type.id === DragState.released &&
        app.drag_choices.length === 0 &&
        app.undo_history.length === 1,
        'relations: releasing on the opposite side should commit one swap to history'
    );
    assertShape(
        app.equation,
        new Equation(two, x),
        'relations: releasing a provisional side swap should keep the swapped equation'
    );

    let cancelled = new AppState(
        levels,
        0,
        equation,
        released,
        released.initialize(),
        [],
        [],
        [],
        'day',
        manual_drag_options
    );
    cancelled = app_updater.drag_start(cancelled, '0', 0, 0);
    cancelled = app_updater.drag_move(cancelled, 10, 10, '1');
    cancelled = app_updater.drag_cancel(cancelled);
    assertShape(
        cancelled.equation,
        equation,
        'relations: cancelling a provisional side swap should restore the original equation'
    );
    assert(
        cancelled.undo_history.length === 0,
        'relations: cancelling a provisional side swap should not change history'
    );
}

function dragChoices() {
    const rhs = grouplikes.constant(2);

    for (const a of [x, grouplikes.constant(2)]) {
        const equation = new Equation(a, rhs);
        const context = `lone expression a = ${describeCase(a)}`;
        const choices = algebra.choices(equation, '0/0', '1', manual_drag_options);

        assert(
            choices.length === 2,
            `drag choices: lone expression should offer additive and multiplicative balance
${context}`
        );
        assert(
            algebra.moves_for_source(equation, '0/0', manual_drag_options).includes('1') &&
            algebra.draggable_paths(equation, manual_drag_options).includes('0/0'),
            `drag choices: ambiguous lone expression should remain draggable
${context}`
        );

        const keys = new Set(choices.map(choice => expression_shape.encode(choice.equation)));
        assert(
            keys.has(expression_shape.encode(new Equation(
                zero,
                grouplikes.add([rhs, ringlikes.inverse('add', a)])
            ))),
            `drag choices: lone expression should include additive balance
${context}`
        );
        assert(
            keys.has(expression_shape.encode(new Equation(
                one,
                grouplikes.mul([rhs, ringlikes.inverse('mul', a)])
            ))),
            `drag choices: lone expression should include multiplicative balance
${context}`
        );
        assert(choices.every(choice => choice instanceof EquationDragChoice),
            'drag choices: public choices should be EquationDragChoice values');
        assert(choices.every(choice =>
            choice.expression != null &&
            Object.prototype.hasOwnProperty.call(choice, 'operator') &&
            choice.side === '1' &&
            choice.type === 'balance'
        ), 'drag choices: choices should carry expression, operator, target side, and drag type');
    }

    const zero_equation = new Equation(zero, rhs);
    assert(
        algebra.choices(zero_equation, '0/0', '1', manual_drag_options).length === 1,
        'drag choices: zero should only admit additive lone-side balance'
    );

    // A lone reciprocal must expose multiplication so denominators can move
    // across the equality even when no Add/Multiply mode has been selected.
    const reciprocal_x = ringlikes.inverse('mul', x);
    const denominator_equation = new Equation(reciprocal_x, rhs);
    const denominator_choices = algebra.choices(
        denominator_equation,
        '0/0',
        '1',
        manual_drag_options
    );
    assert(
        denominator_choices.some(choice =>
            orderedExpressionKey(choice.equation.left) === orderedExpressionKey(one) &&
            orderedExpressionKey(choice.equation.right) ===
                orderedExpressionKey(grouplikes.mul([rhs, x]))
        ),
        'drag choices: a lone denominator should be movable multiplicatively across equality'
    );

    // Substantive algebraic operations take precedence over commutation. In
    // particular, distributing a reciprocal across a sum must not also offer
    // a visually unchanged commuted fraction.
    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const fraction_equation = new Equation(
        grouplikes.div(grouplikes.add([x, two]), three),
        rhs
    );
    const fraction_choices = algebra.choices(
        fraction_equation,
        '0/0/1',
        '0/0/0',
        manual_drag_options
    );
    assert(
        fraction_choices.length === 1 && fraction_choices[0].type === 'distribute',
        'drag choices: distribution should suppress an otherwise valid commute choice'
    );
    assertShape(
        fraction_choices[0].equation,
        new Equation(grouplikes.add([
            grouplikes.div(x, three),
            grouplikes.div(two, three),
        ]), rhs),
        'drag choices: reciprocal distribution should produce x/3 + 2/3'
    );

    // Commutation remains available for aesthetic rearrangement when no
    // substantive combine or distribute operation applies.
    const y = grouplikes.variable('y');
    const commute_only = algebra.choices(
        new Equation(grouplikes.add([x, y]), rhs),
        '0/0/0',
        '0/0/1',
        manual_drag_options
    );
    assert(
        commute_only.length === 1 && commute_only[0].type === 'commute',
        'drag choices: commute should remain available when it is the only operation'
    );

    // App state keeps multiple choices after drop, commits only when one is
    // chosen, and does not put the pending-choice state in history.
    const released = equation_drags.release();
    const original = new Equation(x, rhs);
    let app = new AppState(
        levels,
        0,
        original,
        released,
        released.initialize(),
        [],
        [],
        [],
        'day',
        manual_drag_options
    );

    app = app_updater.drag_start(app, '0/0', 0, 0);
    assert(app.drag_type.id === DragState.symbol,
        'drag choices: ambiguous lone drag should start normally');
    app = app_updater.drag_move(app, 10, 10, '1');
    assert(app.drag_choices.length === 2,
        'drag choices: movement should populate all current choices');
    const pending = app_updater.drag_drop(app, '1');
    assert(pending.drag_type.id === DragState.released && pending.drag_choices.length === 2,
        'drag choices: ambiguous drop should release the pointer and preserve choices');
    assert(pending.equation === original && pending.undo_history.length === 0,
        'drag choices: pending ambiguity must not modify equation history');

    const chosen = app_updater.drag_choose(pending, 0);
    assert(chosen.drag_choices.length === 0 && chosen.undo_history.length === 1,
        'drag choices: choosing should commit once and clear choices');

    const pending_again = app_updater.drag_drop(
        app_updater.drag_move(
            app_updater.drag_start(chosen.with({ equation:original, undo_history:[] }), '0/0', 0, 0),
            10,
            10,
            '1'
        ),
        '1'
    );
    const cancelled = app_updater.drag_cancel(pending_again);
    assert(cancelled.equation === original && cancelled.drag_choices.length === 0,
        'drag choices: cancel should clear pending choices without changing the equation');
}

// -----------------------------------------------------------------------------
// Automatic simplification
// Constant-valued grouplikes fold only after successful new drags.
// -----------------------------------------------------------------------------

function automaticSimplification() {
    const seven = grouplikes.constant(7);
    const minus_one = grouplikes.constant(-1);
    const unsimplified = grouplikes.add([seven, minus_one]);

    const manual = move(
        new Equation(grouplikes.add([x, one]), seven),
        '0/0/1',
        '1',
        manual_drag_options
    );
    assertSameExpression(
        manual.right,
        unsimplified,
        'automatic simplification',
        'disabled should preserve the arithmetic expression'
    );

    const automatic = move(
        new Equation(grouplikes.add([x, one]), seven),
        '0/0/1',
        '1',
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
        algebra.choices(invalid, '1/0', '1/0', auto_simplify_drag_options).length === 0,
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
        [],
        'day',
        auto_simplify_drag_options
    );
    app = app_updater.drag_start(app, '0/0/1', 0, 0);
    app = app_updater.drag_drop(app, '1');
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
    assert(app.equation === before_toggle.equation,
        'automatic simplification: toggling should not modify the equation');
}


function historyPresentation() {
    const released = equation_drags.release();
    const a = new Equation(x, grouplikes.constant(1));
    const b = new Equation(x, grouplikes.constant(2));
    const c = new Equation(x, grouplikes.constant(3));
    const d = new Equation(x, grouplikes.constant(4));

    let app = new AppState(
        levels,
        0,
        a,
        released,
        released.initialize(),
        [],
        [],
        [],
        'day',
        manual_drag_options
    );

    assert(app.history_visible === false,
        'history presentation: history should be hidden by default');

    app = app_updater.toggle_history(app);
    assert(app.history_visible === true,
        'history presentation: toolbar toggle should show history');

    app = history.do(app, b);
    app = history.do(app, c);
    app = history.do(app, d);
    assert(
        app.undo_history.length === 3 &&
        app.undo_history[0] === a &&
        app.undo_history[1] === b &&
        app.undo_history[2] === c,
        'history presentation: undo history should remain chronological'
    );

    app = app_updater.rollback(app, 1);
    assert(
        app.equation === b &&
        app.undo_history.length === 1 &&
        app.undo_history[0] === a,
        'history presentation: clicking an earlier equation should roll current state back to it'
    );
    assert(
        app.redo_history.length === 2 &&
        app.redo_history[0] === d &&
        app.redo_history[1] === c,
        'history presentation: rollback should preserve later states in redo order'
    );
    assert(app.history_visible === true,
        'history presentation: rollback should not change history visibility');

    app = app_updater.redo(app);
    assert(app.equation === c,
        'history presentation: redo after rollback should advance to the next transformation');
    app = app_updater.redo(app);
    assert(app.equation === d,
        'history presentation: redo after rollback should eventually restore the former current state');

    app = app_updater.toggle_history(app);
    assert(app.history_visible === false,
        'history presentation: toolbar toggle should hide history again');
}

// -----------------------------------------------------------------------------
// Caveat tracking
// Transformations preserve consumed caveats and operations may add new ones.
// -----------------------------------------------------------------------------

function caveatTracking() {
    const nonzero_x = new Relation('neq', x, zero);
    const nonzero_x_plus_one = new Relation('neq', grouplikes.add([x, one]), zero);
    const same_shape_nonzero_x = new Relation('neq', grouplikes.variable('x'), grouplikes.constant(0));
    const caveat_key = expression => expression_shape.encode(expression);
    const has_caveat = (expression, caveat) =>
        expression_caveats.all(expression).some(item => caveat_key(item) === caveat_key(caveat));

    const caveated_x = expression_caveats.add(x, [nonzero_x]);
    assert(Array.isArray(caveated_x.caveats),
        'caveats: Expression.caveats should be an array');
    assert(caveated_x.all_caveats == null && caveated_x.with_caveats == null && caveated_x.inherit_caveats == null,
        'caveats: caveat operations should not extend the Expression method interface');
    assert(has_caveat(caveated_x, nonzero_x),
        'caveats: the caveat dependency should add caveat Expressions');
    assertShape(caveated_x, x,
        'caveats: caveats should not change structural expression shape');
    assert(Object.isFrozen(caveated_x.caveats),
        'caveats: the caveat array should preserve Expression immutability');

    assert(
        expression_caveats.add(x, [zero]).caveats.length === 0,
        'caveats: a false constant caveat should not be added'
    );

    const nested = new Expression('add', Object.freeze([
        caveated_x,
        expression_caveats.add(one, [same_shape_nonzero_x]),
    ]));
    const nested_caveats = expression_caveats.all(nested);
    assert(
        nested_caveats.length === 1 && caveat_key(nested_caveats[0]) === caveat_key(nonzero_x),
        'caveats: recursive collection should index duplicate caveat Expressions by shape'
    );

    const arithmetic = grouplikes.add([
        grouplikes.constant(7),
        grouplikes.constant(-1),
    ]);
    const caveated_arithmetic = expression_caveats.add(arithmetic, [nonzero_x]);
    const simplified = grouplikes.simplify(caveated_arithmetic);
    assertSameExpression(
        simplified,
        grouplikes.constant(6),
        'caveats',
        'simplification should still produce the expected expression'
    );
    assert(has_caveat(simplified, nonzero_x),
        'caveats: simplification must preserve caveats from the expression it consumes');

    const reciprocal_x = ringlikes.inverse('mul', x);
    assert(has_caveat(reciprocal_x, nonzero_x),
        'caveats: introducing a variable reciprocal should require a nonzero divisor');

    const six = grouplikes.constant(6);
    const one_sixth = grouplikes.div(one, six);
    const nonzero_one_sixth = new Relation('neq', one_sixth, zero);
    assert(orderlikes.evaluate(nonzero_one_sixth, {}) === true,
        'caveats: orderlikes should evaluate a constant-valued nonzero relation to true');
    const reciprocal_one_sixth = ringlikes.inverse('mul', one_sixth);
    assert(expression_caveats.all(reciprocal_one_sixth).length === 0,
        'caveats: a nonzero condition that evaluates to true should not be retained');

    const zero_sum = grouplikes.add([one, grouplikes.constant(-1)]);
    const nonzero_zero_sum = new Relation('neq', zero_sum, zero);
    assert(orderlikes.evaluate(nonzero_zero_sum, {}) === false,
        'caveats: orderlikes should evaluate a constant-valued nonzero relation to false');
    assert(ringlikes.inverse('mul', zero_sum) == null,
        'caveats: an operation whose nonzero condition evaluates to false should be rejected');

    const reciprocal_sum = ringlikes.inverse('mul', grouplikes.add([x, one]));
    assert(has_caveat(reciprocal_sum, nonzero_x_plus_one),
        'caveats: reciprocal caveats should describe compound divisors');

    const raw_reciprocal_x = grouplikes.pow(x, grouplikes.constant(-1));
    const cancelled = ringlikes.combine('mul', x, raw_reciprocal_x);
    assertSameExpression(
        cancelled,
        one,
        'caveats',
        'multiplicative cancellation should still collapse x/x to one'
    );
    assert(has_caveat(cancelled, nonzero_x),
        'caveats: cancelling a reciprocal should retain the nonzero restriction even when the reciprocal disappears');

    const y = grouplikes.variable('y');
    const balanced = move(
        new Equation(grouplikes.mul([x, y]), one),
        '0/0/0',
        '1',
        manual_drag_options
    );
    assert(has_caveat(balanced, nonzero_x),
        'caveats: multiplicative balance should carry the introduced nonzero restriction on the equation');

    const two = grouplikes.constant(2);
    const positive_x = new Relation('gt', x, zero);
    const nonnegative_x = new Relation('gte', x, zero);
    const log_x = power_triangles.to_expression(new PowerTriangle(two, null, x));
    assert(has_caveat(log_x, positive_x),
        'caveats: introducing log_2(x) should require a positive logarithm input');

    const b = grouplikes.variable('b');
    const positive_b = new Relation('gt', b, zero);
    const nonunit_b = new Relation('neq', b, one);
    const log_base_b = power_triangles.to_expression(new PowerTriangle(b, null, x));
    assert(has_caveat(log_base_b, positive_b),
        'caveats: introducing log_b(x) should require a positive logarithm base');
    assert(has_caveat(log_base_b, nonunit_b),
        'caveats: introducing log_b(x) should require a logarithm base other than one');

    assert(power_triangles.to_expression(new PowerTriangle(zero, null, x)) == null,
        'caveats: introducing a logarithm with base zero should be rejected');
    assert(power_triangles.to_expression(new PowerTriangle(grouplikes.constant(-2), null, x)) == null,
        'caveats: introducing a logarithm with a negative base should be rejected');
    assert(power_triangles.to_expression(new PowerTriangle(one, null, x)) == null,
        'caveats: introducing a logarithm with base one should be rejected');

    const one_half = grouplikes.div(one, two);
    const log_half_x = power_triangles.to_expression(new PowerTriangle(one_half, null, x));
    assert(
        expression_caveats.all(log_half_x).length === 1 && has_caveat(log_half_x, positive_x),
        'caveats: a known logarithm base between zero and one should be accepted without a base caveat'
    );

    const log_eight = power_triangles.to_expression(new PowerTriangle(two, null, grouplikes.constant(8)));
    assert(expression_caveats.all(log_eight).length === 0,
        'caveats: a logarithm input known to be positive should not retain a caveat');
    assert(power_triangles.to_expression(new PowerTriangle(two, null, grouplikes.constant(-1))) == null,
        'caveats: introducing a logarithm with a known negative input should be rejected');

    const square_root_x = power_triangles.to_expression(new PowerTriangle(null, two, x));
    assert(has_caveat(square_root_x, nonnegative_x),
        'caveats: introducing a non-degenerate root should require a nonnegative radicand');

    const identity_root_x = power_triangles.to_expression(new PowerTriangle(null, one, x));
    assert(expression_caveats.all(identity_root_x).length === 0,
        'caveats: root_1(x) should not introduce a radicand restriction');

    const square_root_nine = power_triangles.to_expression(new PowerTriangle(null, two, grouplikes.constant(9)));
    assert(expression_caveats.all(square_root_nine).length === 0,
        'caveats: a root radicand known to be nonnegative should not retain a caveat');
    assert(power_triangles.to_expression(new PowerTriangle(null, two, grouplikes.constant(-1))) == null,
        'caveats: introducing a non-degenerate root with a known negative radicand should be rejected');
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
        triangle_sameness.combine('mul', six, third) == null,
        'fraction preservation: power-triangle same-base combination should remain limited to matching bases'
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
        'Ringlikes: additive inverse should be recognized'
    );
    assert(
        !ringlikes.is_inverse('add', x),
        'Ringlikes: ordinary additive expression should not be inverse'
    );
    assertSameExpression(
        ringlikes.inverse('add', negative_x),
        x,
        'Ringlikes',
        'additive inverse should be involutive'
    );

    const reciprocal_x = ringlikes.inverse('mul', x);
    assert(
        ringlikes.is_inverse('mul', reciprocal_x),
        'Ringlikes: multiplicative inverse should be recognized'
    );
    assert(
        !ringlikes.is_inverse('mul', x),
        'Ringlikes: ordinary multiplicative expression should not be inverse'
    );
    assertSameExpression(
        ringlikes.inverse('mul', reciprocal_x),
        x,
        'Ringlikes',
        'multiplicative inverse should be involutive'
    );
    assert(
        ringlikes.inverse('mul', zero) == null,
        'Ringlikes: zero should not have a multiplicative inverse'
    );
    assertSameExpression(
        ringlikes.inverse('mul', one),
        one,
        'Ringlikes',
        'multiplicative identity should be its own inverse'
    );


    assertSameExpression(
        ringlikes.absolute('add', negative_x),
        x,
        'Ringlikes',
        'absolute should invert an additive inverse'
    );
    assertSameExpression(
        ringlikes.absolute('add', x),
        x,
        'Ringlikes',
        'absolute should preserve a non-inverse expression'
    );
    assertSameExpression(
        ringlikes.absolute('mul', reciprocal_x),
        x,
        'Ringlikes',
        'absolute should invert a multiplicative inverse'
    );
    assertSameExpression(
        ringlikes.absolute('mul', x),
        x,
        'Ringlikes',
        'absolute should preserve an ordinary multiplicative expression'
    );

    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const x_plus_three = grouplikes.add([x, three]);
    assertSameExpression(
        ringlikes.left_distribute(
            'add',
            grouplikes.mul([two, x_plus_three]),
            two,
            x_plus_three
        ),
        grouplikes.add([
            grouplikes.mul([two, x]),
            grouplikes.mul([two, three]),
        ]),
        'Ringlikes',
        'left distribution should delegate through the additive group expression'
    );
    assertSameExpression(
        ringlikes.right_distribute(
            'add',
            grouplikes.mul([x_plus_three, two]),
            x_plus_three,
            two
        ),
        grouplikes.add([
            grouplikes.mul([x, two]),
            grouplikes.mul([three, two]),
        ]),
        'Ringlikes',
        'right distribution should delegate through the additive group expression'
    );
    assert(
        ringlikes.left_distribute('mul', grouplikes.mul([two, x_plus_three]), two, x_plus_three) == null,
        'Ringlikes: unsupported left distribution should return null'
    );
    assert(
        ringlikes.right_distribute('mul', grouplikes.mul([x_plus_three, two]), x_plus_three, two) == null,
        'Ringlikes: unsupported right distribution should return null'
    );

    const product = grouplikes.mul([x, three]);
    const square = grouplikes.pow(product, two);
    const power_distribution = equations.distribute(square, 1, 0);
    assert(
        power_distribution.length === 1,
        'power triangle: power distribution should resolve uniquely'
    );
    assertSameExpression(
        power_distribution[0],
        grouplikes.mul([
            grouplikes.pow(x, two),
            grouplikes.pow(three, two),
        ]),
        'power triangle',
        'same-exponent distribution should distribute powers over multiplication'
    );

    assertMoveTransforms(
        square,
        '0/0/1',
        '0/0/0',
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
            ringlikes.combine('add', a, b) == null
        ) {
            assertMoveTransforms(
                left,
                '0/0/0',
                '0/0/1',
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
            '0/0/0',
            '0/0/1',
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
            '0/0/0',
            `0/0/${identity_index}`,
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
        '0/0',
        '1',
        new Equation(zero, grouplikes.add([x, zero])),
        'additive identity',
        'a lone additive identity remains draggable across equality',
        variables => isDefined(x, variables),
        manual_drag_options
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
                '0/0/0',
                '0/0/1',
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
            equations.combine(left, 0, 1).length === 0 &&
            a.type !== 'add' &&
            b.type !== 'add'
        ) {
            assertMoveTransforms(
                left,
                '0/0/0',
                '0/0/1',
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
            '0/0/0',
            '0/0/1',
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
            '0/0/0',
            `0/0/${identity_index}`,
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
        '0/0',
        '1',
        new Equation(one, grouplikes.mul([x, one])),
        'multiplicative identity',
        'a lone multiplicative identity remains draggable across equality',
        variables => isDefined(x, variables),
        manual_drag_options
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
            '0/0/0',
            '0/0/1',
            a,
            'power right identity',
            `${context}\nbase is the dragged source`,
            where,
            manual_drag_options
        );
        assertMoveTransforms(
            powered,
            '0/0/1',
            '0/0/0',
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
        !algebra.moves_for_source(equation, '0/0/0', manual_drag_options).includes('0/0/1') &&
        !algebra.moves_for_source(equation, '0/0/1', manual_drag_options).includes('0/0/0'),
        'power identity: 1 is not a left identity for exponentiation'
    );
}

// -----------------------------------------------------------------------------
// Power-triangle sameness: fixed base, computed result
// a^b * a^c = a^(b+c)
// -----------------------------------------------------------------------------

function powerTriangleSameness() {
    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const two_to_x = grouplikes.pow(two, x);
    const two_cubed = grouplikes.pow(two, three);
    const combined = grouplikes.pow(two, grouplikes.add([x, three]));

    assertMoveTransforms(
        grouplikes.mul([two_to_x, two_cubed]),
        '0/0/0',
        '0/0/1',
        combined,
        'power triangle same-base combination',
        '2^x * 2^3 -> 2^(x+3)',
        variables => isDefined(x, variables),
        manual_drag_options
    );

    assertMoveTransforms(
        combined,
        '0/0/0',
        '0/0/1',
        grouplikes.mul([two_to_x, two_cubed]),
        'power triangle same-base distribution',
        'drag the fixed base across x+3',
        variables => isDefined(x, variables),
        manual_drag_options
    );

    // Numeric exponents use the same power-triangle law as symbolic exponents.
    assertMoveTransforms(
        grouplikes.mul([
            grouplikes.pow(x, grouplikes.constant(2)),
            grouplikes.pow(x, three),
        ]),
        '0/0/0',
        '0/0/1',
        grouplikes.pow(x, grouplikes.add([
            grouplikes.constant(2),
            three,
        ])),
        'power triangle numeric exponent combination',
        'numeric exponents use the same-base triangle law',
        variables => isDefined(x, variables),
        manual_drag_options
    );

    const three_to_x = grouplikes.pow(three, x);
    const product_base = grouplikes.mul([two, three]);
    const product_to_x = grouplikes.pow(product_base, x);

    assertMoveTransforms(
        grouplikes.mul([two_to_x, three_to_x]),
        '0/0/0',
        '0/0/1',
        product_to_x,
        'power triangle same-exponent combination',
        '2^x * 3^x -> (2*3)^x',
        variables => isDefined(x, variables),
        manual_drag_options
    );

    assertMoveTransforms(
        product_to_x,
        '0/0/1',
        '0/0/0',
        grouplikes.mul([two_to_x, three_to_x]),
        'power triangle same-exponent distribution',
        'drag the fixed exponent across 2*3',
        variables => isDefined(x, variables),
        manual_drag_options
    );

    assert(
        triangle_sameness.combine('mul', x, grouplikes.variable('y')) == null,
        'same-exponent combination should not manufacture a power-of-one interpretation for ordinary factors'
    );

    const log_two_x = grouplikes.log(two, x);
    const log_two_three = grouplikes.log(two, three);
    const log_two_product = grouplikes.log(two, grouplikes.mul([x, three]));

    assertMoveTransforms(
        grouplikes.add([log_two_x, log_two_three]),
        '0/0/0',
        '0/0/1',
        log_two_product,
        'power triangle mirrored same-base combination',
        'log_2(x) + log_2(3) -> log_2(3x)',
        variables => variables.x > 0,
        manual_drag_options
    );

    assertMoveTransforms(
        log_two_product,
        '0/0/0',
        '0/0/1',
        grouplikes.add([log_two_x, log_two_three]),
        'power triangle mirrored same-base distribution',
        'drag fixed base 2 across x*3',
        variables => variables.x > 0,
        manual_drag_options
    );

    const log_three_x = grouplikes.log(three, x);
    const harmonic_logs = grouplikes.harmonic([log_two_x, log_three_x]);
    const log_six_x = grouplikes.log(grouplikes.mul([two, three]), x);

    assertMoveTransforms(
        harmonic_logs,
        '0/0/0',
        '0/0/1',
        log_six_x,
        'power triangle same-result logarithm combination',
        'log_2(x) || log_3(x) -> log_6(x)',
        variables => variables.x > 0,
        manual_drag_options
    );

    assertMoveTransforms(
        log_six_x,
        '0/0/1',
        '0/0/0',
        harmonic_logs,
        'power triangle same-result logarithm distribution',
        'drag fixed result x across base 2*3',
        variables => variables.x > 0,
        manual_drag_options
    );

    const harmonic_desugared = ringlikes.inverse('mul', grouplikes.add([
        ringlikes.inverse('mul', log_two_x),
        ringlikes.inverse('mul', log_three_x),
    ]));
    assertExpressionsEquivalent(
        harmonic_logs,
        harmonic_desugared,
        'harmonic addition representation',
        'first-class harmonic addition must equal (1/u + 1/v)^-1',
        variables => variables.x > 0
    );

    const h2 = grouplikes.constant(2);
    const h3 = grouplikes.constant(3);
    const h5 = grouplikes.constant(5);
    assertExpressionsEquivalent(
        grouplikes.harmonic([h2, grouplikes.harmonic([h3, h5])]),
        grouplikes.harmonic([grouplikes.harmonic([h2, h3]), h5]),
        'harmonic associativity',
        'harmonic addition is associative'
    );
    assertExpressionsEquivalent(
        grouplikes.harmonic([h2, h3]),
        grouplikes.harmonic([h3, h2]),
        'harmonic commutativity',
        'harmonic addition is commutative'
    );

    const duplicate_log_sum = grouplikes.add([log_two_x, log_two_x]);
    const duplicate_log_equation = new Equation(duplicate_log_sum, zero);
    const duplicate_log_choices = algebra.choices(
        duplicate_log_equation,
        '0/0/0',
        '0/0/1',
        manual_drag_options
    );
    assert(
        duplicate_log_choices.length > 1,
        'log_a(x)+log_a(x) should expose both valid interpretations when laws disagree'
    );

    const squared = grouplikes.pow(x, grouplikes.constant(2));
    const ambiguous_product = grouplikes.mul([squared, squared]);
    const ambiguous_equation = new Equation(ambiguous_product, zero);
    const ambiguous_choices = algebra.choices(
        ambiguous_equation, '0/0/0', '0/0/1', manual_drag_options
    );
    assert(
        ambiguous_choices.length > 1,
        'a^c * a^c should expose same-base and same-exponent combinations as choices'
    );
    assert(
        ambiguous_choices.every(choice => choice.side === '0' && choice.type === 'combine'),
        'ambiguous power choices should retain their target side and combine type'
    );
}

// -----------------------------------------------------------------------------
// Power-triangle composition: fixed base, computed result
// (a^b)^c = a^(bc)
// -----------------------------------------------------------------------------

function powerTriangleComposition() {
    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const reciprocal_x = ringlikes.inverse('mul', x);

    const nested = grouplikes.pow(grouplikes.pow(x, two), three);
    const combined = grouplikes.pow(x, grouplikes.mul([two, three]));

    assertMoveTransforms(
        nested,
        '0/0/0',
        '0/0/1',
        combined,
        'power triangle composition combination',
        '(x^2)^3 -> x^(2*3)',
        variables => isDefined(x, variables),
        manual_drag_options
    );

    assertMoveTransforms(
        combined,
        '0/0/0',
        '0/0/1',
        nested,
        'power triangle composition distribution',
        'drag x across 2*3 -> (x^2)^3',
        variables => isDefined(x, variables),
        manual_drag_options
    );

    const three_factor_exponent = grouplikes.mul([two, three, x]);
    const three_factor_power = grouplikes.pow(grouplikes.constant(5), three_factor_exponent);
    const three_factor_nested = grouplikes.pow(
        grouplikes.pow(grouplikes.constant(5), two),
        grouplikes.mul([three, x])
    );

    assertMoveTransforms(
        three_factor_power,
        '0/0/0',
        '0/0/1',
        three_factor_nested,
        'power triangle n-ary composition distribution',
        '5^(2*3*x) -> (5^2)^(3*x)',
        variables => isDefined(x, variables),
        manual_drag_options
    );

    // Composition exposes the exponent product; a subsequent inverse-factor
    // combination can then reduce b*(1/b).
    const inverse_nested = grouplikes.pow(grouplikes.pow(two, x), reciprocal_x);
    const inverse_composed = grouplikes.pow(two, grouplikes.mul([x, reciprocal_x]));
    assertMoveTransforms(
        inverse_nested,
        '0/0/0',
        '0/0/1',
        inverse_composed,
        'power triangle inverse-exponent composition',
        '(2^x)^(1/x) -> 2^(x*(1/x))',
        variables => isDefinedNonzero(x, variables),
        manual_drag_options
    );

    const inverse_equation = new Equation(inverse_composed, grouplikes.constant(17));
    const reduced = move(
        inverse_equation,
        '0/0/1/0',
        '0/0/1/1',
        auto_simplify_drag_options
    );
    assert(
        reduced !== inverse_equation &&
        orderedExpressionKey(reduced.left) === orderedExpressionKey(two),
        '(2^x)^(1/x) should reduce to 2 after composition and inverse-factor combination'
    );

    const nested_root = grouplikes.root(three, grouplikes.root(two, x));
    const combined_root = grouplikes.root(grouplikes.mul([two, three]), x);

    assertMoveTransforms(
        nested_root,
        '0/0/0',
        '0/0/1',
        combined_root,
        'power triangle root composition combination',
        'root_3(root_2(x)) -> root_(2*3)(x)',
        variables => variables.x > 0,
        manual_drag_options
    );

    assertMoveTransforms(
        combined_root,
        '0/0/1',
        '0/0/0',
        nested_root,
        'power triangle root composition distribution',
        'root_(2*3)(x) -> root_3(root_2(x))',
        variables => variables.x > 0,
        manual_drag_options
    );

    // Logarithm scalar identities are not projection self-composition and no
    // longer belong to this family.
    const log_two_x = grouplikes.log(two, x);
    const scaled_log = grouplikes.mul([three, log_two_x]);
    assert(
        equations.combine(scaled_log, 0, 1).length === 0,
        '3*log_2(x) should no longer combine through PowerTriangleComposition'
    );

    const powered_log = grouplikes.log(two, grouplikes.pow(x, three));
    assert(
        equations.distribute(powered_log, 0, 1).length === 0,
        'log_2(x^3) should no longer distribute through PowerTriangleComposition'
    );
}

// -----------------------------------------------------------------------------
// Power-triangle inverse: fixed exponent, computed result
// x^a = b  <->  x = b^(1/a)
// -----------------------------------------------------------------------------


function powerTriangleRootBalance() {
    const two = grouplikes.constant(2);
    const nine = grouplikes.constant(9);
    const squared = grouplikes.pow(x, two);
    const equation = new Equation(squared, nine);
    const expected_root = grouplikes.root(two, nine);

    const advertised = algebra.moves_for_source(equation, '0/0/1', manual_drag_options);
    assert(
        advertised.includes('1'),
        'x^2 = 9 should advertise dragging the exponent across the equality'
    );

    const solved = move(equation, '0/0/1', '1', manual_drag_options);
    assert(
        solved !== equation,
        'x^2 = 9 should be changed by the root balance drag'
    );
    assertSameExpression(
        solved.left,
        x,
        'power triangle root balance',
        'cancel the fixed exponent from x^2'
    );
    assertSameExpression(
        solved.right,
        expected_root,
        'power triangle root balance',
        'append the inverse exponent to the result'
    );
    assertExpressionsEquivalent(
        solved.right,
        grouplikes.constant(3),
        'power triangle root balance',
        '9^(1/2) = 3'
    );
    stats.moves++;

    const solved_auto = move(
        equation,
        '0/0/1',
        '1',
        auto_simplify_drag_options
    );
    assertSameExpression(
        solved_auto.right,
        grouplikes.constant(3),
        'power triangle root balance auto simplify',
        'x^2 = 9 -> x = 3'
    );
}


// -----------------------------------------------------------------------------
// First-class root projection completes the power triangle.
// The existing sameness and inverse implementations should work unchanged for
// computed=base once root(exponent, result) can be mapped to triangle vertices.
// -----------------------------------------------------------------------------

function powerTriangleRootProjection() {
    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const eight = grouplikes.constant(8);
    const nine = grouplikes.constant(9);

    const power_view = power_triangles.from_expression(grouplikes.pow(two, x), false);
    const log_view = power_triangles.from_expression(grouplikes.log(two, x), false);
    const root_view = power_triangles.from_expression(grouplikes.root(two, x), false);
    assert(
        power_view[0] === two && power_view[1] === x && power_view[2] == null,
        'pow triangle view should leave only the result coordinate nullish'
    );
    assert(
        log_view[0] === two && log_view[1] == null && log_view[2] === x,
        'log triangle view should leave only the exponent coordinate nullish'
    );
    assert(
        root_view[0] == null && root_view[1] === two && root_view[2] === x,
        'root triangle view should leave only the base coordinate nullish'
    );
    assert(
        !('computed' in power_view) && !('computed' in log_view) && !('computed' in root_view),
        'PowerTriangle should not store a redundant computed attribute'
    );
    assert(
        power_triangles.from_expression(x, true)[2] == null &&
        power_triangles.from_expression(x, true)[0] === x,
        'promotion should interpret an ordinary expression as a result projection x=x^1'
    );

    const square_root_x = grouplikes.root(two, x);
    assert(
        power_triangles.computed(root_view) === 0 &&
        power_triangles.inputs(root_view)[0] === 1 &&
        power_triangles.inputs(root_view)[1] === 2,
        'root should be the base projection with exponent/result children'
    );
    assertSameExpression(
        power_triangles.to_expression(new PowerTriangle(null, two, x)),
        square_root_x,
        'power triangle base projection conversion',
        'to_expression(PowerTriangle(null, exponent, result)) should construct a root expression'
    );
    assert(
        approximatelyEqual(grouplikes.evaluate(grouplikes.root(two, nine), {}), 3),
        'root_2(9) should evaluate to 3'
    );

    // Same exponent: root_n(x) root_n(y) <-> root_n(xy).
    const square_root_nine = grouplikes.root(two, nine);
    const root_product = grouplikes.root(two, grouplikes.mul([x, nine]));
    assertMoveTransforms(
        grouplikes.mul([square_root_x, square_root_nine]),
        '0/0/0',
        '0/0/1',
        root_product,
        'power triangle root same-exponent combination',
        'root_2(x) root_2(9) -> root_2(9x)',
        variables => variables.x > 0,
        manual_drag_options
    );
    assertMoveTransforms(
        root_product,
        '0/0/0',
        '0/0/1',
        grouplikes.mul([square_root_x, square_root_nine]),
        'power triangle root same-exponent distribution',
        'drag fixed exponent 2 across 9x',
        variables => variables.x > 0,
        manual_drag_options
    );

    // Same result: root_x(a) root_y(a) <-> root_(x||y)(a).
    const square_root_x_result = grouplikes.root(two, x);
    const cube_root_x_result = grouplikes.root(three, x);
    const harmonic_index = grouplikes.harmonic([two, three]);
    const combined_same_result_root = grouplikes.root(harmonic_index, x);
    assertMoveTransforms(
        grouplikes.mul([square_root_x_result, cube_root_x_result]),
        '0/0/0',
        '0/0/1',
        combined_same_result_root,
        'power triangle root same-result combination',
        'root_2(x) root_3(x) -> root_(2||3)(x)',
        variables => variables.x > 0,
        manual_drag_options
    );
    assertMoveTransforms(
        combined_same_result_root,
        '0/0/1',
        '0/0/0',
        grouplikes.mul([square_root_x_result, cube_root_x_result]),
        'power triangle root same-result distribution',
        'drag fixed result x across harmonic root index',
        variables => variables.x > 0,
        manual_drag_options
    );

    // The two root-side inverse laws also become ordinary registrations.

    const root_equation = new Equation(grouplikes.root(two, x), three);
    assertEquationMoveTransforms(
        root_equation,
        '0/0/0',
        '1',
        new Equation(x, grouplikes.pow(three, two)),
        'power triangle root fixed-exponent inverse balance',
        'root_2(x) = 3 -> x = 3^2',
        variables => variables.x > 0,
        manual_drag_options
    );

    const variable_index_root = new Equation(grouplikes.root(x, eight), two);
    assertEquationMoveTransforms(
        variable_index_root,
        '0/0/1',
        '1',
        new Equation(x, grouplikes.log(two, eight)),
        'power triangle root fixed-result inverse balance',
        'root_x(8) = 2 -> x = log_2(8)',
        variables => variables.x > 0,
        manual_drag_options
    );

    // Fixed exponent inverse/co-inverse.
    assertMoveTransforms(
        grouplikes.pow(grouplikes.root(two, x), two),
        '0/0/1',
        '0/0/0/0',
        x,
        'power triangle power-root cancellation',
        '(root_2(x))^2 -> x',
        variables => variables.x > 0,
        manual_drag_options
    );
    assertMoveTransforms(
        grouplikes.root(two, grouplikes.pow(x, two)),
        '0/0/0',
        '0/0/1/1',
        x,
        'power triangle root-power cancellation',
        'root_2(x^2) -> x under positive-real assumptions',
        variables => variables.x > 0,
        manual_drag_options
    );

    // Fixed result inverse/co-inverse.
    assertMoveTransforms(
        grouplikes.log(grouplikes.root(x, eight), eight),
        '0/0/1',
        '0/0/0/1',
        x,
        'power triangle log-root cancellation',
        'log_(root_x(8))(8) -> x',
        variables => variables.x > 0,
        manual_drag_options
    );
    assertMoveTransforms(
        grouplikes.root(grouplikes.log(x, eight), eight),
        '0/0/1',
        '0/0/0/1',
        x,
        'power triangle root-log cancellation',
        'root_(log_x(8))(8) -> x',
        variables => variables.x > 0 && variables.x !== 1,
        manual_drag_options
    );
}


// -----------------------------------------------------------------------------
// Power-triangle inverse: fixed base, result/exponent projections
// a^log_a(b) = b and log_a(a^b) = b
// -----------------------------------------------------------------------------

function powerTriangleLogInverse() {
    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const eight = grouplikes.constant(8);

    assert(
        power_triangles.computed(
            power_triangles.from_expression(grouplikes.log(two, x), false)
        ) === 1,
        'log should be the exponent projection of a power triangle'
    );
    assert(
        approximatelyEqual(grouplikes.evaluate(grouplikes.log(two, eight), {}), 3),
        'log_2(8) should evaluate to 3'
    );

    const exponential_equation = new Equation(grouplikes.pow(two, x), eight);
    const logarithmic_solution = new Equation(x, grouplikes.log(two, eight));
    assertEquationMoveTransforms(
        exponential_equation,
        '0/0/0',
        '1',
        logarithmic_solution,
        'power triangle fixed-base inverse balance',
        '2^x = 8 -> x = log_2(8)',
        () => true,
        manual_drag_options
    );

    const logarithmic_equation = new Equation(grouplikes.log(two, eight), x);
    const exponential_solution = new Equation(eight, grouplikes.pow(two, x));
    assertEquationMoveTransforms(
        logarithmic_equation,
        '0/0/0',
        '1',
        exponential_solution,
        'power triangle mirrored fixed-base inverse balance',
        'log_2(8) = x -> 8 = 2^x',
        () => true,
        manual_drag_options
    );

    const auto_solved = move(
        exponential_equation,
        '0/0/0',
        '1',
        auto_simplify_drag_options
    );
    assertSameExpression(
        auto_solved.right,
        three,
        'power triangle log balance auto simplify',
        '2^x = 8 -> x = 3'
    );

    const power_of_log = grouplikes.pow(two, grouplikes.log(two, x));
    const strip_choices = equation_path_operations.strip(
        new Equation(power_of_log, zero), '0/0/0', '0/0/1/0'
    );
    assert(
        strip_choices.length > 0,
        'EquationPathOperations.strip should expose nested inverse cancellation'
    );
    assertSameExpression(
        strip_choices[0].equation.left,
        x,
        'EquationPathOperations.strip',
        '2^log_2(x) -> x'
    );

    assertMoveTransforms(
        power_of_log,
        '0/0/0',
        '0/0/1/0',
        x,
        'power triangle nested inverse cancellation',
        '2^log_2(x) -> x',
        variables => variables.x > 0,
        manual_drag_options
    );

    assertMoveTransforms(
        power_of_log,
        '0/0/1/0',
        '0/0/0',
        x,
        'power triangle nested inverse cancellation',
        '2^log_2(x) -> x with the inner fixed base dragged outward',
        variables => variables.x > 0,
        manual_drag_options
    );

    const log_of_power = grouplikes.log(two, grouplikes.pow(two, x));
    assertMoveTransforms(
        log_of_power,
        '0/0/0',
        '0/0/1/0',
        x,
        'power triangle mirrored nested inverse cancellation',
        'log_2(2^x) -> x',
        () => true,
        manual_drag_options
    );

    const variable_base_log = new Equation(grouplikes.log(x, eight), three);
    const expected_base = grouplikes.root(three, eight);
    const solved_base = move(
        variable_base_log, '0/0/1', '1', manual_drag_options
    );
    assert(
        solved_base !== variable_base_log,
        'log_x(8) = 3 should solve for the base by dragging the fixed result'
    );
    assertSameExpression(
        solved_base.left,
        x,
        'power triangle fixed-result inverse balance',
        'cancel the fixed result from log_x(8)'
    );
    assertSameExpression(
        solved_base.right,
        expected_base,
        'power triangle fixed-result inverse balance',
        'append the base projection 8^(1/3)'
    );

    const mismatched = grouplikes.pow(two, grouplikes.log(three, x));
    const mismatched_equation = new Equation(mismatched, grouplikes.constant(17));
    assert(
        algebra.choices(
            mismatched_equation,
            '0/0/0',
            '0/0/1/0',
            manual_drag_options
        ).length === 0,
        'nested inverse cancellation should require the fixed bases to match'
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
        // represented as two direct sibling factors and the complete combine
        // resolver identifies their product uniquely as one.
        const combination = equations.combine(product, 0, 1);
        if (
            combination.some(expression => orderedExpressionKey(expression) === orderedExpressionKey(one)) &&
            product.type === 'mul' &&
            product.contents.length === 2 &&
            product.contents[0] === a &&
            product.contents[1] === reciprocal_a
        ) {
            assertMoveTransforms(
                product,
                '0/0/0',
                '0/0/1',
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
                '0/0/0',
                '1',
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
                '0/0/1',
                '1',
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
            ringlikes.combine('mul', a, sum) != null
        ) continue;
        const left_expanded = grouplikes.add(
            ringlikes.left_distribute('add', grouplikes.mul([a, sum]), a, sum).contents
        );
        const right_expanded = grouplikes.add(
            ringlikes.right_distribute('add', grouplikes.mul([sum, a]), sum, a).contents
        );
        const context = `a = ${describeCase(a)}\nb = ${describeCase(b)}\nc = ${describeCase(c)}`;

        assertMoveTransforms(
            grouplikes.mul([a, sum]),
            '0/0/0',
            '0/0/1',
            left_expanded,
            'left distributivity',
            context,
            where,
            manual_drag_options
        );

        assertMoveTransforms(
            grouplikes.mul([sum, a]),
            '0/0/1',
            '0/0/0',
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
    solvePowerTriangleLevels,
].forEach(test => test());

[
    relationalExpressions,
    dragChoices,
    automaticSimplification,
    historyPresentation,
    caveatTracking,
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
    powerTriangleSameness,
    powerTriangleComposition,
    powerTriangleRootBalance,
    powerTriangleRootProjection,
    powerTriangleLogInverse,
    multiplicativeInverse,
    doubleReciprocal,
    inverseOfProduct,
    multiplicativeCancellation,
    divisionDefinition,
    multiplicativeBalance,
    distributivity,
].forEach(test => test());

console.log(
    `ok - 24 level solutions; `+
    `${stats.semantic_cases} property cases; `+
    `${stats.evaluations} evaluations; `+
    `${stats.domain_skips} domain exclusions; `+
    `${stats.moves} advertised property moves`
);