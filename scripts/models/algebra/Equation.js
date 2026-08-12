'use strict';

class Equation {
    constructor(left, right) {
        this.left = left;
        this.right = right;
        Object.freeze(this);
    }

    with(attributes) {
        return new Equation(
            attributes.left  != null? attributes.left  : this.left,
            attributes.right != null? attributes.right : this.right,
        );
    }
}

const EquationPaths = (() => {
    function split(path) {
        const parts = path.split('/');
        return { side: parts[0], segments: parts.slice(1) };
    }

    function parent(path) {
        const i = path.lastIndexOf('/');
        return i < 0? null : path.slice(0, i);
    }

    function segment(path) {
        const i = path.lastIndexOf('/');
        return i < 0? null : path.slice(i+1);
    }

    function side_expression(equation, side) {
        return side === 'L'? equation.left : equation.right;
    }

    function resolve(equation, path) {
        const parsed = split(path);
        return Expression.at(side_expression(equation, parsed.side), parsed.segments);
    }

    function replace(equation, path, replacement) {
        const parsed = split(path);
        const original = side_expression(equation, parsed.side);
        const updated = Expression.replace(original, parsed.segments, replacement);
        if (updated === original) return equation;
        return parsed.side === 'L'?
            equation.with({ left: updated }) :
            equation.with({ right: updated });
    }

    function with_side(equation, side, expression) {
        return side === 'L'?
            equation.with({ left: expression }) :
            equation.with({ right: expression });
    }

    function all_expression_paths(expression, root_path) {
        const output = [root_path];
        function visit(node, path) {
            Expression.children(node).forEach(segment => {
                const child_path = `${path}/${segment}`;
                output.push(child_path);
                visit(Expression.child(node, segment), child_path);
            });
        }
        visit(expression, root_path);
        return output;
    }

    function all(equation) {
        return [
            ...all_expression_paths(equation.left, 'L'),
            ...all_expression_paths(equation.right, 'R'),
        ];
    }

    function is_ancestor(ancestor, descendant) {
        return descendant.startsWith(ancestor + '/');
    }

    return Object.freeze({
        split,
        parent,
        segment,
        resolve,
        replace,
        with_side,
        all,
        is_ancestor,
    });
})();

const EquationMetrics = Object.freeze({
    shape_key: equation =>
        `${Expression.shape_key(equation.left)}=${Expression.shape_key(equation.right)}`,

    is_same_shape: (a, b) =>
        EquationMetrics.shape_key(a) === EquationMetrics.shape_key(b),

    to_latex: equation =>
        `${Expression.to_latex(equation.left)}=${Expression.to_latex(equation.right)}`,

    is_satisfied: (equation, variables, tolerance) => {
        const epsilon = tolerance == null? 1e-9 : tolerance;
        const left = Expression.evaluate(equation.left, variables);
        const right = Expression.evaluate(equation.right, variables);
        if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
        return Math.abs(left-right) <= epsilon;
    },
});
