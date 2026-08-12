'use strict';
// HUMAN VETTED

const EquationLatex = (expression_latex) => Object.freeze({
    encode: (equation) => `${expression_latex.encode(equation.left)}=${expression_latex.encode(equation.right)}`
})
