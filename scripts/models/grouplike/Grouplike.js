'use strict';
// HUMAN VETTED

/*
`Grouplike` manages operations for a single grouplike structure.
Each operation is enabled by properties of that structure, specified in `properties`.

Operations here are unambiguously defined by the structure. 
Unsupported operations are represented by returning the original expression 
(if the operation is unary) or null (if the operation is binary).
Return types are deeply immutable expressions. 
All functions are pure. 

label           String
identity        Expression|undefined
is_commutative  Boolean
evaluator       (Expression->T) -> (Expression->T)
                e.g. subevaluate => expression => expression.contents.reduce((accumulator, item) => accumulator + subevaluate(item, variables), 0)
*/
const Grouplike = (label, identity, properties, evaluatable) => {
    typecheck(label, 'String');
    typecheck(identity, 'Expression+1');
    typecheck(properties, 'Object');
    typecheck(evaluatable, 'Function');

    const is_commutative = properties.is_commutative;
    const is_associative = properties.is_associative;
    const is_invertible = properties.is_invertible;
    const is_left_cancellative = properties.is_left_cancellative;
    const is_right_cancellative = properties.is_right_cancellative;

    const evaluator = evaluate => expression => {
        return evaluatable(expression.contents.map(item => evaluate(item)));
    };

    function create(contents) {
        typecheck(contents, 'Array');
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
            return identity != null? identity : null;
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

    function simplify(expression, simplify, evaluate, constant_result) {
        typecheck(expression, 'Expression');
        typecheck(simplify, 'Function');
        typecheck(evaluate, 'Function');
        typecheck(constant_result, 'Function');
        const simplified_constant = constant_result(expression);
        if (simplified_constant != null) return simplified_constant;
        if (!Array.isArray(expression.contents)) return expression;

        let contents = expression.contents.map(simplify);

        /*
        associativity allows constant-valued
        siblings to be folded even when the entire expression still
        depends on a variable: e.g. x + 7 - 1 -> x + 6.
        */
        if (is_associative) {
            const constants = contents
                .map((item, index) => ({ item:item, index:index, value:evaluate(item, {}) }))
                .filter(item => Number.isFinite(item.value));

            if (constants.length > 1) {
                const constant_expression = expression.with({
                    contents: Object.freeze(constants.map(item => item.item)),
                });
                const combined = constant_result(constant_expression);
                if (combined != null) {
                    const first = constants[0].index;
                    const constant_indexes = new Set(constants.map(item => item.index));
                    contents = contents.flatMap((item, index) =>
                        index === first? [combined] :
                        constant_indexes.has(index)? [] : [item]
                    );
                }
            }
        }

        if (
            contents.length === expression.contents.length &&
            contents.every((item, i) => item === expression.contents[i])
        ) return expression;
        return expression.with({ contents: Object.freeze(contents) });
    }

    function append(left, right) {
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        return left.type === label && is_associative? 
            create([...left.contents, right]) 
          : create([left, right]);
    }

    function combine(left, right) {
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        if (_is_identity(left) && is_left_cancellative) return right;
        if (_is_identity(right) && is_right_cancellative) return left;
        return null;
    }

    function commute(expression, index1, index2) {
        typecheck(expression, 'Expression');
        typecheck(index1, 'Number');
        typecheck(index2, 'Number');
        if (!is_commutative) return expression;
        const contents = expression.contents.slice();
        [contents[index1], contents[index2]] = [contents[index2], contents[index1]];
        return create(contents);
    }

    function cancel(expression, index) {
        typecheck(expression, 'Expression');
        typecheck(index, 'Number');
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
        simplify,
        evaluator,
    });

}
