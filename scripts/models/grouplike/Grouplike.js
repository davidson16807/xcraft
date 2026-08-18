'use strict';

/*
`Grouplike` describes one binary operation on Expressions together with the
properties needed by `Grouplikes` to construct, append, combine, commute, and
cancel expressions.  Laws involving relationships between multiple operations
belong to the ringlike layer instead.

label           String
left_identity   Expression?
right_identity  Expression?
is_commutative  Boolean
evaluator       (Expression->T) -> (Expression->T)
                e.g. subevaluate => expression => expression.contents.reduce((accumulator, item) => accumulator + subevaluate(item, variables), 0)
*/
const Grouplike = (label, left_identity, right_identity, is_commutative, is_associative, is_invertible, evaluator) => {

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
        if (formatted.length === 0) {
            return left_identity != null && right_identity != null? left_identity : null;
        }
        if (formatted.length === 1) return formatted[0];
        else return new Expression(label, Object.freeze(formatted));
    }

    function is_left_identity(expression) {
        return (
            left_identity != null &&
            expression.type === left_identity.type &&
            expression.contents === left_identity.contents
        );
    }

    function is_right_identity(expression) {
        return (
            right_identity != null &&
            expression.type === right_identity.type &&
            expression.contents === right_identity.contents
        );
    }

    function append(left, right) {
        return left.type === label && is_associative? 
            create([...left.contents, right]) 
          : create([left, right]);
    }

    function combine(left, right) {
        if (is_left_identity(left)) return right;
        if (is_right_identity(right)) return left;
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
        is_left_identity,
        is_right_identity,
    });

}
