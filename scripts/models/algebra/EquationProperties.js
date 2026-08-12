'use strict';

const EquationProperties = Object.freeze({
    shape_key: equation =>
        `${Expressions.shape_key(equation.left)}=${Expressions.shape_key(equation.right)}`,

    is_same_shape: (a, b) =>
        EquationProperties.shape_key(a) === EquationProperties.shape_key(b),

    to_latex: equation =>
        `${Expressions.to_latex(equation.left)}=${Expressions.to_latex(equation.right)}`,

    is_satisfied: (equation, variables, tolerance) => {
        const epsilon = tolerance == null? 1e-9 : tolerance;
        const left = Expressions.evaluate(equation.left, variables);
        const right = Expressions.evaluate(equation.right, variables);
        if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
        return Math.abs(left-right) <= epsilon;
    },
});
