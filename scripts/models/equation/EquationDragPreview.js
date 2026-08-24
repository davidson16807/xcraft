'use strict';

class EquationDragPreview {
    constructor(expression, operator) {
        this.expression = expression;
        this.operator = operator || null;
        Object.freeze(this);
    }
}
