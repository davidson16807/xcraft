'use strict';

/*
Unary inverse views for the additive and multiplicative grouplikes.
Relationships between multiple operations are mathematical laws compiled by
LinearActionInterpretations, not methods on this dispatcher.
*/
const Ringlike = inverse_representations_for_tag => {

    function inverse(type, expression) {
        const representation = inverse_representations_for_tag[type];
        return representation == null || representation.inverse == null? null :
            representation.inverse(expression);
    }

    function is_inverse(type, expression) {
        const representation = inverse_representations_for_tag[type];
        return representation != null && representation.is_inverse != null &&
            representation.is_inverse(expression);
    }

    function absolute(type, expression) {
        return is_inverse(type, expression)? inverse(type, expression) : expression;
    }

    return Object.freeze({
        inverse,
        is_inverse,
        absolute,
    });
};
