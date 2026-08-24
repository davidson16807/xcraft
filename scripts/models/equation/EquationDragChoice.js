'use strict';

/*
A possible result of one equation drag.

preview  Expression shown in the drag-choice ghost.
equation Equation produced if the choice is selected.
side     Equation side beneath which the ghost is displayed ('L' or 'R').
type     User-facing drag operation ('balance', 'combine', 'distribute', 'commute').
*/
class EquationDragChoice {
    constructor(preview, equation, side, type) {
        this.preview = preview;
        this.equation = equation;
        this.side = side;
        this.type = type;
        Object.freeze(this);
    }
}
