'use strict';

/*
Caveats are Expressions. They are stored as immutable arrays, unique by
ExpressionShape. A false constant is not a caveat.
*/
const ExpressionCaveats = expression_shape => {

    function index(caveats) {
        const by_shape = new Map();
        for (const caveat of caveats || []) {
            if (!(caveat instanceof Expression)) continue;
            if (caveat.type === 'constant' && !caveat.contents) continue;
            by_shape.set(expression_shape.encode(caveat), caveat);
        }
        return Object.freeze([...by_shape.values()]);
    }

    function all(...expressions) {
        const caveats = [];
        const collect = expression => {
            if (!(expression instanceof Expression)) return;
            caveats.push(...expression.caveats);
            if (Array.isArray(expression.contents)) expression.contents.forEach(collect);
        };
        expressions.forEach(collect);
        return index(caveats);
    }

    function add(expression, caveats) {
        if (!(expression instanceof Expression)) return expression;
        const combined = index([...expression.caveats, ...(caveats || [])]);
        if (
            combined.length === expression.caveats.length &&
            combined.every((caveat, index) => caveat === expression.caveats[index])
        ) return expression;
        return expression.with({ caveats:combined });
    }

    function inherit(expression, ...inputs) {
        return add(expression, all(...inputs));
    }

    return Object.freeze({ index, all, add, inherit });
};
