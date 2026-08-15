'use strict';

/*
Equation sides keep their additive and multiplicative surface structure even
when either operation has only one operand.  Thus a lone x is represented as

    add([mul([x])])

which gives the view two distinct drag contexts without changing the ordinary
Expression constructors used elsewhere in the algebra engine.
*/
class Equation {
    constructor(left, right) {
        this.left = Equation.side(left);
        this.right = Equation.side(right);
        Object.freeze(this);
    }

    static side(expression) {
        const terms = [];

        function append_term(term) {
            if (term.type === 'add') {
                term.contents.forEach(append_term);
                return;
            }

            const factors = [];
            function append_factor(factor) {
                if (factor.type === 'mul') {
                    factor.contents.forEach(append_factor);
                } else {
                    factors.push(factor);
                }
            }
            append_factor(term);
            terms.push(new Expression('mul', Object.freeze(factors)));
        }

        append_term(expression);
        return new Expression('add', Object.freeze(terms));
    }

    with(attributes) {
        return new Equation(
            attributes.left  != null? attributes.left  : this.left,
            attributes.right != null? attributes.right : this.right,
        );
    }
}
