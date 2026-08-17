'use strict';

/*
In math, a "monoid" is a structure featuring an operation that has an identity and is everywhere associative.
`Monoid` manages expressions that only require awareness of a single operation with these properties.
so `Monoid` can commute, append, and remove but not invert, combine, or distribute,
since expressing those either requires other properties or knowledge of operations outside the monoid.

label           String
is_commutative  Boolean
identity        Expression
evaluator       (Expression->T) -> (Expression->T)
                e.g. subevaluate => expression => expression.contents.reduce((accumulator, item) => accumulator + subevaluate(item, variables), 0)
*/
const MagmaExpressions = (label, identity, is_commutative, is_associative, is_invertible, evaluator) => {

    function create(contents) {
        let formatted = [];
        if (!is_associative) {
            formatted = contents;
        } else {
            // flatten
            contents.forEach(term => {
                if (term.type === label) {
                    term.contents.forEach(x => formatted.push(x));
                } else {
                    formatted.push(term);
                }
            });
        }
        // wrap in Expression if not done yet
        formatted = formatted.map(item => 
            item instanceof Expression? item : new Expression('constant', item));
        if (formatted.length === 0 && identity != null) return identity;
        if (formatted.length === 1) return formatted[0];
        else return new Expression(label, Object.freeze(formatted));
    }

    function is_identity(expression) {
        return (
            identity != null && 
            expression.type === identity.type && 
            expression.contents === identity.contents
        );
    }

    function append(left, right) {
        return left.type === label && is_associative? 
            create([...left.contents, right]) 
          : create([left, right]);
    }

    function combine(left, right) {
        if (is_identity(left)) return right;
        if (is_identity(right)) return left;
        return null;
    }

    function commute(expression, index1, index2) {
        if (!is_commutative) return expression;
        const contents = expression.contents.slice();
        [contents[index1], contents[index2]] = [contents[index2], contents[index1]];
        return create(contents);
    }

    function cancel(expression, index) {
        if (!is_invertible) return expression;
        const contents = expression.contents.slice();
        contents.splice(index, 1);
        return expression.type !== label? expression : create(contents);
    }

    return Object.freeze({
        label,
        create,
        append,
        combine,
        commute,
        cancel,
        evaluator,
        is_identity,
    });

}
