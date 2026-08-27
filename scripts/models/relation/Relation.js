'use strict';
/*
A Relation is an Expression whose two contents are unary `side` Expressions.
The side nodes make relation operands independently addressable without a
second path domain: 0 and 1 address the sides; 0/0 and 1/0 address the
expressions occupying them.
*/
class Relation extends Expression {
    constructor(type, left, right, caveats) {
        super(type, Object.freeze([
            Relation.side(left),
            Relation.side(right),
        ]), caveats);
    }

    static side(expression) {
        return expression != null && expression.type === 'side'?
            expression : new Expression('side', Object.freeze([expression]));
    }

    static content(side) {
        return side != null && side.type === 'side' && Array.isArray(side.contents)?
            side.contents[0] : side;
    }

    get left() {
        return Relation.content(this.contents[0]);
    }

    get right() {
        return Relation.content(this.contents[1]);
    }

    with(attributes) {
        const contents = attributes.contents != null? attributes.contents : this.contents;
        return new Relation(
            attributes.type != null? attributes.type : this.type,
            attributes.left != null? attributes.left : Relation.content(contents[0]),
            attributes.right != null? attributes.right : Relation.content(contents[1]),
            attributes.caveats != null? attributes.caveats : this.caveats,
        );
    }
}
