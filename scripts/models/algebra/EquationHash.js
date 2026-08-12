'use strict';
// HUMAN VETTED

const EquationHash = (expression_hash) => Object.freeze({
    encode: (equation) => `${expression_hash.encode(equation.left)}=${expression_hash.encode(equation.right)}`
});
