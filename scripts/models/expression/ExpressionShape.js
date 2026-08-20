'use strict';

const ExpressionShape = () => {
    function encode(expression) {
        switch (expression.type) {
            case 'constant': return `C(${expression.contents})`;
            case 'variable': return `V(${expression.contents})`;
            case 'pow': return `P(${encode(expression.contents[0])},${encode(expression.contents[1])})`;
            case 'log': return `L(${encode(expression.contents[0])},${encode(expression.contents[1])})`;
            case 'add': return `A(${expression.contents.map(encode).sort().join(',')})`;
            case 'mul': return `M(${expression.contents.map(encode).sort().join(',')})`;
            default: return '...';
        }
    }
    return Object.freeze({encode});
};
