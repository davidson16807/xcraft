'use strict';
// HUMAN VETTED

const ExpressionShape = () => {
    function encode(expression) {
        switch (expression.type) {
            case 'constant': return `C(${expression.contents})`;
            case 'variable': return `V(${expression.contents})`;
            case 'pow': return `P(${encode(expression.contents[0])},${encode(expression.contents[1])})`;
            case 'add': return expression.contents.length === 1? encode(expression.contents[0]) : `A(${expression.contents.map(encode).sort().join(',')})`;
            case 'mul': return expression.contents.length === 1? encode(expression.contents[0]) : `M(${expression.contents.map(encode).sort().join(',')})`;
            default: return '...';
        }
    }
    return Object.freeze({encode});
};
