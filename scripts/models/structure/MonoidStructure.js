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

    function swap(expression, index1, index2) {
        if (
            !is_commutative ||
            expression.type !== label ||
            !Number.isInteger(index1) ||
            !Number.isInteger(index2) ||
            index1 < 0 || index2 < 0 ||
            index1 >= expression.contents.length ||
            index2 >= expression.contents.length ||
            index1 === index2 ||
            expression.contents[index1] === expression.contents[index2]
        ) return expression;

        const contents = expression.contents.slice();
        [contents[index1], contents[index2]] = [contents[index2], contents[index1]];
        return create(contents);
    }

    function append(left, right) {
        return create([left, right]);
    }

    function remove(expression, index) {
        if (expression.type !== label) return expression;
        const contents = expression.contents.slice();
        contents.splice(index, 1);
        return create(contents);
    }

    function collapse(expression, index1, index2, replacement) {
        if (expression.type !== label) return expression;
        const low = Math.min(index1, index2);
        const high = Math.max(index1, index2);
        const contents = expression.contents.slice();
        contents[low] = replacement;
        contents.splice(high, 1);
        return create(contents);
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