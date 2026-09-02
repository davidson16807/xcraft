'use strict';
// HUMAN VETTED

const ExpressionShape = grouplikes => {
    function encode(expression) {
        typecheck(expression, 'Expression+Relation');
        if (!Array.isArray(expression.contents)) {
            return `${expression.type}(${expression.contents})`;
        } else {
            const contents = expression.contents.map(encode);
            return `${expression.type}(${grouplikes.canonicalize(expression.type, contents).join(',')})`;
        }
    }
    return Object.freeze({encode});
};
