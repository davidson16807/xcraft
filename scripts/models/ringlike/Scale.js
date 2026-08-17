'use strict';
// HUMAN VETTED

class Scale {
    constructor(coefficient, basis, key) {
        this.coefficient = coefficient;
        this.basis = basis;
        this.key = key;
        Object.freeze(this);
    }

    with(attributes) {
        return new Scale(
            attributes.coefficient  != null? attributes.coefficient  : this.coefficient,
            attributes.basis        != null? attributes.basis        : this.basis,
            attributes.key          != null? attributes.key          : this.key,
        );
    }
}

