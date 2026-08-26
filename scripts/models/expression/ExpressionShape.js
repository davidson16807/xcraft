'use strict';
// HUMAN VETTED

const ExpressionShape = () => {
    function encode(expression) {
        switch (expression.type) {
            case 'constant': return `C(${expression.contents})`;
            case 'variable': return `V(${expression.contents})`;
            default: return `${expression.type}(${expression.contents.map(encode).sort().join(',')})`;
        }
    }
    return Object.freeze({encode});
};
