'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
[
    'scripts/models/algebra/Expressions.js',
    'scripts/models/algebra/Equation.js',
    'scripts/models/algebra/Equations.js',
    'scripts/levels/Levels.js',
].forEach(file => {
    vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename:file });
});

const algebra = Equations();
const levels = Levels();

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertShape(actual, expected, message) {
    assert(
        EquationProperties.is_same_shape(actual, expected),
        `${message}\nexpected: ${EquationProperties.to_latex(expected)}\nactual:   ${EquationProperties.to_latex(actual)}`
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
    q = move(q, 'R/d', 'path:R/n');
    assertShape(q, levels[2].goal, 'level 3');
}

function solveLevel4() {
    let q = levels[3].equation;
    q = move(q, 'L/d', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    assertShape(q, levels[3].goal, 'level 4');
}

function solveLevel5() {
    let q = levels[4].equation;
    q = move(q, 'L/0', 'path:L/1');
    q = move(q, 'L/0', 'side:R');
    q = move(q, 'R/d', 'path:R/n');
    assertShape(q, levels[4].goal, 'level 5');
}

function solveLevel6() {
    let q = levels[5].equation;
    q = move(q, 'R/0', 'side:L');
    q = move(q, 'L/0', 'path:L/2');
    q = move(q, 'L/1', 'side:R');
    q = move(q, 'R/1', 'path:R/0');
    q = move(q, 'L/0', 'side:R');
    q = move(q, 'R/d', 'path:R/n');
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
    q = move(q, 'R/d', 'path:R/n');
    assertShape(q, levels[7].goal, 'level 8');
}

function solveLevel9() {
    let q = levels[8].equation;
    q = move(q, 'L/d', 'side:R');
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
    q = move(q, 'R/d', 'path:R/n');
    assertShape(q, levels[9].goal, 'level 10');
}

function sameSolutionSamples(before, after) {
    for (let x = -20; x <= 20; x++) {
        const b = EquationProperties.is_satisfied(before, {x:x});
        const a = EquationProperties.is_satisfied(after, {x:x});
        if (a !== b) return false;
    }
    return true;
}

function verifyAdvertisedMoves() {
    const queue = levels.map(level => ({ equation:level.equation, depth:0 }));
    const visited = new Set(queue.map(item => EquationProperties.shape_key(item.equation)));
    let checked = 0;

    while (queue.length > 0) {
        const { equation, depth } = queue.shift();
        for (const source of EquationPaths.all(equation)) {
            for (const target of algebra.moves_for_source(equation, source)) {
                const updated = algebra.move(equation, source, target);
                assert(updated !== equation, 'advertised move must change state');
                assert(
                    sameSolutionSamples(equation, updated),
                    `move changed sampled solution set: ${source} -> ${target}\n`+
                    `${EquationProperties.to_latex(equation)} -> ${EquationProperties.to_latex(updated)}`
                );
                checked++;
                if (depth < 3) {
                    const key = EquationProperties.shape_key(updated);
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

[
    solveLevel1, solveLevel2, solveLevel3, solveLevel4, solveLevel5,
    solveLevel6, solveLevel7, solveLevel8, solveLevel9, solveLevel10,
].forEach(test => test());

const checked = verifyAdvertisedMoves();
console.log(`ok - 10 level solutions; ${checked} advertised rewrites preserve sampled solutions`);
