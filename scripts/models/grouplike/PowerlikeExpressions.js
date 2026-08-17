'use strict';
// HUMAN WRITTEN

const PowerlikeExpressions = (label) => {
    function create(contents) {
        if (contents.length === 1)
            return contents[0];

        if (contents.length !== 2)
            return null; // or assert/throw, depending on existing convention

        const [base, exponent] = contents;
        return new Expression(label, Object.freeze([
            base,
            exponent instanceof Expression?
                exponent :
                new Expression('constant', exponent),
        ]));
    }

    function evaluator(subevaluate) {
        return expression => Math.pow(
            subevaluate(expression.contents[0]),
            subevaluate(expression.contents[1])
        );
    }

    function append(left, right) {
        return create([left, right]);
    }

    function combine(left, right) {
        return null;
    }

    function commute(expression, index1, index2) {
        return expression
    }

    function cancel(expression, index) {
        return expression;
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
