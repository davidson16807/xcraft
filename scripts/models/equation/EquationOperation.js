'use strict';

class EquationOperation {
    constructor(expression, equation, operator) {
        this.expression = expression;
        this.equation = equation;
        this.operator = operator || null;
        Object.freeze(this);
    }
}
