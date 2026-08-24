'use strict';

class EquationDragChoice {
    constructor(preview, equation, side, type) {
        this.preview = preview;
        this.equation = equation;
        this.side = side;
        this.type = type;
        Object.freeze(this);
    }
}
