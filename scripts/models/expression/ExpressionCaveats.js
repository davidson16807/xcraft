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
        typecheck(caveats, 'Array');
        const by_shape = new Map();
        for (const caveat of caveats) {
            if (!(caveat instanceof Expression)) continue;
            const is_true = _is_true(caveat);
            if (is_true === false) return null;
            if (is_true === true) continue;
            by_shape.set(expression_shape.encode(caveat), caveat);
        }
        return freeze([...by_shape.values()]);
    }

    function gather(...expressions) {
        typecheck(expressions, 'Array');
        const caveats = [];
        const collect = expression => {
            if (!(expression instanceof Expression)) return;
            caveats.push(...expression.caveats);
            if (Array.isArray(expression.contents)) expression.contents.forEach(collect);
        };
        expressions.forEach(collect);
        const gathered = unique(caveats);
        return gathered == null? null : freeze(gathered);
    }

    return freeze({ gather, unique });
};
