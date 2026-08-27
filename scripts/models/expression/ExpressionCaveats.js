'use strict';
// HUMAN VETTED

/*
Caveats are Expressions. This helper only gathers them from Expression trees
and indexes candidate caveats by shape while validating decidable relations.
*/
const ExpressionCaveats = (expression_shape, orderlikes) => {

    const freeze = Object.freeze;

    function _is_true(caveat) {
        const value = orderlikes.evaluate(caveat, {});
        if (typeof value === 'boolean') return value;
        if (caveat.type === 'constant') return Boolean(value);
        return undefined;
    }

    function unique(caveats) {
        return freeze([
            ...new Map(
                caveats.map(caveat=>{
                    if (!(caveat instanceof Expression)) return null;
                    if (_is_true(caveat) === true) return null;
                    return [expression_shape.encode(caveat), caveat];
                }).filter(pair => pair != null)
            ).values()
        ]);
    }

    function gather(...expressions) {
        const caveats = [];
        const collect = expression => {
            if (!(expression instanceof Expression)) return;
            caveats.push(...expression.caveats);
            if (Array.isArray(expression.contents)) expression.contents.forEach(collect);
        };
        expressions.forEach(collect);
        return freeze(unique(caveats));
    }

    return freeze({ gather, unique });
};
