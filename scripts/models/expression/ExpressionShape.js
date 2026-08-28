'use strict';

const ExpressionShape = () => {
    function encode(expression) {
        typecheck(expression, 'Expression+Relation');
        switch (expression.type) {
            case 'constant': return `C(${expression.contents})`;
            case 'variable': return `V(${expression.contents})`;
            case 'slot': return 'slot';
            default: return `${expression.type}(${expression.contents.map(encode).sort().join(',')})`;
        }
    }
    return Object.freeze({encode});
};
