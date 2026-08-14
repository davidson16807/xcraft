'use strict';
// HUMAN VETTED

class Power {
    constructor(base, power, key) {
        this.base = base;
        this.power = power;
        this.key = key;
        Object.freeze(this);
    }

    with(attributes) {
        return new Power(
            attributes.base  != null? attributes.base  : this.base,
            attributes.power        != null? attributes.power        : this.power,
            attributes.key          != null? attributes.key          : this.key,
        );
    }
}

