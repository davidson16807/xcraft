'use strict';

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
        return Expressions.at(side_expression(equation, parsed.side), parsed.segments);
    }

    function replace(equation, path, replacement) {
        const parsed = split(path);
        const original = side_expression(equation, parsed.side);
        const updated = Expressions.replace(original, parsed.segments, replacement);
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
            Expressions.children(node).forEach(segment => {
                const child_path = `${path}/${segment}`;
                output.push(child_path);
                visit(Expressions.child(node, segment), child_path);
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
