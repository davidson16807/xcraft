'use strict';
// HUMAN VETTED

const ExpressionPaths = (expressions) => {

    function domain(path) {
        return path.split(':')[0];
    }

    function path(path) {
        return path.split(':')[1];
    }

    function nary(path, index) {
        return path == null? null : `${path}/${index}`;
    }

    function base(path) {
        return path == null? null : `${path}/0`;
    }

    function exponent(path) {
        return path == null? null : `${path}/1`;
    }

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

    function _children(expression) {
        return !Array.isArray(expression.contents)? [] : expression.contents.map((_, i) => String(i));
    }

    function _at(expression, segments) {
        return segments.reduce((node, segment) => _child(node, segment), expression);
    }

    function _child(expression, segment) {
        return !Array.isArray(expression.contents)? undefined : expression.contents[Number(segment)];
    }

    function _side_expression(equation, side) {
        return side === 'L'? equation.left : equation.right;
    }

    function resolve(equation, path) {
        const parsed = split(path);
        return _at(_side_expression(equation, parsed.side), parsed.segments);
    }

    function _replace_child(expression, segment, replacement) {
        if (!Array.isArray(expression.contents)) {
            return expression;
        } else {
            const contents = expression.contents.slice();
            contents[Number(segment)] = replacement;
            return expression.with({contents: contents});
        }
    }

    function _replace(expression, segments, replacement) {
        if (segments.length === 0) return replacement;
        const head = segments[0];
        const tail = segments.slice(1);
        const current_child = _child(expression, head);
        if (current_child == null) return expression;
        const next_child = _replace(current_child, tail, replacement);
        if (next_child === current_child) return expression;
        return _replace_child(expression, head, next_child);
    }

    function replace(equation, path, replacement) {
        const parsed = split(path);
        const original = _side_expression(equation, parsed.side);
        const updated = _replace(original, parsed.segments, replacement);
        if (updated === original) return equation;
        return parsed.side === 'L'?
            equation.with({ left: updated }) :
            equation.with({ right: updated });
    }

    function all_expression_paths(expression, root_path) {
        const output = [root_path];
        function visit(node, path) {
            _children(node).forEach(segment => {
                const child_path = `${path}/${segment}`;
                output.push(child_path);
                visit(_child(node, segment), child_path);
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
        domain,
        path,
        nary,
        base,
        exponent,
        split,
        parent,
        segment,
        resolve,
        replace,
        all,
        is_ancestor,
    });
};
