'use strict';
// HUMAN VETTED

const ExpressionShape = grouplikes => {
    function encode(expression) {
        typecheck(expression, 'Expression+Relation');
        switch (expression.type) {
            case 'slot': return `slot`;
            case 'constant': return `C(${expression.contents})`;
            case 'variable': return `V(${expression.contents})`;
            default: {
                const contents = expression.contents.map(encode);
                return `${expression.type}(${grouplikes.canonicalize(expression.type, contents).join(',')})`;
            }
        }
    }
    return Object.freeze({encode});
};
