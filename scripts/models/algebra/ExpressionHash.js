'use strict';
// HUMAN VETTED

const ExpressionHash = () => {
    function encode (expression) {
        switch (expression.type) {
            case 'constant': return `C(${expression.value})`;
            case 'variable': return `V(${expression.name})`;
            case 'group': return `G(${encode(expression.expression)})`;
            case 'div': return `D(${encode(expression.numerator)},${encode(expression.denominator)})`;
            case 'add':
                return `A(${expression.terms.map(encode).sort().join(',')})`;
            case 'mul':
                return `M(${expression.factors.map(encode).sort().join(',')})`;
            default: return '?';
        }
    }
    return Object.freeze({encode});
};
