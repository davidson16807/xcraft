'use strict';

const EquationShape = (expression_shape) => Object.freeze({
    encode: relation => expression_shape.encode(relation),
});
