'use strict';
// HUMAN VETTED

/* Dispatches operations to the orderlike associated with a relation tag. */
const Orderlikes = (orderlike_for_tag, grouplikes) => {

    function swap(relation) {
        const structure = orderlike_for_tag[relation.type];
        return structure == null? relation : structure.swap(relation);
    }

    const evaluator = variables => expression => {
        const subevaluate = item => evaluator(variables)(item);
        const structure = orderlike_for_tag[expression.type];
        if (structure != null && structure.evaluator != null) {
            return structure.evaluator(subevaluate)(expression);
        }
        return grouplikes.evaluate(expression, variables);
    };

    const evaluate = (expression, variables) => evaluator(variables)(expression);

    return Object.freeze({ swap, evaluate });
};
