'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
[
    'scripts/typecheck.js',
    'scripts/models/expression/Expression.js',
    'scripts/models/expression/ExpressionShape.js',
    'scripts/models/expression/ExpressionCaveats.js',
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
    'scripts/models/relation/RelationDragChoice.js',
    'scripts/models/expression/ExpressionPaths.js',
    'scripts/models/relation/Relations.js',
    'scripts/models/relation/RelationPathOperations.js',
    'scripts/models/relation/RelationDragOperations.js',
    'scripts/models/app/AppState.js',
    'scripts/models/app/AppHistoryTraversal.js',
    'scripts/models/app/AppDragOperations.js',
    'scripts/updaters/drags/DragState.js',
    'scripts/updaters/drags/RelationDrags.js',
    'scripts/updaters/AppUpdater.js',
    'scripts/levels/Levels.js',
].forEach(file => {
    vm.runInThisContext(
        fs.readFileSync(path.join(root, file), 'utf8'),
        { filename:file }
    );
});

const division_constant = value => new Expression('constant', value);
const division_append = (type, expression, divisor, inverse) => {
    if (expression.type !== type || expression === divisor) {
        return new Expression(type, Object.freeze([expression, inverse]));
    }
    const contents = [...expression.contents];
    const index = contents.indexOf(divisor);
    contents.splice(index < 0? contents.length : index + 1, 0, inverse);
    return new Expression(type, Object.freeze(contents));
};
const additive_inverse = expression => new Expression(
    'mul',
    Object.freeze(
        expression.type === 'mul'?
            [division_constant(-1), ...expression.contents]
          : [division_constant(-1), expression]
    )
);
const multiplicative_inverse = expression => {
    if (
        expression.type === 'pow' && expression.contents.length === 2 &&
        expression.contents[1].type === 'constant' && expression.contents[1].contents === -1
    ) return expression.contents[0];
    return new Expression(
        'pow',
        Object.freeze([expression, division_constant(-1)])
    ).caveat(new Relation('neq', expression, division_constant(0)));
};
const divide_by_inverse = (type, inverse) => divisor => expression =>
    division_append(type, expression, divisor, inverse(divisor));
const additive_divide = divide_by_inverse('add', additive_inverse);
const multiplicative_divide = divide_by_inverse('mul', multiplicative_inverse);

const grouplikes = Grouplikes({
    'add': Grouplike(
        'add',
        {
            is_commutative: true,
            is_associative: true,
            right_divide: additive_divide,
            left_divide: additive_divide,
            left_identity: new Expression('constant', 0),
            right_identity: new Expression('constant', 0),
        },
        items => items.reduce((accumulator, item) => accumulator + item, 0)
    ),
    'mul': Grouplike(
        'mul',
        {
            is_commutative: true,
            is_associative: true,
            right_divide: multiplicative_divide,
            left_divide: multiplicative_divide,
            left_identity: new Expression('constant', 1),
            right_identity: new Expression('constant', 1),
            left_annihilator: new Expression('constant', 0),
            right_annihilator: new Expression('constant', 0),
        },
        items => items.reduce((accumulator, item) => accumulator * item, 1)
    ),
    'pow': Grouplike(
        'pow',
        { right_identity:new Expression('constant', 1) },
        items => Math.pow(...items)
    ),
    'log': Grouplike('log', {}, items => Math.log(items[1]) / Math.log(items[0])),
    'root': Grouplike('root', {}, items => Math.pow(items[1], 1 / items[0])),
    'harmonic': Grouplike(
        'harmonic',
        { is_commutative:true, is_associative:true },
        items => 1 / items.reduce((sum, item) => sum + 1 / item, 0)
    ),
});
const expression_shape = ExpressionShape(grouplikes);
const orderlikes = Orderlikes({
    eq: Orderlike('eq', {
        is_reflexive: true,
        is_symmetric: true,
        is_transitive: true,
        is_antisymmetric: true,
        converse: 'eq',
    }, (left, right) => left === right),
    neq: Orderlike('neq', {
        is_symmetric: true,
        converse: 'neq',
    }, (left, right) => left !== right),
    lt: Orderlike('lt', {
        is_transitive: true,
        is_asymmetric: true,
        converse: 'gt',
    }, (left, right) => left < right),
    lte: Orderlike('lte', {
        is_reflexive: true,
        is_transitive: true,
        is_antisymmetric: true,
        converse: 'gte',
    }, (left, right) => left <= right),
    gt: Orderlike('gt', {
        is_transitive: true,
        is_asymmetric: true,
        converse: 'lt',
    }, (left, right) => left > right),
    gte: Orderlike('gte', {
        is_reflexive: true,
        is_transitive: true,
        is_antisymmetric: true,
        converse: 'lte',
    }, (left, right) => left >= right),
}, grouplikes);
const expression_caveats = ExpressionCaveats(expression_shape, orderlikes);
const scales = Scales(grouplikes, expression_shape);
const scale_expressions = ScaleExpressions(grouplikes, scales);
const powers = Powers(grouplikes, expression_shape);
const power_triangles = PowerTriangles(grouplikes, expression_shape);
const triangle_sameness = PowerTriangleSameness(power_triangles, grouplikes);
const triangle_composition = PowerTriangleComposition(power_triangles, grouplikes);
const triangle_inverse = PowerTriangleInverse(power_triangles, expression_shape);
const ringlikes = Ringlikes({
    add: scale_expressions,
    mul: PowerExpressions(grouplikes, powers),
});
const paths = ExpressionPaths(grouplikes);
const equations = Relations({
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
const equation_path_operations = RelationPathOperations({
    expression_paths: paths,
    equations: equations,
});
const algebra = RelationDragOperations({
    expression_paths: paths,
    expression_shape: expression_shape,
    equations: equations,
    equation_path_operations: equation_path_operations,
});
const levels = Levels(grouplikes);
const history = AppHistoryTraversal(Infinity);
const equation_drags = RelationDrags(algebra);
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
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    assertShape(q, levels[0].goal, 'level 1');
}

function solveLevel2() {
    let q = levels[1].equation;
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    assertShape(q, levels[1].goal, 'level 2');
}

function solveLevel3() {
    let q = levels[2].equation;
    q = move(q, '0/0/0', '1', auto_simplify_drag_options);
    assertShape(q, levels[2].goal, 'level 3');
}

function solveLevel4() {
    let q = levels[3].equation;
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    assertShape(q, levels[3].goal, 'level 4');
}

function solveLevel5() {
    let q = levels[4].equation;
    q = move(q, '0/0/0', '0/0/1', manual_drag_options);
    q = move(q, '0/0/0', '1', auto_simplify_drag_options);
    assertShape(q, levels[4].goal, 'level 5');
}

function solveLevel6() {
    let q = levels[5].equation;
    q = move(q, '1/0/0', '0', auto_simplify_drag_options);
    q = move(q, '0/0/0', '0/0/2', manual_drag_options);
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    q = move(q, '0/0/0', '1', auto_simplify_drag_options);
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
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    q = move(q, '0/0/0', '1', auto_simplify_drag_options);
    assertShape(q, levels[7].goal, 'level 8');
}

function solveLevel9() {
    let q = levels[8].equation;
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    assertShape(q, levels[8].goal, 'level 9');
}

function solveLevel10() {
    let q = levels[9].equation;
    q = move(q, '0/0/0/0', '0/0/0/1', manual_drag_options);
    q = move(q, '0/0/2', '1', auto_simplify_drag_options);
    q = move(q, '1/0/1', '0', auto_simplify_drag_options);
    q = move(q, '0/0/0', '0/0/2', manual_drag_options);
    q = move(q, '0/0/1', '1', auto_simplify_drag_options);
    q = move(q, '0/0/0', '1', auto_simplify_drag_options);
    assertShape(q, levels[9].goal, 'level 10');
}


function solvePowerTriangleLevels() {
    const cases = [
        [26, [['0/0/0', '1'], ['0/0/0', '0/0/1/0']]], // 2^x = 8 -> x = log_2(8)
        [27, [['0/0/0', '1'], ['0/0/0', '0/0/1/0']]], // log_2(x) = 3 -> x = 2^3
        [28, [['0/0/0', '0/0/1/0']]],                 // 2^log_2(x) -> x
        [29, [['0/0/0', '0/0/1/0']]],                 // log_2(2^x) -> x
        [30, [['0/0/0', '0/0/1']]],                   // sqrt(x)sqrt(y) -> sqrt(xy)
        [31, [['0/0/0', '0/0/1']]],                   // a^(1/x)a^(1/y) -> a^(1/x+1/y)
        [32, [['0/0/0', '0/0/1']]],                   // log_2(x)+log_2(y) -> log_2(xy)
        [33, [['0/0/0', '0/0/1']]],                   // log_2(xy) -> log_2(x)+log_2(y)
        [34, [['0/0/1', '1'], ['0/0/1', '0/0/0/1']]], // log_x(8)=3 -> x=8^(1/3)
        [35, [['0/0/0', '0/0/1']]],                   // log_x(a)||log_y(a) -> log_(xy)(a)
        [36, [['0/0/1', '0/0/0']]],                   // log_(xy)(a) -> log_x(a)||log_y(a)
        [37, [['0/0/0', '0/0/1']]],                   // root_3(root_2(x)) -> root_6(x)
        [38, [['0/0/1', '0/0/0']]],                   // root_6(x) -> root_3(root_2(x))
        [39, [['0/0/1', '0/0/0']]],                   // root_(2*3*a)(x) -> root_(3*a)(root_2(x))
    ];

    cases.forEach(([index, moves]) => {
        let q = levels[index].equation;
        moves.forEach(([source, target]) => {
            q = move(q, source, target, manual_drag_options);
        });
        assertShape(q, levels[index].goal, `level ${index+1}: ${levels[index].title}`);
    });
}

// -----------------------------------------------------------------------------
// Course organization
// Courses are view groupings over the flat level array. Navigation remains
// entirely level-index based, including transitions across course boundaries.
// -----------------------------------------------------------------------------

function courseOrganization() {
    const expected = [
        ['Arithmetic', 0, 9],
        ['Exponents', 10, 20],
        ['Roots', 21, 26],
        ['Logarithms', 27, 39],
    ];

    assert(levels.length === 40, 'courses: grouping must not change the lesson count');
    assert(courses.length === expected.length, 'courses: expected four course ranges');

    courses.forEach((course, index) => {
        const [title, first, last] = expected[index];
        assert(course instanceof Course, `courses: ${title} should be a Course`);
        assert(
            course.title === title &&
            course.first_level_index === first &&
            course.last_level_index === last,
            `courses: ${title} should span lessons ${first + 1}-${last + 1}`
        );
    });

    const covered = courses.flatMap(course =>
        Array.from(
            { length:course.last_level_index - course.first_level_index + 1 },
            (_, offset) => course.first_level_index + offset
        )
    );
    assert(
        covered.join(',') === Array.from({ length:levels.length }, (_, index) => index).join(','),
        'courses: ranges should cover every lesson exactly once and in order'
    );

    const released = equation_drags.release();
    const app_at = index => new AppState(
        levels,
        index,
        levels[index].equation,
        released,
        released.initialize(),
        [],
        [],
        [],
        'day',
        manual_drag_options,
        false,
        courses
    );

    [9, 20, 26].forEach(index => {
        const next = app_updater.next_level(app_at(index));
        assert(
            next.level_index === index + 1,
            `courses: Next should cross boundary after lesson ${index + 1}`
        );
        const previous = app_updater.last_level(next);
        assert(
            previous.level_index === index,
            `courses: Previous should cross boundary before lesson ${index + 2}`
        );
    });

    assert(
        app_at(0).courses.length === courses.length,
        'courses: course data should live in AppState'
    );

    [
        [0, 0],
        [9, 0],
        [10, 1],
        [20, 1],
        [21, 2],
        [26, 2],
        [27, 3],
        [39, 3],
    ].forEach(([level_index, course_index]) => {
        const course = courses[course_index];
        assert(
            level_index >= course.first_level_index &&
            level_index <= course.last_level_index,
            `courses: lesson ${level_index + 1} should identify ${course.title} as its open course`
        );
    });

    const app_updater_source = fs.readFileSync(
        path.join(root, 'scripts/updaters/AppUpdater.js'),
        'utf8'
    );
    assert(
        !app_updater_source.includes('dependencies.courses') &&
        !app_updater_source.includes('app.courses') &&
        !app_updater_source.includes('toggle_course') &&
        !app_updater_source.includes('open_courses'),
        'courses: AppUpdater should remain unaware of course organization'
    );

    const app_view_source = fs.readFileSync(
        path.join(root, 'scripts/views/AppView.js'),
        'utf8'
    );
    assert(
        app_view_source.includes("html.node('details'") &&
        app_view_source.includes('app.courses.map') &&
        !app_view_source.includes('dependencies.courses') &&
        app_view_source.includes("html.node('summary'") &&
        app_view_source.includes('course.first_level_index') &&
        app_view_source.includes('course.last_level_index') &&
        app_view_source.includes('app.level_index >= course.first_level_index') &&
        app_view_source.includes("'data-level-index': course.first_level_index") &&
        !app_view_source.includes('open_courses') &&
        !app_view_source.includes('toggle_course') &&
        !app_view_source.includes("level_menu.querySelectorAll('[data-course-index]')") &&
        !app_view_source.includes("level_menu.querySelector('.level-menu-item.active')"),
        'courses: AppView should derive the one open course from the current lesson and navigate headers to course starts'
    );
}

// -----------------------------------------------------------------------------
// Property-test vocabulary and cases
// -----------------------------------------------------------------------------

const x = grouplikes.variable('x');
const zero = grouplikes.constant(0);
const one = grouplikes.constant(1);

function inverseThroughGrouplikeDivision(type, source) {
    const identity = type === 'add'? zero : one;
    const structure = grouplikes.structures.find(item => item.label === type);
    const divide = structure && structure.right_divide(null, source);
    assert(typeof divide === 'function', `${type}: inverse requires right division`);
    const represented = divide(identity);
    return equations.simplify(new Relation('eq', represented, identity)).left;
}

const additive_group_inverse = source => inverseThroughGrouplikeDivision('add', source);
const multiplicative_group_inverse = source => inverseThroughGrouplikeDivision('mul', source);

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
    additive_inverse(x),
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
    multiplicative_inverse(x),
    multiplicative_inverse(
        grouplikes.add([x, grouplikes.constant(1)])
    ),
    multiplicative_inverse(
        grouplikes.add([x, grouplikes.constant(-2)])
    ),
    grouplikes.mul([
        grouplikes.constant(3),
        multiplicative_inverse(x),
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
    const equation = new Relation('eq', before, sentinel);
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
    const equation = new Relation('eq', x, two);

    assert(equation instanceof Expression,
        'relations: equality Relation should be an Expression');
    assert(equation instanceof Relation,
        'relations: equality should be a Relation');
    assert(
        equation.type === 'eq' &&
        equation.contents[0].type === 'side' && equation.contents[0].contents[0] === x &&
        equation.contents[1].type === 'side' && equation.contents[1].contents[0] === two,
        'relations: equality Relation should encode equality with unary side expressions'
    );
    assert(equation.left === x && equation.right === two,
        'relations: equality Relation should preserve left/right accessors');
    assert(
        paths.resolve(equation, '0') === equation.contents[0] &&
        paths.resolve(equation, '0/0') === x &&
        paths.resolve(equation, '1') === equation.contents[1] &&
        paths.resolve(equation, '1/0') === two,
        'relations: numeric paths should distinguish side nodes from their contents'
    );
    assert(
        paths.resolve(equation, '') === equation &&
        paths.parent('0') === '' &&
        paths.nary('', 0) === '0' &&
        paths.root('0/0') === '0' &&
        paths.is_ancestor('', '0/0'),
        'relations: the empty string should address the root expression'
    );

    const equality = Orderlike('eq', {
        is_reflexive: true,
        is_symmetric: true,
        is_transitive: true,
        is_antisymmetric: true,
        converse: 'eq',
    }, (left, right) => left === right);
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
        }, (left, right) => left < right),
        gt: Orderlike('gt', {
            is_transitive: true,
            is_asymmetric: true,
            converse: 'lt',
        }, (left, right) => left > right),
    });
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
        new Relation('eq', two, x),
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
        new Relation('eq', two, x),
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
        new Relation('eq', two, x),
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


function caveatTracking() {
    const two = grouplikes.constant(2);
    const six = grouplikes.constant(6);
    const half = grouplikes.constant(0.5);
    const b = grouplikes.variable('b');
    const nonzero_x = new Relation('neq', x, zero);
    const positive_x = new Relation('gt', x, zero);
    const nonnegative_x = new Relation('gte', x, zero);
    const positive_b = new Relation('gt', b, zero);
    const nonunit_b = new Relation('neq', b, one);
    const key = expression => expression_shape.encode(expression);
    const has = (expression, caveat) =>
        expression_caveats.gather(expression).some(item => key(item) === key(caveat));

    assert(
        Object.keys(expression_caveats).join(',') === 'gather,unique',
        'caveats: ExpressionCaveats should expose only gather and unique'
    );

    assert(
        expression_caveats.unique([nonzero_x, nonzero_x]).length === 1,
        'caveats: unique should deduplicate caveats by expression shape'
    );

    assert(orderlikes.evaluate(new Relation('neq', six, zero), {}) === true,
        'caveats: orderlike evaluator should resolve true constant relations');
    assert(orderlikes.evaluate(new Relation('neq', zero, zero), {}) === false,
        'caveats: orderlike evaluator should resolve false constant relations');
    assert(orderlikes.evaluate(nonzero_x, {}) === undefined,
        'caveats: orderlike evaluator should leave symbolic relations unresolved');

    const reciprocal_x = multiplicative_group_inverse(x);
    assert(reciprocal_x != null && has(reciprocal_x, nonzero_x),
        'caveats: introducing a reciprocal should require a nonzero denominator');
    const reciprocal_six = multiplicative_group_inverse(six);
    const accepted_reciprocal_six = expression_caveats.gather(reciprocal_six);
    assert(
        accepted_reciprocal_six != null && accepted_reciprocal_six.length === 0,
        'caveats: true constant reciprocal restrictions should be omitted when indexed'
    );
    const reciprocal_zero = multiplicative_group_inverse(zero);
    assert(reciprocal_zero != null && expression_caveats.gather(reciprocal_zero) == null,
        'caveats: false constant reciprocal restrictions should reject the transformation');

    const log_b_x = power_triangles.to_expression(new PowerTriangle(b, null, x));
    assert(
        log_b_x != null &&
        has(log_b_x, positive_x) &&
        has(log_b_x, positive_b) &&
        has(log_b_x, nonunit_b),
        'caveats: a symbolic logarithm should track argument and base restrictions'
    );
    const log_x_x = power_triangles.to_expression(new PowerTriangle(x, null, x));
    assert(log_x_x != null && expression_caveats.gather(log_x_x).length === 2,
        'caveats: caveats should be indexed uniquely by expression shape');

    const log_half_six = power_triangles.to_expression(new PowerTriangle(half, null, six));
    const accepted_log_half_six = expression_caveats.gather(log_half_six);
    assert(
        accepted_log_half_six != null && accepted_log_half_six.length === 0,
        'caveats: valid constant logarithm restrictions should be omitted when indexed'
    );
    const unit_base_log = power_triangles.to_expression(new PowerTriangle(one, null, six));
    assert(unit_base_log != null && expression_caveats.gather(unit_base_log) == null,
        'caveats: logarithm base one should reject the transformation');
    const zero_input_log = power_triangles.to_expression(new PowerTriangle(two, null, zero));
    assert(zero_input_log != null && expression_caveats.gather(zero_input_log) == null,
        'caveats: non-positive logarithm input should reject the transformation');

    const square_root_x = power_triangles.to_expression(new PowerTriangle(null, two, x));
    assert(square_root_x != null && has(square_root_x, nonnegative_x),
        'caveats: a non-degenerate symbolic root should require a nonnegative radicand');
    const identity_root_x = power_triangles.to_expression(new PowerTriangle(null, one, x));
    assert(identity_root_x != null && expression_caveats.gather(identity_root_x).length === 0,
        'caveats: the degenerate first root should add no restriction');
    const invalid_root = power_triangles.to_expression(
        new PowerTriangle(null, two, grouplikes.constant(-1))
    );
    assert(invalid_root != null && expression_caveats.gather(invalid_root) == null,
        'caveats: an invalid constant root should reject the transformation');

    const wrapped_log = grouplikes.add([log_b_x, one]);
    assert(has(wrapped_log, positive_x) && has(wrapped_log, positive_b),
        'caveats: adding structure around an existing expression should retain nested caveats naturally');

    const caveated_sum = grouplikes.add([x, two, grouplikes.constant(-1)]).with({
        caveats: Object.freeze([nonzero_x]),
    });
    const simplified = equations.simplify(new Relation('eq', caveated_sum, zero));
    assert(has(simplified, nonzero_x),
        'caveats: destructive simplification through Relations should preserve caveats');

    const caveated_pair = grouplikes.add([x, x]).with({
        caveats: Object.freeze([nonzero_x]),
    });
    const combined = equations.combine(caveated_pair, 0, 1);
    assert(combined.length > 0 && combined.every(result => has(result, nonzero_x)),
        'caveats: destructive combination through Relations should preserve caveats');

    const caveated_commutative = grouplikes.add([x, one]).with({
        caveats: Object.freeze([nonzero_x]),
    });
    const commuted = equations.commute(caveated_commutative, 0, 1);
    assert(commuted.length === 1 && has(commuted[0], nonzero_x),
        'caveats: replacement during commute should preserve parent caveats');

    const balanced = equations.balance(
        new Relation('eq', caveated_commutative, two), 0, 1, 1
    );
    assert(balanced.length > 0 && balanced.every(choice => has(choice.equation, nonzero_x)),
        'caveats: balancing should preserve caveats from the equation it rewrites');

    [
        'scripts/models/grouplike/Grouplike.js',
        'scripts/models/grouplike/Grouplikes.js',
        'scripts/models/ringlike/Ringlikes.js',
        'scripts/models/ringlike/ScaleExpressions.js',
        'scripts/models/ringlike/PowerExpressions.js',
        'scripts/models/powertriangle/PowerTriangles.js',
        'scripts/models/powertriangle/PowerTriangleInverse.js',
        'scripts/models/powertriangle/PowerTriangleSameness.js',
        'scripts/models/powertriangle/PowerTriangleComposition.js',
        'scripts/models/expression/ExpressionPaths.js',
        'scripts/models/relation/RelationDragOperations.js',
    ].forEach(file => assert(
        !fs.readFileSync(path.join(root, file), 'utf8').includes('expression_caveats'),
        `caveats: ${file} should not depend on ExpressionCaveats`
    ));

    [
        'scripts/models/ringlike/PowerExpressions.js',
        'scripts/models/powertriangle/PowerTriangles.js',
    ].forEach(file => assert(
        !fs.readFileSync(path.join(root, file), 'utf8').includes('orderlikes'),
        `caveats: ${file} should not depend on Orderlikes`
    ));
}

function dragChoices() {
    const rhs = grouplikes.constant(2);

    for (const a of [x, grouplikes.constant(2)]) {
        const equation = new Relation('eq', a, rhs);
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
            keys.has(expression_shape.encode(new Relation('eq',
                additive_divide(a)(a),
                additive_divide(a)(rhs)
            ))),
            `drag choices: lone expression should include additive division
${context}`
        );
        assert(
            keys.has(expression_shape.encode(new Relation('eq',
                multiplicative_divide(a)(a),
                multiplicative_divide(a)(rhs)
            ))),
            `drag choices: lone expression should include multiplicative division
${context}`
        );
        assert(choices.every(choice => choice instanceof RelationDragChoice),
            'drag choices: public choices should be RelationDragChoice values');
        assert(choices.every(choice =>
            choice.expression != null &&
            Object.prototype.hasOwnProperty.call(choice, 'operator') &&
            choice.side === '1' &&
            choice.type === 'balance'
        ), 'drag choices: choices should carry expression, operator, target side, and drag type');
    }

    const composite = grouplikes.add([x, grouplikes.constant(3)]);
    const composite_rhs = grouplikes.constant(7);
    const composite_choices = algebra.choices(
        new Relation('eq', composite, composite_rhs),
        '0/0',
        '1',
        manual_drag_options
    );
    const additive_composite = composite_choices.find(choice =>
        orderedExpressionKey(choice.equation.left) ===
            orderedExpressionKey(additive_divide(composite)(composite)) &&
        orderedExpressionKey(choice.equation.right) ===
            orderedExpressionKey(additive_divide(composite)(composite_rhs))
    );
    assert(additive_composite != null,
        'drag choices: composite lone expression should preserve additive self-division');

    const negative_factor_path = '0/0/1/0';
    const nested_sum_path = '0/0/1/1';
    assert(
        algebra.draggable_paths(additive_composite.equation, manual_drag_options)
            .includes(negative_factor_path),
        'drag choices: the negative factor of a composite additive inverse should be draggable'
    );
    const negative_distribution = algebra.choices(
        additive_composite.equation,
        negative_factor_path,
        nested_sum_path,
        manual_drag_options
    );
    assert(
        negative_distribution.length === 1 &&
        negative_distribution[0].type === 'distribute',
        'drag choices: dragging the negative factor across a composite sum should distribute it'
    );

    const expression_view_source = fs.readFileSync(
        path.join(root, 'scripts/views/ExpressionView.js'),
        'utf8'
    );
    assert(
        !expression_view_source.includes("ringlikes.absolute('add', term)"),
        'expression view: signed addends must preserve the original AST paths'
    );
    assert(
        expression_view_source.includes('function draw_leading_negative') &&
        expression_view_source.includes("items[0].factor.type === 'constant'") &&
        expression_view_source.includes('items[0].factor.contents === -1'),
        'expression view: unary minus shorthand should apply only to a leading -1 factor'
    );
    assert(
        expression_view_source.includes(
            'precedence_for_tag(expression.type) <= parent_precedence'
        ),
        'expression view: equal-precedence nesting should be parenthesized'
    );
    assert(
        expression_view_source.includes('function has_leading_negative') &&
        expression_view_source.includes('!has_leading_negative(term)') &&
        !expression_view_source.includes("const is_inverse = ringlikes.is_inverse('add', term)"),
        'expression view: additive separators should follow the visible leading sign, not semantic negativity'
    );

    const zero_equation = new Relation('eq', zero, rhs);
    assert(
        algebra.choices(zero_equation, '0/0', '1', manual_drag_options).length === 1,
        'drag choices: zero should only admit additive lone-side balance'
    );

    // A lone reciprocal must expose multiplication so denominators can move
    // across the equality even when no Add/Multiply mode has been selected.
    const reciprocal_x = multiplicative_group_inverse(x);
    const denominator_equation = new Relation('eq', reciprocal_x, rhs);
    const denominator_choices = algebra.choices(
        denominator_equation,
        '0/0',
        '1',
        manual_drag_options
    );
    assert(
        denominator_choices.some(choice =>
            orderedExpressionKey(choice.equation.left) ===
                orderedExpressionKey(multiplicative_divide(reciprocal_x)(reciprocal_x)) &&
            orderedExpressionKey(choice.equation.right) ===
                orderedExpressionKey(multiplicative_divide(reciprocal_x)(rhs))
        ),
        'drag choices: a lone denominator should expose multiplicative division across equality'
    );

    // Substantive algebraic operations take precedence over commutation. In
    // particular, distributing a reciprocal across a sum must not also offer
    // a visually unchanged commuted fraction.
    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const fraction_equation = new Relation('eq', 
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
        new Relation('eq', grouplikes.add([
            grouplikes.div(x, three),
            grouplikes.div(two, three),
        ]), rhs),
        'drag choices: reciprocal distribution should produce x/3 + 2/3'
    );

    // Commutation remains available for aesthetic rearrangement when no
    // substantive combine or distribute operation applies.
    const y = grouplikes.variable('y');
    const commute_only = algebra.choices(
        new Relation('eq', grouplikes.add([x, y]), rhs),
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
    const original = new Relation('eq', x, rhs);
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
    const unsimplified = additive_divide(one)(seven);

    const manual = move(
        new Relation('eq', grouplikes.add([x, one]), seven),
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
        new Relation('eq', grouplikes.add([x, one]), seven),
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

    const nested = new Relation('eq', 
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

    const flat = new Relation('eq', 
        grouplikes.add([x, grouplikes.constant(7), grouplikes.constant(-1)]),
        zero
    );
    assertSameExpression(
        equations.simplify(flat).left,
        grouplikes.add([x, grouplikes.constant(6)]),
        'automatic simplification',
        'constant-valued siblings should fold within a nonconstant expression'
    );

    const invalid = new Relation('eq', unsimplified, x);
    assert(
        algebra.choices(invalid, '1/0', '1/0', auto_simplify_drag_options).length === 0,
        'automatic simplification: an invalid drag must not simplify unrelated arithmetic'
    );

    // A drag commits the already-simplified equation. Undo/redo then traverse
    // those exact historical references without invoking simplification again.
    const released = equation_drags.release();
    const original_equation = new Relation('eq', grouplikes.add([x, one]), seven);
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
    const a = new Relation('eq', x, grouplikes.constant(1));
    const b = new Relation('eq', x, grouplikes.constant(2));
    const c = new Relation('eq', x, grouplikes.constant(3));
    const d = new Relation('eq', x, grouplikes.constant(4));

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
// Fraction-preserving constant arithmetic
// Exact reciprocal structure is retained unless evaluation yields a whole
// number within the numerical tolerance.
// -----------------------------------------------------------------------------

function fractionPreservation() {
    const two = grouplikes.constant(2);
    const three = grouplikes.constant(3);
    const six = grouplikes.constant(6);
    const third = multiplicative_group_inverse(three);
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
// Ring-expression representation interface
// Ringlike recognizes and normalizes inverse-shaped scale/power expressions,
// but semantic inversion is supplied by Grouplike division definitions.
// -----------------------------------------------------------------------------

function ringExpressionInterface() {
    const negative_x = additive_inverse(x);
    assert(
        ringlikes.is_inverse('add', negative_x),
        'Ringlikes: additive inverse representation should be recognized'
    );
    assert(
        !ringlikes.is_inverse('add', x),
        'Ringlikes: ordinary additive expression should not be inverse-shaped'
    );
    assertSameExpression(
        ringlikes.absolute('add', negative_x),
        x,
        'Ringlikes',
        'absolute should remove the additive inverse representation'
    );
    assertSameExpression(
        ringlikes.absolute('add', x),
        x,
        'Ringlikes',
        'absolute should preserve a non-inverse additive expression'
    );

    const reciprocal_x = multiplicative_inverse(x);
    assert(
        ringlikes.is_inverse('mul', reciprocal_x),
        'Ringlikes: reciprocal representation should be recognized'
    );
    assert(
        !ringlikes.is_inverse('mul', x),
        'Ringlikes: ordinary multiplicative expression should not be reciprocal-shaped'
    );
    assertSameExpression(
        ringlikes.absolute('mul', reciprocal_x),
        x,
        'Ringlikes',
        'absolute should remove the reciprocal representation'
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
// Expression shape canonicalization
// Grouplike owns whether operand order is significant.
// -----------------------------------------------------------------------------

function expressionShapeCanonicalization() {
    const unsorted = Object.freeze(['V(z)', 'V(a)']);
    const canonical_add = grouplikes.canonicalize('add', unsorted);
    assert(
        canonical_add.join(',') === 'V(a),V(z)',
        'expression shape: commutative Grouplike should canonicalize operand order'
    );
    assert(
        unsorted.join(',') === 'V(z),V(a)',
        'expression shape: canonicalization should not mutate its input'
    );
    assert(
        grouplikes.canonicalize('pow', unsorted) === unsorted,
        'expression shape: noncommutative Grouplike should preserve operand order'
    );
    assert(
        grouplikes.canonicalize('unknown', unsorted) === unsorted,
        'expression shape: unknown expression types should preserve operand order'
    );

    forEachPair((a, b) => {
        const a_shape = expression_shape.encode(a);
        const b_shape = expression_shape.encode(b);

        assert(
            expression_shape.encode(grouplikes.add([a, b])) ===
            expression_shape.encode(grouplikes.add([b, a])),
            `expression shape: commutative addition should ignore operand order\n`+
            `a = ${describeCase(a)}\nb = ${describeCase(b)}`
        );
        stats.semantic_cases++;

        if (a_shape === b_shape) return;

        assert(
            expression_shape.encode(grouplikes.pow(a, b)) !==
            expression_shape.encode(grouplikes.pow(b, a)),
            `expression shape: noncommutative power should preserve operand order\n`+
            `a = ${describeCase(a)}\nb = ${describeCase(b)}`
        );
        assert(
            expression_shape.encode(new Relation('eq', a, b)) !==
            expression_shape.encode(new Relation('eq', b, a)),
            `expression shape: non-Grouplike relations should preserve side order\n`+
            `a = ${describeCase(a)}\nb = ${describeCase(b)}`
        );
        stats.semantic_cases += 2;
    });
}

// -----------------------------------------------------------------------------
// Additive closure
// a + b is an Expression.
// -----------------------------------------------------------------------------

function associativeReplacement() {
    const three = grouplikes.constant(3);
    const seven = grouplikes.constant(7);
    const negative_x = additive_inverse(x);
    const negative_three = additive_inverse(three);
    const parent = grouplikes.add([seven, x]);
    const replacement = grouplikes.add([negative_x, negative_three]);
    const rebuilt = paths.replace(parent, '1', replacement);
    const expected = grouplikes.add([seven, negative_x, negative_three]);

    assertSameExpression(
        rebuilt,
        expected,
        'associative replacement',
        'replacing a child of add with another add should flatten through associativity'
    );
    assert(
        rebuilt.type === 'add' && rebuilt.contents.every(item => item.type !== 'add'),
        'associative replacement: same-type associative children should not remain nested'
    );

    const nonassociative_parent = grouplikes.pow(x, three);
    const nonassociative_replacement = grouplikes.pow(seven, three);
    const ordered = paths.replace(nonassociative_parent, '0', nonassociative_replacement);
    assert(
        ordered.type === 'pow' && ordered.contents[0] === nonassociative_replacement,
        'associative replacement: nonassociative parents should preserve explicit nesting'
    );
}

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

    const identity_equation = new Relation('eq', zero, x);
    assertEquationMoveTransforms(
        identity_equation,
        '0/0',
        '1',
        new Relation('eq', additive_divide(zero)(zero), additive_divide(zero)(x)),
        'additive identity',
        'a lone additive identity remains divisible across equality',
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

        const negative_a = additive_group_inverse(a);
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

    const identity_equation = new Relation('eq', one, x);
    assertEquationMoveTransforms(
        identity_equation,
        '0/0',
        '1',
        new Relation('eq', multiplicative_divide(one)(one), multiplicative_divide(one)(x)),
        'multiplicative identity',
        'a lone multiplicative identity remains divisible across equality',
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
    const equation = new Relation('eq', left_identity_candidate, grouplikes.constant(17));
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

    const harmonic_desugared = multiplicative_group_inverse(grouplikes.add([
        multiplicative_group_inverse(log_two_x),
        multiplicative_group_inverse(log_three_x),
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
    const duplicate_log_equation = new Relation('eq', duplicate_log_sum, zero);
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
    const ambiguous_equation = new Relation('eq', ambiguous_product, zero);
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
    const reciprocal_x = multiplicative_group_inverse(x);

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

    const inverse_equation = new Relation('eq', inverse_composed, grouplikes.constant(17));
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
    const equation = new Relation('eq', squared, nine);
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
        grouplikes.root(two, squared),
        'power triangle root balance',
        'represent root_2(x^2) before inverse simplification'
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

    const root_equation = new Relation('eq', grouplikes.root(two, x), three);
    assertEquationMoveTransforms(
        root_equation,
        '0/0/0',
        '1',
        new Relation('eq',
            grouplikes.pow(grouplikes.root(two, x), two),
            grouplikes.pow(three, two)
        ),
        'power triangle root fixed-exponent inverse balance',
        'root_2(x) = 3 -> (root_2(x))^2 = 3^2',
        variables => variables.x > 0,
        manual_drag_options
    );

    const variable_index_root = new Relation('eq', grouplikes.root(x, eight), two);
    assertEquationMoveTransforms(
        variable_index_root,
        '0/0/1',
        '1',
        new Relation('eq',
            grouplikes.log(grouplikes.root(x, eight), eight),
            grouplikes.log(two, eight)
        ),
        'power triangle root fixed-result inverse balance',
        'root_x(8) = 2 -> log_(root_x(8))(8) = log_2(8)',
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

    const exponential_equation = new Relation('eq', grouplikes.pow(two, x), eight);
    const logarithmic_solution = new Relation('eq',
        grouplikes.log(two, grouplikes.pow(two, x)),
        grouplikes.log(two, eight)
    );
    assertEquationMoveTransforms(
        exponential_equation,
        '0/0/0',
        '1',
        logarithmic_solution,
        'power triangle fixed-base inverse balance',
        '2^x = 8 -> log_2(2^x) = log_2(8)',
        () => true,
        manual_drag_options
    );

    const logarithmic_equation = new Relation('eq', grouplikes.log(two, eight), x);
    const exponential_solution = new Relation('eq',
        grouplikes.pow(two, grouplikes.log(two, eight)),
        grouplikes.pow(two, x)
    );
    assertEquationMoveTransforms(
        logarithmic_equation,
        '0/0/0',
        '1',
        exponential_solution,
        'power triangle mirrored fixed-base inverse balance',
        'log_2(8) = x -> 2^log_2(8) = 2^x',
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
        new Relation('eq', power_of_log, zero), '0/0/0', '0/0/1/0'
    );
    assert(
        strip_choices.length > 0,
        'RelationPathOperations.strip should expose nested inverse cancellation'
    );
    assertSameExpression(
        strip_choices[0].equation.left,
        x,
        'RelationPathOperations.strip',
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

    const variable_base_log = new Relation('eq', grouplikes.log(x, eight), three);
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
        grouplikes.root(grouplikes.log(x, eight), eight),
        'power triangle fixed-result inverse balance',
        'represent root_(log_x(8))(8) before inverse simplification'
    );
    assertSameExpression(
        solved_base.right,
        expected_base,
        'power triangle fixed-result inverse balance',
        'append the base projection 8^(1/3)'
    );

    const mismatched = grouplikes.pow(two, grouplikes.log(three, x));
    const mismatched_equation = new Relation('eq', mismatched, grouplikes.constant(17));
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

        const reciprocal_a = multiplicative_inverse(a);
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
            multiplicative_group_inverse(multiplicative_group_inverse(a)),
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

        const left = multiplicative_group_inverse(grouplikes.mul([a, b]));
        const right = grouplikes.mul([
            multiplicative_group_inverse(a),
            multiplicative_group_inverse(b),
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
            multiplicative_group_inverse(b),
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
// Division structure interface
// Grouplike and contextual inverse structures use the same contract:
// divide(parent, source) -> (Expression -> Expression) | null
// -----------------------------------------------------------------------------

function divisionStructureInterface() {
    assert(grouplikes.left_divide.length === 2,
        'division interface: Grouplikes.left_divide should accept parent and source');
    assert(grouplikes.right_divide.length === 2,
        'division interface: Grouplikes.right_divide should accept parent and source');
    assert(triangle_inverse.left_divide.length === 2,
        'division interface: PowerTriangleInverse.left_divide should accept parent and source');
    assert(triangle_inverse.right_divide.length === 2,
        'division interface: PowerTriangleInverse.right_divide should accept parent and source');

    const division = divisor => expression =>
        new Expression('test_division', Object.freeze([expression, divisor]));
    const structure = Grouplike(
        'test_division',
        { right_divide:division },
        () => NaN
    );
    const sample = grouplikes.constant(2);
    const parent = new Expression('test_division', Object.freeze([x, sample]));

    assert(structure.left_divide(parent, sample) == null,
        'division interface: absent division direction should return null');
    assert(structure.right_divide(parent, x) == null,
        'division interface: right division should reject a non-rightmost embedded source');

    const embedded = structure.right_divide(parent, sample);
    const lone = structure.right_divide(null, sample);
    assert(typeof embedded === 'function',
        'division interface: embedded Grouplike division should return an operation');
    assert(typeof lone === 'function',
        'division interface: lone Grouplike division should use the same signature');
    assertShape(
        embedded(x),
        new Expression('test_division', Object.freeze([x, sample])),
        'division interface: embedded division operation'
    );
    assertShape(
        lone(x),
        new Expression('test_division', Object.freeze([x, sample])),
        'division interface: lone division operation'
    );

    const wrong_parent = new Expression('other', Object.freeze([x, sample]));
    assert(structure.right_divide(wrong_parent, x) == null,
        'division interface: Grouplike should reject an unrelated parent operation');
    assert(triangle_inverse.right_divide(null, x) == null,
        'division interface: contextual inverse should reject a missing parent');
}

// -----------------------------------------------------------------------------
// Division rendering order
// ExpressionView uses Grouplike canonicalization to determine whether reciprocal
// factors may be reordered for presentation.
// -----------------------------------------------------------------------------

function divisionRenderingOrder() {
    const commutative = Grouplike(
        'commutative_rendering',
        { is_commutative:true },
        () => NaN
    );
    const ordered = Grouplike(
        'ordered_rendering',
        {},
        () => NaN
    );

    assert(
        commutative.canonicalize(['1', '0']).join(',') === '0,1',
        'division rendering: commutative products should permit presentation reordering'
    );
    assert(
        ordered.canonicalize(['1', '0']).join(',') === '1,0',
        'division rendering: ordered products should preserve factor order'
    );

    const expression_view_source = fs.readFileSync(
        path.join(root, 'scripts/views/ExpressionView.js'),
        'utf8'
    );
    assert(
        expression_view_source.includes('grouplikes.canonicalize') &&
        expression_view_source.includes("math('\\backslash'") &&
        expression_view_source.includes("math('/'"),
        'division rendering: ExpressionView should derive fraction/directional notation from canonicalization'
    );

    const grouplike_source = fs.readFileSync(
        path.join(root, 'scripts/models/grouplike/Grouplike.js'),
        'utf8'
    );
    const grouplikes_source = fs.readFileSync(
        path.join(root, 'scripts/models/grouplike/Grouplikes.js'),
        'utf8'
    );
    assert(
        !grouplike_source.includes('division_parts') &&
        !grouplikes_source.includes('division_parts'),
        'division rendering: Grouplike should not own presentation-specific division partitioning'
    );
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
            grouplikes.mul([a, multiplicative_group_inverse(b)]),
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

        const before = new Relation('eq',
            grouplikes.mul([a, x]),
            b
        );
        const expected = new Relation('eq',
            multiplicative_divide(a)(before.left),
            multiplicative_divide(a)(b)
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

        const reciprocal_factor = multiplicative_group_inverse(a);
        const reverse_before = new Relation('eq', 
            grouplikes.mul([x, reciprocal_factor]),
            b
        );
        const reverse_expected = new Relation('eq',
            multiplicative_divide(reciprocal_factor)(reverse_before.left),
            multiplicative_divide(reciprocal_factor)(b)
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
        multiplicative_group_inverse(x),
        multiplicative_group_inverse(grouplikes.add([x, grouplikes.constant(1)])),
    ];
    const addend_cases = [
        x,
        additive_group_inverse(x),
        grouplikes.mul([grouplikes.constant(3), x]),
        grouplikes.pow(x, 2),
        multiplicative_group_inverse(grouplikes.add([x, grouplikes.constant(1)])),
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
// Broader Grouplike algebra coverage
// These tests deliberately use only the finalized Grouplike contract. Laws
// spanning multiple operations belong in other structures and are not tested
// here as Grouplike properties.
// -----------------------------------------------------------------------------

function algebraValue(type, components) {
    return new Expression(
        type,
        Object.freeze(components.map(value => new Expression('constant', value)))
    );
}

function algebraValueComponents(expression) {
    return expression.contents.map(component => component.contents);
}

function algebraApproximatelyEqual(left, right) {
    if (Array.isArray(left) || Array.isArray(right)) {
        return Array.isArray(left) && Array.isArray(right) &&
            left.length === right.length &&
            left.every((item, index) => algebraApproximatelyEqual(item, right[index]));
    }
    return approximatelyEqual(left, right);
}

function algebraEvaluator(structures, values, unary) {
    const evaluate = expression => {
        if (expression.type === 'constant') return expression.contents;
        if (values[expression.type] != null) return values[expression.type](expression);
        if (unary[expression.type] != null) {
            return unary[expression.type](evaluate(expression.contents[0]));
        }
        const structure = structures[expression.type];
        if (structure == null) return NaN;
        return structure.evaluator(evaluate)(expression);
    };
    return evaluate;
}

function assertAlgebraEquivalent(left, right, evaluate, property, context) {
    const left_value = evaluate(left);
    const right_value = evaluate(right);
    stats.evaluations++;
    stats.semantic_cases++;
    assert(
        algebraApproximatelyEqual(left_value, right_value),
        `${property} failed\n${context}\n`+
        `left: ${JSON.stringify(left_value)}\nright: ${JSON.stringify(right_value)}`
    );
}

function forEachAlgebraPair(cases, callback) {
    for (const a of cases)
    for (const b of cases)
        callback(a, b);
}

function forEachAlgebraTriple(cases, callback) {
    for (const a of cases)
    for (const b of cases)
    for (const c of cases)
        callback(a, b, c);
}

function inverseDivision(label, inverse_type, side, is_invertible) {
    return divisor => {
        if (!is_invertible(divisor)) return null;
        return expression => new Expression(
            label,
            Object.freeze(
                side === 'left'?
                    [new Expression(inverse_type, Object.freeze([divisor])), expression]
                  : [expression, new Expression(inverse_type, Object.freeze([divisor]))]
            )
        );
    };
}

function isNonzeroAlgebraValue(expression) {
    return algebraValueComponents(expression).some(component => component !== 0);
}

function scalarDivision(label, negate_type) {
    return divisor => expression => new Expression(
        label,
        Object.freeze([
            expression,
            new Expression(negate_type, Object.freeze([divisor])),
        ])
    );
}

function booleanAndSetAlgebras() {
    const zero_local = new Expression('constant', 0);
    const one_local = new Expression('constant', 1);
    const universe = new Expression('constant', 7);

    const boolean_and = Grouplike(
        'boolean_and',
        {
            is_commutative:true,
            is_associative:true,
            left_identity:one_local,
            right_identity:one_local,
            left_annihilator:zero_local,
            right_annihilator:zero_local,
            is_idempotent:true,
        },
        items => items.reduce((left, right) => Number(Boolean(left) && Boolean(right)), 1)
    );
    const boolean_or = Grouplike(
        'boolean_or',
        {
            is_commutative:true,
            is_associative:true,
            left_identity:zero_local,
            right_identity:zero_local,
            left_annihilator:one_local,
            right_annihilator:one_local,
            is_idempotent:true,
        },
        items => items.reduce((left, right) => Number(Boolean(left) || Boolean(right)), 0)
    );
    const boolean_xor = Grouplike(
        'boolean_xor',
        {
            is_commutative:true,
            is_associative:true,
            left_identity:zero_local,
            right_identity:zero_local,
            self_combination:zero_local,
        },
        items => items.reduce((left, right) => left ^ right, 0)
    );
    const union = Grouplike(
        'set_union',
        {
            is_commutative:true,
            is_associative:true,
            left_identity:zero_local,
            right_identity:zero_local,
            left_annihilator:universe,
            right_annihilator:universe,
            is_idempotent:true,
        },
        items => items.reduce((left, right) => left | right, 0)
    );
    const intersection = Grouplike(
        'set_intersection',
        {
            is_commutative:true,
            is_associative:true,
            left_identity:universe,
            right_identity:universe,
            left_annihilator:zero_local,
            right_annihilator:zero_local,
            is_idempotent:true,
        },
        items => items.reduce((left, right) => left & right, 7)
    );

    const structures = {
        boolean_and,
        boolean_or,
        boolean_xor,
        set_union:union,
        set_intersection:intersection,
    };
    const evaluate = algebraEvaluator(structures, {}, {});

    for (const structure of [boolean_and, boolean_or]) {
        const cases = [zero_local, one_local];
        forEachAlgebraPair(cases, (a, b) => {
            assertAlgebraEquivalent(
                structure.create([a, b]),
                structure.create([b, a]),
                evaluate,
                `${structure.label} commutativity`,
                `a=${a.contents}, b=${b.contents}`
            );
        });
        forEachAlgebraTriple(cases, (a, b, c) => {
            assertAlgebraEquivalent(
                structure.create([structure.create([a, b]), c]),
                structure.create([a, structure.create([b, c])]),
                evaluate,
                `${structure.label} associativity`,
                `a=${a.contents}, b=${b.contents}, c=${c.contents}`
            );
        });
        for (const a of cases) {
            assertSameExpression(
                structure.combine(a, a),
                a,
                `${structure.label} idempotence`,
                `a=${a.contents}`
            );
        }
        assert(structure.left_divide(null, one_local) == null,
            `${structure.label}: division should be absent`);
        assert(structure.right_divide(null, one_local) == null,
            `${structure.label}: division should be absent`);
    }

    for (const a of [zero_local, one_local]) {
        assertSameExpression(
            boolean_xor.combine(a, a),
            zero_local,
            'boolean_xor self-combination',
            `a=${a.contents}`
        );
    }

    const set_cases = [0, 1, 2, 3, 5, 7].map(value => new Expression('constant', value));
    for (const structure of [union, intersection]) {
        forEachAlgebraPair(set_cases, (a, b) => {
            assertAlgebraEquivalent(
                structure.create([a, b]),
                structure.create([b, a]),
                evaluate,
                `${structure.label} commutativity`,
                `a=${a.contents}, b=${b.contents}`
            );
        });
        forEachAlgebraTriple(set_cases, (a, b, c) => {
            assertAlgebraEquivalent(
                structure.create([structure.create([a, b]), c]),
                structure.create([a, structure.create([b, c])]),
                evaluate,
                `${structure.label} associativity`,
                `a=${a.contents}, b=${b.contents}, c=${c.contents}`
            );
        });
        for (const a of set_cases) {
            assertSameExpression(
                structure.combine(a, a),
                a,
                `${structure.label} idempotence`,
                `a=${a.contents}`
            );
        }
    }
}

function vectorAlgebra() {
    const vector = values => algebraValue('vector2', values);
    const zero_vector = vector([0, 0]);
    const negate = value => value.map(component => -component);
    const add_values = items => items.reduce(
        (sum, value) => sum.map((component, index) => component + value[index]),
        [0, 0]
    );
    const divide = scalarDivision('vector_add', 'vector_negate');
    const vector_add = Grouplike(
        'vector_add',
        {
            is_commutative:true,
            is_associative:true,
            left_identity:zero_vector,
            right_identity:zero_vector,
            left_divide:divide,
            right_divide:divide,
        },
        add_values
    );
    const evaluate = algebraEvaluator(
        { vector_add },
        { vector2:expression => algebraValueComponents(expression) },
        { vector_negate:negate }
    );
    const cases = [
        vector([0, 0]), vector([1, 0]), vector([0, 1]),
        vector([2, -3]), vector([-1, 4]),
    ];

    forEachAlgebraPair(cases, (a, b) => {
        assertAlgebraEquivalent(
            vector_add.create([a, b]),
            vector_add.create([b, a]),
            evaluate,
            'vector addition commutativity',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
        const quotient = vector_add.right_divide(null, b)(a);
        assertAlgebraEquivalent(
            vector_add.create([quotient, b]),
            a,
            evaluate,
            'vector additive right division',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
        const left_quotient = vector_add.left_divide(null, b)(a);
        assertAlgebraEquivalent(
            vector_add.create([b, left_quotient]),
            a,
            evaluate,
            'vector additive left division',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
    });

    forEachAlgebraTriple(cases, (a, b, c) => {
        assertAlgebraEquivalent(
            vector_add.create([vector_add.create([a, b]), c]),
            vector_add.create([a, vector_add.create([b, c])]),
            evaluate,
            'vector addition associativity',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}, c=${JSON.stringify(evaluate(c))}`
        );
    });
}

function complexAlgebra() {
    const complex = values => algebraValue('complex', values);
    const zero_complex = complex([0, 0]);
    const one_complex = complex([1, 0]);
    const multiply = ([ar, ai], [br, bi]) => [ar*br - ai*bi, ar*bi + ai*br];
    const inverse = ([real, imaginary]) => {
        const norm = real*real + imaginary*imaginary;
        return [real/norm, -imaginary/norm];
    };
    const left_divide = inverseDivision(
        'complex_mul', 'complex_inverse', 'left', isNonzeroAlgebraValue
    );
    const right_divide = inverseDivision(
        'complex_mul', 'complex_inverse', 'right', isNonzeroAlgebraValue
    );
    const complex_mul = Grouplike(
        'complex_mul',
        {
            is_commutative:true,
            is_associative:true,
            left_identity:one_complex,
            right_identity:one_complex,
            left_annihilator:zero_complex,
            right_annihilator:zero_complex,
            left_divide,
            right_divide,
        },
        items => items.reduce(multiply, [1, 0])
    );
    const evaluate = algebraEvaluator(
        { complex_mul },
        { complex:expression => algebraValueComponents(expression) },
        { complex_inverse:inverse }
    );
    const partial_grouplikes = Object.freeze({
        structures:Object.freeze([complex_mul]),
        left_divide:(parent, source) => complex_mul.left_divide(parent, source),
        right_divide:(parent, source) => complex_mul.right_divide(parent, source),
    });
    const partial_relations = Relations({
        grouplikes:partial_grouplikes,
        ringlikes,
        orderlikes,
        expression_shape,
        expression_caveats,
    });
    assert(
        partial_relations.balance(
            new Relation('eq', zero_complex, one_complex), 0, null, 1
        ).length === 0,
        'partial division should not advertise balancing a lone zero divisor'
    );
    assert(
        partial_relations.balance(
            new Relation('eq', complex_mul.create([zero_complex, one_complex]), one_complex),
            0,
            0,
            1
        ).length === 0,
        'partial division should not advertise balancing an embedded zero divisor'
    );
    const cases = [
        zero_complex, complex([1, 0]), complex([0, 1]), complex([1, 1]),
        complex([2, -1]), complex([-1, 2]),
    ];

    forEachAlgebraPair(cases, (a, b) => {
        assertAlgebraEquivalent(
            complex_mul.create([a, b]),
            complex_mul.create([b, a]),
            evaluate,
            'complex multiplication commutativity',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
        const right_division = complex_mul.right_divide(null, b);
        const left_division = complex_mul.left_divide(null, b);
        if (b === zero_complex) {
            assert(right_division == null && left_division == null,
                'complex division by zero should be unavailable');
            return;
        }
        const quotient = right_division(a);
        assertAlgebraEquivalent(
            complex_mul.create([quotient, b]),
            a,
            evaluate,
            'complex right division',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
        const left_quotient = left_division(a);
        assertAlgebraEquivalent(
            complex_mul.create([b, left_quotient]),
            a,
            evaluate,
            'complex left division',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
    });
    forEachAlgebraTriple(cases, (a, b, c) => {
        assertAlgebraEquivalent(
            complex_mul.create([complex_mul.create([a, b]), c]),
            complex_mul.create([a, complex_mul.create([b, c])]),
            evaluate,
            'complex multiplication associativity',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}, c=${JSON.stringify(evaluate(c))}`
        );
    });
}

function quaternionMultiply(a, b) {
    const [aw, ax, ay, az] = a;
    const [bw, bx, by, bz] = b;
    return [
        aw*bw - ax*bx - ay*by - az*bz,
        aw*bx + ax*bw + ay*bz - az*by,
        aw*by - ax*bz + ay*bw + az*bx,
        aw*bz + ax*by - ay*bx + az*bw,
    ];
}

function quaternionConjugate([w, x, y, z]) {
    return [w, -x, -y, -z];
}

function quaternionInverse(value) {
    const norm = value.reduce((sum, component) => sum + component*component, 0);
    return quaternionConjugate(value).map(component => component / norm);
}

function quaternionAlgebra() {
    const quaternion = values => algebraValue('quaternion', values);
    const zero_quaternion = quaternion([0, 0, 0, 0]);
    const one_quaternion = quaternion([1, 0, 0, 0]);
    const left_divide = inverseDivision(
        'quaternion_mul', 'quaternion_inverse', 'left', isNonzeroAlgebraValue
    );
    const right_divide = inverseDivision(
        'quaternion_mul', 'quaternion_inverse', 'right', isNonzeroAlgebraValue
    );
    const quaternion_mul = Grouplike(
        'quaternion_mul',
        {
            is_associative:true,
            left_identity:one_quaternion,
            right_identity:one_quaternion,
            left_annihilator:zero_quaternion,
            right_annihilator:zero_quaternion,
            left_divide,
            right_divide,
        },
        items => items.reduce(quaternionMultiply, [1, 0, 0, 0])
    );
    const evaluate = algebraEvaluator(
        { quaternion_mul },
        { quaternion:expression => algebraValueComponents(expression) },
        { quaternion_inverse:quaternionInverse }
    );
    const cases = [
        zero_quaternion,
        quaternion([1, 0, 0, 0]),
        quaternion([0, 1, 0, 0]),
        quaternion([0, 0, 1, 0]),
        quaternion([0, 0, 0, 1]),
        quaternion([1, 1, 0, 0]),
        quaternion([1, -1, 2, 0]),
    ];

    forEachAlgebraTriple(cases, (a, b, c) => {
        assertAlgebraEquivalent(
            quaternion_mul.create([quaternion_mul.create([a, b]), c]),
            quaternion_mul.create([a, quaternion_mul.create([b, c])]),
            evaluate,
            'quaternion multiplication associativity',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}, c=${JSON.stringify(evaluate(c))}`
        );
    });

    forEachAlgebraPair(cases, (a, b) => {
        const right_division = quaternion_mul.right_divide(null, b);
        const left_division = quaternion_mul.left_divide(null, b);
        if (b === zero_quaternion) {
            assert(right_division == null && left_division == null,
                'quaternion division by zero should be unavailable');
            return;
        }
        const right_quotient = right_division(a);
        assertAlgebraEquivalent(
            quaternion_mul.create([right_quotient, b]),
            a,
            evaluate,
            'quaternion right division',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
        const left_quotient = left_division(a);
        assertAlgebraEquivalent(
            quaternion_mul.create([b, left_quotient]),
            a,
            evaluate,
            'quaternion left division',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
    });

    const i = cases[2];
    const j = cases[3];
    assert(
        !algebraApproximatelyEqual(
            evaluate(quaternion_mul.create([i, j])),
            evaluate(quaternion_mul.create([j, i]))
        ),
        'quaternion multiplication should remain noncommutative'
    );
    const ij = quaternion_mul.create([i, j]);
    assert(quaternion_mul.commute(ij, 0, 1) === ij,
        'noncommutative Grouplike should not advertise a swap by changing the expression');
}

function octonionConjugate(value) {
    return [value[0], ...value.slice(1).map(component => -component)];
}

function octonionMultiply(left, right) {
    const a = left.slice(0, 4);
    const b = left.slice(4, 8);
    const c = right.slice(0, 4);
    const d = right.slice(4, 8);
    const ac = quaternionMultiply(a, c);
    const d_conj_b = quaternionMultiply(d, quaternionConjugate(b));
    const conj_a_d = quaternionMultiply(quaternionConjugate(a), d);
    const cb = quaternionMultiply(c, b);
    return [
        ...ac.map((component, index) => component - d_conj_b[index]),
        ...conj_a_d.map((component, index) => component + cb[index]),
    ];
}

function octonionInverse(value) {
    const norm = value.reduce((sum, component) => sum + component*component, 0);
    return octonionConjugate(value).map(component => component / norm);
}

function octonionAlgebra() {
    const octonion = values => algebraValue('octonion', values);
    const zero_octonion = octonion([0, 0, 0, 0, 0, 0, 0, 0]);
    const one_octonion = octonion([1, 0, 0, 0, 0, 0, 0, 0]);
    const left_divide = inverseDivision(
        'octonion_mul', 'octonion_inverse', 'left', isNonzeroAlgebraValue
    );
    const right_divide = inverseDivision(
        'octonion_mul', 'octonion_inverse', 'right', isNonzeroAlgebraValue
    );
    const octonion_mul = Grouplike(
        'octonion_mul',
        {
            left_identity:one_octonion,
            right_identity:one_octonion,
            left_annihilator:zero_octonion,
            right_annihilator:zero_octonion,
            left_divide,
            right_divide,
        },
        items => octonionMultiply(items[0], items[1])
    );
    const evaluate = algebraEvaluator(
        { octonion_mul },
        { octonion:expression => algebraValueComponents(expression) },
        { octonion_inverse:octonionInverse }
    );
    const basis = index => octonion(
        Array.from({length:8}, (_, component) => component === index? 1 : 0)
    );
    const cases = [
        zero_octonion, one_octonion,
        basis(1), basis(2), basis(3), basis(4),
        octonion([1, 1, 0, 0, 0, 0, 0, 0]),
    ];

    forEachAlgebraPair(cases, (a, b) => {
        const right_division = octonion_mul.right_divide(null, b);
        const left_division = octonion_mul.left_divide(null, b);
        if (b === zero_octonion) {
            assert(right_division == null && left_division == null,
                'octonion division by zero should be unavailable');
            return;
        }
        const right_quotient = right_division(a);
        assertAlgebraEquivalent(
            octonion_mul.create([right_quotient, b]),
            a,
            evaluate,
            'octonion right division',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
        const left_quotient = left_division(a);
        assertAlgebraEquivalent(
            octonion_mul.create([b, left_quotient]),
            a,
            evaluate,
            'octonion left division',
            `a=${JSON.stringify(evaluate(a))}, b=${JSON.stringify(evaluate(b))}`
        );
    });

    let found_nonassociative = false;
    for (const a of cases)
    for (const b of cases)
    for (const c of cases) {
        const left = octonion_mul.create([octonion_mul.create([a, b]), c]);
        const right = octonion_mul.create([a, octonion_mul.create([b, c])]);
        if (!algebraApproximatelyEqual(evaluate(left), evaluate(right))) {
            found_nonassociative = true;
            break;
        }
    }
    assert(found_nonassociative,
        'octonion sample set should demonstrate nonassociativity');

    const a = basis(1);
    const b = basis(2);
    const nested = octonion_mul.create([octonion_mul.create([a, b]), basis(4)]);
    assert(
        nested.type === 'octonion_mul' && nested.contents[0].type === 'octonion_mul',
        'nonassociative Grouplike should preserve explicit binary nesting'
    );
}

function inverseThroughDivision() {
    const additive_structure = grouplikes.structures.find(structure => structure.label === 'add');
    const multiplicative_structure = grouplikes.structures.find(structure => structure.label === 'mul');
    assert(additive_structure != null && multiplicative_structure != null,
        'division-derived inverse tests require additive and multiplicative Grouplikes');

    for (const a of field_expression_cases) {
        const additive_division = additive_structure.right_divide(null, a);
        assert(typeof additive_division === 'function',
            'additive inverse should be derivable from right division');
        const additive_candidate = additive_division(zero);
        const additive_where = variables => isDefined(a, variables);
        if (hasAdmissibleAssignment(additive_where)) {
            assertExpressionsEquivalent(
                grouplikes.add([a, additive_candidate]),
                zero,
                'additive inverse derived through division',
                `a = ${describeCase(a)}`,
                additive_where
            );
        }

        const multiplicative_where = variables => isDefinedNonzero(a, variables);
        if (!hasAdmissibleAssignment(multiplicative_where)) continue;
        const multiplicative_division = multiplicative_structure.right_divide(null, a);
        assert(typeof multiplicative_division === 'function',
            'multiplicative inverse should be derivable from right division');
        const multiplicative_candidate = multiplicative_division(one);
        assertExpressionsEquivalent(
            grouplikes.mul([a, multiplicative_candidate]),
            one,
            'multiplicative inverse derived through division',
            `a = ${describeCase(a)}`,
            multiplicative_where
        );
    }

    assert(ringlikes.inverse == null,
        'Ringlikes should not expose semantic inverse construction');
}

// -----------------------------------------------------------------------------
// Division cancellation without associativity
// Division definitions imply cancellation even when grouping cannot flatten.
// -----------------------------------------------------------------------------

function nonassociativeDivisionCancellation() {
    const a = new Expression('variable', 'a');
    const b = new Expression('variable', 'b');
    const identity = new Expression('constant', 0);
    const negate = expression => new Expression('neg', Object.freeze([expression]));
    const label = 'nonassoc_add';

    const left_divide = divisor => expression => new Expression(
        label,
        Object.freeze([negate(divisor), expression])
    );
    const right_divide = divisor => expression => new Expression(
        label,
        Object.freeze([expression, negate(divisor)])
    );

    const structure = Grouplike(
        label,
        {
            is_commutative:true,
            is_associative:false,
            left_identity:identity,
            right_identity:identity,
            left_divide,
            right_divide,
        },
        () => NaN
    );

    const inner = structure.create([a, b]);
    const divide = structure.right_divide(inner, b);
    assert(typeof divide === 'function',
        'nonassociative division: right division should be available');
    const outer = divide(inner);
    const inverse_b = outer.contents[1];

    assertShape(
        structure.strip(outer, inner, inverse_b, b),
        a,
        'nonassociative division: division should imply cancellation without associativity'
    );

    const local_grouplikes = Object.freeze({
        strip:(...args) => structure.strip(...args),
        rebuild:(expression, contents) => expression.type === label?
            structure.create(contents) : expression.with({contents:Object.freeze(contents)}),
        simplify:expression => expression,
        combine:() => null,
        collapse:(expression, index1, index2, replacement) => {
            const contents = expression.contents.slice();
            contents[Math.min(index1, index2)] = replacement;
            contents.splice(Math.max(index1, index2), 1);
            return structure.create(contents);
        },
    });
    const local_relations = Relations({
        grouplikes:local_grouplikes,
        ringlikes,
        orderlikes,
        expression_shape,
        expression_caveats,
        invertibles:[],
        equivalences:[],
    });

    const equation = new Relation('eq', outer, identity);
    assertShape(
        local_relations.simplify(equation).left,
        a,
        'nonassociative division: Relations.simplify should cancel a derived division'
    );

    const local_paths = ExpressionPaths(local_grouplikes);
    const local_path_operations = RelationPathOperations({
        expression_paths:local_paths,
        equations:local_relations,
    });
    const strip_choices = local_path_operations.strip(
        equation,
        '0/0/0/1',
        '0/0/1'
    );
    assert(
        strip_choices.length === 1 && strip_choices[0].type === 'strip',
        'nonassociative division: dragging inverse operands across nested parents should strip'
    );
    assertShape(
        strip_choices[0].equation.left,
        a,
        'nonassociative division: strip drag should cancel the divided operand'
    );
}

// -----------------------------------------------------------------------------
// Associative, noncommutative ordering
// Associativity permits flattening; it does not permit crossing intervening
// operands during combine/distribute or constant simplification.
// -----------------------------------------------------------------------------

function associativeNoncommutativeOrdering() {
    const a = new Expression('variable', 'a');
    const b = new Expression('variable', 'b');
    const c = new Expression('variable', 'c');
    const replacement = new Expression('variable', 'r');

    const sequence = Grouplike(
        'sequence',
        { is_associative:true },
        items => items.reduce((value, item) => value * 10 + item, 0)
    );
    const parent = sequence.create([a, b, c]);

    assert(
        sequence.collapse(parent, 0, 2, replacement) == null,
        'noncommutative associative collapse must not cross an intervening operand'
    );
    assertSameExpression(
        sequence.collapse(parent, 0, 1, replacement),
        sequence.create([replacement, c]),
        'noncommutative associative collapse',
        'adjacent operands may collapse without reordering'
    );
    assertSameExpression(
        sequence.collapse(parent, 1, 2, replacement),
        sequence.create([a, replacement]),
        'noncommutative associative collapse',
        'adjacent right operands may collapse without reordering'
    );

    const commutative_sequence = Grouplike(
        'commutative_sequence',
        { is_associative:true, is_commutative:true },
        items => items.reduce((sum, item) => sum + item, 0)
    );
    const commutative_parent = commutative_sequence.create([a, b, c]);
    assertSameExpression(
        commutative_sequence.collapse(commutative_parent, 0, 2, replacement),
        commutative_sequence.create([replacement, b]),
        'commutative associative collapse',
        'commutativity permits collapsing nonadjacent operands'
    );

    const one_local = new Expression('constant', 1);
    const two_local = new Expression('constant', 2);
    const three_local = new Expression('constant', 3);
    const four_local = new Expression('constant', 4);
    const mixed = sequence.create([one_local, two_local, a, three_local, four_local]);
    const evaluate_local = expression =>
        expression.type === 'constant'? expression.contents : NaN;
    const constant_result = expression => {
        if (!Array.isArray(expression.contents) ||
            expression.contents.some(item => item.type !== 'constant')
        ) return null;
        return new Expression(
            'constant',
            expression.contents.reduce((sum, item) => sum + item.contents, 0)
        );
    };
    assertSameExpression(
        sequence.simplify(mixed, expression => expression, evaluate_local, constant_result),
        sequence.create([
            new Expression('constant', 3),
            a,
            new Expression('constant', 7),
        ]),
        'noncommutative associative simplification',
        'only contiguous constant runs may be folded'
    );

    const structures = Object.fromEntries(
        grouplikes.structures.map(structure => [structure.label, structure])
    );
    const noncommutative_add = Grouplike(
        'add',
        { is_associative:true },
        items => items.reduce((sum, item) => sum + item, 0)
    );
    structures.add = noncommutative_add;
    const local_grouplikes = Grouplikes(structures);
    const local_shape = ExpressionShape(local_grouplikes);
    const local_relations = Relations({
        grouplikes:local_grouplikes,
        ringlikes,
        orderlikes,
        expression_shape:local_shape,
        expression_caveats,
    });

    const two_x = grouplikes.mul([grouplikes.constant(2), x]);
    const three_x = grouplikes.mul([grouplikes.constant(3), x]);
    const eight = grouplikes.constant(8);
    const separated = noncommutative_add.create([two_x, eight, three_x]);
    assert(
        local_relations.combine(separated, 0, 2).length === 0,
        'noncommutative associative combine must not combine like terms across an intervening operand'
    );

    const adjacent = noncommutative_add.create([two_x, three_x, eight]);
    assert(
        local_relations.combine(adjacent, 0, 1).length > 0,
        'noncommutative associative combine should still combine adjacent like terms'
    );
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
    courseOrganization,
    relationalExpressions,
    caveatTracking,
    dragChoices,
    automaticSimplification,
    historyPresentation,
    fractionPreservation,
    ringExpressionInterface,
    expressionShapeCanonicalization,
    associativeReplacement,
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
    divisionStructureInterface,
    divisionDefinition,
    nonassociativeDivisionCancellation,
    multiplicativeBalance,
    inverseThroughDivision,
    booleanAndSetAlgebras,
    vectorAlgebra,
    complexAlgebra,
    quaternionAlgebra,
    octonionAlgebra,
    associativeNoncommutativeOrdering,
    distributivity,
].forEach(test => test());

console.log(
    `ok - 24 level solutions; `+
    `${stats.semantic_cases} property cases; `+
    `${stats.evaluations} evaluations; `+
    `${stats.domain_skips} domain exclusions; `+
    `${stats.moves} advertised property moves`
);
