'use strict';
// HUMAN VETTED

class RelationDragChoice {
    constructor(expression, operator, equation, side, type) {
        typecheck(expression, 'Expression');
        typecheck(operator, 'String');
        typecheck(equation, 'Relation');
        typecheck(side, 'String+Number');
        typecheck(type, 'String');
        this.expression = expression;
        this.operator = operator;
        this.equation = equation;
        this.side = side;
        this.type = type;
        Object.freeze(this);
    }
}
