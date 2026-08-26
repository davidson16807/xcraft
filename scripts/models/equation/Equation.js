'use strict';
// HUMAN VETTED

/* Equality is the `eq` special case of a general relational Expression. */
class Equation extends Relation {
    constructor(left, right) {
        super('eq', left, right);
    }

    with(attributes) {
        const contents = attributes.contents != null? attributes.contents : this.contents;
        const type = attributes.type != null? attributes.type : this.type;
        const left = attributes.left != null? attributes.left : contents[0];
        const right = attributes.right != null? attributes.right : contents[1];
        return type === 'eq'? new Equation(left, right) : new Relation(type, left, right);
    }
}
