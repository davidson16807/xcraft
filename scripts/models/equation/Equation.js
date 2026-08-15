'use strict';

function top_level_side(expression) {
    function flatten(expression, type) {
        return expression.type === type?
            expression.contents.flatMap(item => flatten(item, type)) :
            [expression];
    }

    const terms = flatten(expression, 'add').map(term =>
        new Expression('mul', Object.freeze(flatten(term, 'mul')))
    );

    return new Expression('add', Object.freeze(terms));
}

class Equation {
    constructor(left, right) {
        this.left = top_level_side(left);
        this.right = top_level_side(right);
        Object.freeze(this);
    }

    with(attributes) {
        return new Equation(
            attributes.left  != null? attributes.left  : this.left,
            attributes.right != null? attributes.right : this.right,
        );
    }
}
