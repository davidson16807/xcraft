'use strict';
// HUMAN VETTED

/*
A Relation is an Expression whose two contents are the expressions related by
its type. Relational tags such as `eq`, `lt`, and `gte` therefore participate
in the same expression tree without requiring a second value representation.
*/
class Relation extends Expression {
    constructor(type, left, right) {
        super(type, Object.freeze([left, right]));
    }

    get left() {
        return this.contents[0];
    }

    get right() {
        return this.contents[1];
    }

    with(attributes) {
        const contents = attributes.contents != null? attributes.contents : this.contents;
        return new Relation(
            attributes.type != null? attributes.type : this.type,
            attributes.left != null? attributes.left : contents[0],
            attributes.right != null? attributes.right : contents[1],
        );
    }
}
