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
    'scripts/models/equation/Equation.js',
    'scripts/models/equation/EquationShape.js',
    'scripts/models/expression/ExpressionLatex.js',
    'scripts/models/expression/ExpressionPaths.js',
    'scripts/models/equation/Equations.js',
    'scripts/levels/Levels.js',
].forEach(file => {
    vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename:file });
});

const expression_shape = ExpressionShape();
const expressions = Expressions();
const scales = Scales(expressions, expression_shape);
const scale_expressions = ScaleExpressions(expressions, scales);
const equation_shape = EquationShape(expression_shape);
const expression_latex = ExpressionLatex(expressions, scales);
const paths = ExpressionPaths(expressions);
const algebra = Equations({
    expressions: expressions,
    scale_expressions: scale_expressions,
    expression_latex: expression_latex,
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

function verifyCoefficientBasis() {
    const x = expressions.variable('x');
    const two_x = expressions.mul([expressions.constant(2), x]);
    const decomposition = scales.from_expression(two_x);

    assert(decomposition.coefficient === 2, 'coefficient/basis should extract numeric coefficient');
    assert(
        expression_shape.encode(decomposition.basis) === expression_shape.encode(x),
        'coefficient/basis should preserve the nonconstant basis'
    );
    assert(
        scale_expressions.combine(two_x, expressions.mul([expressions.constant(3), x])).contents[0].contents === 5,
        'coefficient/basis should combine like terms'
    );
}

function verifyOppositeOperations() {
    const additive_inverse = algebra.opposite(levels[0].equation, 'L/1');
    assert(
        expression_shape.encode(additive_inverse) ===
        expression_shape.encode(expressions.constant(-3)),
        'moving +3 across equality should apply -3 to both sides'
    );

    const multiplicative_inverse = algebra.opposite(levels[2].equation, 'L/0');
    assert(
        expression_latex.encode(multiplicative_inverse) === '\\frac{1}{4}',
        'moving a factor 4 across equality should apply its reciprocal to both sides'
    );

    const reciprocal_inverse = algebra.opposite(levels[3].equation, 'L/1');
    assert(
        expression_shape.encode(reciprocal_inverse) ===
        expression_shape.encode(expressions.constant(6)),
        'moving a reciprocal factor across equality should apply its base to both sides'
    );

    assert(
        algebra.opposite(levels[6].equation, 'L/1/g/0') == null,
        'nested/local expressions should not advertise a balance operation'
    );
}

function verifyCommutativeSwaps() {
    const x = expressions.variable('x');
    const y = expressions.variable('y');
    const three = expressions.constant(3);

    const sum = new Equation(
        expressions.add([x, three, y]),
        expressions.constant(0)
    );
    assert(
        algebra.moves_for_source(sum, 'L/0').includes('path:L/2'),
        'commutative siblings should be advertised as valid path targets'
    );
    const swapped_sum = algebra.swap(sum, 'L/0', 'L/2');
    assert(swapped_sum !== sum, 'addition siblings should be swappable');
    assert(swapped_sum.left.contents[0] === y, 'addition swap should exchange the first term');
    assert(swapped_sum.left.contents[1] === three, 'addition swap should preserve untouched terms');
    assert(swapped_sum.left.contents[2] === x, 'addition swap should exchange the last term');

    const two = expressions.constant(2);
    const product = new Equation(
        expressions.mul([two, x, y]),
        expressions.constant(0)
    );
    const swapped_product = algebra.swap(product, 'L/1', 'L/2');
    assert(swapped_product !== product, 'multiplication siblings should be swappable');
    assert(swapped_product.left.contents[0] === two, 'multiplication swap should preserve untouched factors');
    assert(swapped_product.left.contents[1] === y, 'multiplication swap should exchange factors');
    assert(swapped_product.left.contents[2] === x, 'multiplication swap should exchange factors');

    const two_x = expressions.mul([two, x]);
    const three_x = expressions.mul([three, x]);
    const like_terms = new Equation(
        expressions.add([two_x, three_x]),
        expressions.constant(0)
    );
    const combined = algebra.move(like_terms, 'L/0', 'path:L/1');
    assert(combined.left.type === 'mul', 'combining like terms should take precedence over swapping');
    assert(
        scales.from_expression(combined.left).coefficient === 5,
        'combining like terms should produce 5x rather than reverse the terms'
    );

    const power = new Equation(
        expressions.pow(x, 2),
        expressions.constant(0)
    );
    assert(
        algebra.swap(power, 'L/b', 'L/e') === power,
        'children of noncommutative expressions should not be swappable'
    );

    const nested = new Equation(
        expressions.add([x, expressions.group(expressions.add([y, three]))]),
        expressions.constant(0)
    );
    assert(
        algebra.swap(nested, 'L/0', 'L/1/g/0') === nested,
        'expressions with different parents should not be swappable'
    );
}

function verifyExpressionRepresentation() {
    levels.forEach(level => {
        paths.all(level.equation).forEach(path => {
            const expression = paths.resolve(level.equation, path);
            assert(expression instanceof Expression, `AST node should be an Expression: ${path}`);
            assert(expression.type !== 'div', `division should not be a primitive AST node: ${path}`);
        });
    });

    const x = expressions.variable('x');
    const two = expressions.constant(2);
    const quotient = expressions.div(x, two);
    assert(quotient.type === 'mul', 'division should construct multiplication by a reciprocal');
    assert(expressions.is_reciprocal(quotient.contents[1]), 'division denominator should be reciprocal');
    assert(expression_latex.encode(quotient) === '\\frac{x}{2}', 'reciprocal multiplication should render as a fraction');

    const square = expressions.pow(x, 2);
    assert(expression_latex.encode(square) === 'x^{2}', 'powers should render with an exponent');
}

function isSatisfied(equation, variables, tolerance) {
    const epsilon = tolerance == null? 1e-9 : tolerance;
    const left = expressions.evaluate(equation.left, variables);
    const right = expressions.evaluate(equation.right, variables);
    return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= epsilon;
}

function sameSolutionSamples(before, after) {
    for (let x = -20; x <= 20; x++) {
        const b = isSatisfied(before, {x:x});
        const a = isSatisfied(after, {x:x});
        if (a !== b) return false;
    }
    return true;
}

function verifyAdvertisedMoves() {
    const queue = levels.map(level => ({ equation:level.equation, depth:0 }));
    const visited = new Set(queue.map(item => equation_shape.encode(item.equation)));
    let checked = 0;

    while (queue.length > 0) {
        const { equation, depth } = queue.shift();
        for (const source of paths.all(equation)) {
            for (const target of algebra.moves_for_source(equation, source)) {
                const updated = algebra.move(equation, source, target);
                assert(updated !== equation, 'advertised move must change state');
                assert(
                    sameSolutionSamples(equation, updated),
                    `move changed sampled solution set: ${source} -> ${target}\n`+
                    `${equation_shape.encode(equation)} -> ${equation_shape.encode(updated)}`
                );
                checked++;
                if (depth < 3) {
                    const key = equation_shape.encode(updated);
                    if (!visited.has(key) && visited.size < 5000) {
                        visited.add(key);
                        queue.push({ equation:updated, depth:depth+1 });
                    }
                }
            }
        }
    }
    assert(checked > 0, 'property test should check at least one move');
    return checked;
}

verifyCoefficientBasis();
verifyOppositeOperations();
verifyCommutativeSwaps();
verifyExpressionRepresentation();
[
    solveLevel1, solveLevel2, solveLevel3, solveLevel4, solveLevel5,
    solveLevel6, solveLevel7, solveLevel8, solveLevel9, solveLevel10,
].forEach(test => test());

const checked = verifyAdvertisedMoves();
console.log(`ok - 10 level solutions; ${checked} advertised rewrites preserve sampled solutions`);
