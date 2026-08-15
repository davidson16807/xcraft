'use strict';
// HUMAN WRITTEN

/*
In math, a "monoid" is a structure featuring an operation that has an identity and is everywhere associative.
`Monoid` manages expressions that only require awareness of a single operation with these properties.
so `Monoid` can swap, append, and remove but not invert, combine, or distribute,
since expressing those either requires other properties or knowledge of operations outside the monoid.

label           String
is_commutative  Boolean
identity        Expression
evaluator       (Expression->T) -> (Expression->T)
                e.g. subevaluate => expression => expression.contents.reduce((accumulator, item) => accumulator + subevaluate(item, variables), 0)
*/
const MonoidStructure = (label, identity, is_commutative, evaluator) => {
    function create(contents) {
        const flat = [];
        contents.forEach(term => {
            if (term.type === label) {
                term.contents.forEach(x => flat.push(x));
            } else {
                flat.push(term);
            }
        });
        if (flat.length === 0) return identity;
        if (flat.length === 1) return flat[0];
        else return new Expression(label, Object.freeze(flat));
    }

    function is_identity(expression) {
        return expression.type === identity.type && expression.contents === identity.contents;
    }

    function swap(expression, index1, index2) {
        if (!is_commutative) { return expression; }
        const contents = expression.contents.slice();
        [contents[index1], contents[index2]] = [contents[index2], contents[index1]];
        return create(contents);
    }

    function append(left, right) {
        return left.type === label? create([...left.contents, right]) : create([left, right]);
    }

    /*
    Preserve a one-item monoid after a structural edit when the remaining
    item is a variable or constant, so its additive/multiplicative context is
    not lost.  Removing that final item then exposes the monoid identity.
    */
    function remainder(contents) {
        if (contents.length === 0) return identity;
        if (contents.length === 1) {
            const item = contents[0];
            if (is_identity(item)) return identity;
            if (item.type === 'constant' || item.type === 'variable') {
                return new Expression(label, Object.freeze(contents));
            }
        }
        return create(contents);
    }

    function remove(expression, index) {
        if (expression.type !== label) return expression;
        const contents = expression.contents.slice();
        contents.splice(index, 1);
        return remainder(contents);
    }

    function collapse(expression, index1, index2, replacement) {
        if (expression.type !== label) return expression;
        const low = Math.min(index1, index2);
        const high = Math.max(index1, index2);
        const contents = expression.contents.slice();
        contents[low] = replacement;
        contents.splice(high, 1);
        return remainder(contents);
    }

    return Object.freeze({
        label,
        create,
        swap,
        append,
        remove,
        collapse,
        evaluator, 
    });
}