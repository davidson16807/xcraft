'use strict';
// HUMAN VETTED

/* Equality is the `eq` special case of a general relational Expression. */
class Equation extends Relation {
    constructor(left, right, caveats) {
        super('eq', left, right, caveats);
    }

    with(attributes) {
        const relation = super.with(attributes);
        return relation.type === 'eq'?
            new Equation(relation.left, relation.right, relation.caveats) : relation;
    }
}
