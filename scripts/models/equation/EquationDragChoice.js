'use strict';
// HUMAN VETTED

class EquationDragChoice {
    constructor(expression, operator, equation, side, type) {
        this.expression = expression;
        this.operator = operator || null;
        this.equation = equation;
        this.side = side;
        this.type = type;
        Object.freeze(this);
    }
}
