'use strict';

/*
`Grouplike` describes one binary operation on Expressions together with the
properties needed by `Grouplikes` to construct, append, combine, commute, and
cancel expressions.  Laws involving relationships between multiple operations
belong to the ringlike layer instead.

label           String
identity        Expression|undefined
is_commutative  Boolean
evaluator       (Expression->T) -> (Expression->T)
                e.g. subevaluate => expression => expression.contents.reduce((accumulator, item) => accumulator + subevaluate(item, variables), 0)
*/
const Grouplike = (label, identity, properties, evaluator) => {

    const is_commutative = properties.is_commutative;
    const is_associative = properties.is_associative;
    const is_left_cancellative = properties.is_left_cancellative;
    const is_right_cancellative = properties.is_right_cancellative;

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
            return identity != null && is_left_cancellative && is_right_cancellative?
                identity : null;
        }
        if (formatted.length === 1) return formatted[0];
        else return new Expression(label, Object.freeze(formatted));
    }

    function _is_identity(expression) {
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
        if (_is_identity(left) && is_left_cancellative) return right;
        if (_is_identity(right) && is_right_cancellative) return left;
        return null;
    }

    function commute(expression, index1, index2) {
        if (!is_commutative) return expression;
        const contents = expression.contents.slice();
        [contents[index1], contents[index2]] = [contents[index2], contents[index1]];
        return create(contents);
    }

    function cancel(expression, index) {
        if (expression.type !== label) return expression;
        if (index < 0 || index >= expression.contents.length) return expression;

        const is_left = index === 0;
        const is_right = index === expression.contents.length - 1;
        const is_cancellable =
            (is_left && is_left_cancellative) ||
            (is_right && is_right_cancellative) ||
            (is_commutative && (is_left_cancellative || is_right_cancellative));
        if (!is_cancellable) return expression;

        const contents = expression.contents.slice();
        contents.splice(index, 1);
        return create(contents);
    }

    return Object.freeze({
        label,
        create,
        append,
        combine,
        commute,
        cancel,
        evaluator,
    });

}
