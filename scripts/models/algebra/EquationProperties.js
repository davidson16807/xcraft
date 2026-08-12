'use strict';

function EquationProperties(expressions) {
    function shape_key (equation) {
        return `${expressions.shape_key(equation.left)}=${expressions.shape_key(equation.right)}`
    }

    function is_same_shape (a, b) {
        return shape_key(a) === shape_key(b);
    }

    function to_latex (equation) {
        return `${expressions.to_latex(equation.left)}=${expressions.to_latex(equation.right)}`
    }

    function is_satisfied (equation, variables, tolerance)  {
        const epsilon = tolerance == null? 1e-9 : tolerance;
        const left = expressions.evaluate(equation.left, variables);
        const right = expressions.evaluate(equation.right, variables);
        if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
        return Math.abs(left-right) <= epsilon;
    }

    return Object.freeze({
        shape_key,
        is_same_shape,
        to_latex,
        is_satisfied
    });
}
