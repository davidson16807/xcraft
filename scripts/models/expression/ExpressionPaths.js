'use strict';
// HUMAN VETTED

/*
Addresses Expressions by their contents indexes. The empty string addresses the
root Expression. For a Relation, 0 and 1 are its side nodes; 0/0 and 1/0 are
the expressions occupying those sides. There is one path language and no
separate path domain.
*/
const ExpressionPaths = (grouplikes) => {

    const _root = '';

    function nary(path, index) {
        typecheck(path, 'String');
        typecheck(index, 'Number+String');
        return path === _root? String(index) : `${path}/${index}`;
    }

    function base(path) {
        typecheck(path, 'String');
        return nary(path, 0);
    }

    function exponent(path) {
        typecheck(path, 'String');
        return nary(path, 1);
    }

    function root(path) {
        typecheck(path, 'String');
        const i = path.indexOf('/');
        return i < 0? path : path.slice(0, i);
    }

    function parent(path) {
        typecheck(path, 'String');
        const i = path.lastIndexOf('/');
        return i < 0? _root : path.slice(0, i);
    }

    function segment(path) {
        typecheck(path, 'String');
        const i = path.lastIndexOf('/');
        return i < 0? path : path.slice(i+1);
    }

    function _children(expression) {
        return !Array.isArray(expression.contents)? [] : expression.contents.map((_, i) => String(i));
    }

    function _child(expression, segment) {
        return !Array.isArray(expression.contents)? undefined : expression.contents[Number(segment)];
    }

    function resolve(expression, path) {
        typecheck(expression, 'Expression+Relation');
        typecheck(path, 'String');
        if (path === _root) return expression;
        return path.split('/').reduce((node, segment) =>
            node == null? undefined : _child(node, segment),
            expression
        );
    }

    function _replace_child(expression, segment, replacement) {
        if (!Array.isArray(expression.contents)) return expression;
        const contents = expression.contents.slice();
        contents[Number(segment)] = replacement;
        return expression.with({contents: Object.freeze(contents)});
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

    function replace(expression, path, replacement) {
        typecheck(expression, 'Expression+Relation');
        typecheck(path, 'String');
        typecheck(replacement, 'Expression+Relation');
        if (path === _root) return replacement;
        return _replace(expression, path.split('/'), replacement);
    }

    function all(expression) {
        typecheck(expression, 'Expression+Relation');
        const output = [];
        function visit(node, path) {
            _children(node).forEach(segment => {
                const child_path = nary(path, segment);
                output.push(child_path);
                visit(_child(node, segment), child_path);
            });
        }
        visit(expression, _root);
        return output;
    }

    function is_ancestor(ancestor, descendant) {
        typecheck(ancestor, 'String');
        typecheck(descendant, 'String');
        return ancestor === _root? descendant !== _root : descendant.startsWith(ancestor + '/');
    }

    return Object.freeze({
        nary,
        base,
        exponent,
        root,
        parent,
        segment,
        resolve,
        replace,
        all,
        is_ancestor,
    });
};
