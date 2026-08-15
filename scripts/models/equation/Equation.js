'use strict';

/*
Equation sides retain the two operation contexts the player may act on:

    add([mul([...]), mul([...]), ...])

The wrappers are deliberately structural rather than algebraic simplification.
They let a lone value such as x be addressed either as the only addend on a
side or as the only factor in that addend.
*/
function equation_term(expression) {
    return expression.type === 'mul'?
        expression :
        new Expression('mul', Object.freeze([expression]));
}

function equation_side(expression) {
    if (
        expression.type === 'add' &&
        expression.contents.every(term => term.type === 'mul')
    ) {
        return expression;
    }

    const terms = [];
    function append_term(term) {
        if (term.type === 'add') {
            term.contents.forEach(append_term);
        } else {
            terms.push(term);
        }
    }
    append_term(expression);

    return new Expression(
        'add',
        Object.freeze(terms.map(equation_term))
    );
}

class Equation {
    constructor(left, right) {
        this.left = equation_side(left);
        this.right = equation_side(right);
        Object.freeze(this);
    }

    with(attributes) {
        return new Equation(
            attributes.left  != null? attributes.left  : this.left,
            attributes.right != null? attributes.right : this.right,
        );
    }
}
