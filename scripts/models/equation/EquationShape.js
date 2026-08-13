'use strict';
// HUMAN VETTED

const EquationShape = (expression_shape) => Object.freeze({
    encode: (equation) => `${expression_shape.encode(equation.left)}=${expression_shape.encode(equation.right)}`
});
