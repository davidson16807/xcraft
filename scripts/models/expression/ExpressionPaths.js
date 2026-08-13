'use strict';
// HUMAN VETTED

const ExpressionPaths = (expressions) => {

    function nary(path, index) {
        return `${path}/${index}`;
    }

    function base(path) {
        return `${path}/b`;
    }

    function exponent(path) {
        return `${path}/e`;
    }

    function group(path) {
        return `${path}/g`;
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
        switch (expression.type) {
            case 'add': return expression.contents.map((_, i) => String(i));
            case 'mul': return expression.contents.map((_, i) => String(i));
            case 'pow': return ['b', 'e'];
            case 'group': return ['g'];
            default: return [];
        }
    }

    function _at(expression, segments) {
        return segments.reduce((node, segment) => _child(node, segment), expression);
    }

    function _child(expression, segment) {
        switch (expression.type) {
            case 'add': return expression.contents[Number(segment)];
            case 'mul': return expression.contents[Number(segment)];
            case 'pow': return expression.contents[segment === 'b'? 0 : 1];
            case 'group': return expression.contents;
            default: return undefined;
        }
    }

    function _side_expression(equation, side) {
        return side === 'L'? equation.left : equation.right;
    }

    function resolve(equation, path) {
        const parsed = split(path);
        return _at(_side_expression(equation, parsed.side), parsed.segments);
    }

    function _replace_child(expression, segment, replacement) {
        switch (expression.type) {
            case 'add': {
                const terms = expression.contents.slice();
                terms[Number(segment)] = replacement;
                return expressions.add(terms);
            }
            case 'mul': {
                const factors = expression.contents.slice();
                factors[Number(segment)] = replacement;
                return expressions.mul(factors);
            }
            case 'pow':
                return segment === 'b'?
                    expressions.pow(replacement, expression.contents[1]) :
                    expressions.pow(expression.contents[0], replacement);
            case 'group':
                return expressions.group(replacement);
            default:
                return expression;
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

    function with_side(equation, side, expression) {
        return side === 'L'?
            equation.with({ left: expression }) :
            equation.with({ right: expression });
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
        nary,
        base,
        exponent,
        group,

        split,
        parent,
        segment,
        resolve,
        replace,
        with_side,
        all,
        is_ancestor,
    });
};
