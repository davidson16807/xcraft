'use strict';

/*
Maps Expressions to and from power-triangle coordinates. The three first-class
projections are pow(base, exponent), log(base, result), and
root(exponent, result). Result projection also supports the degenerate promotion
x=x^1 used by same-base combination.
*/
const PowerTriangles = (grouplikes, expression_shape) => {
    const freeze = Object.freeze;
    const BASE = 'base';
    const EXPONENT = 'exponent';
    const RESULT = 'result';
    const shape = expression_shape;

    const indices_for_tag = freeze({
        pow: [0, 1, null],
        log: [0, null, 1],
        root: [null, 0, 1],
    });

    const tag_for_id = freeze('root log pow'.split(' '));

    function to_expression(triangle){
        const id = [triangle.base, triangle.exponent, triangle.result].findIndex(vertex => vertex == null);
        return new Expression(projection_for_tag[tag_for_id[id]]);
    }

    function from_expression(expression){
        const projection = projection_for_tag[expression.type];
        const triangle = new PowerTriangle(
            indices_for_tag[expression.type].map(
                i => i == null? null : expression.contents[i]
            )
        );
    }

    return freeze({
        to_expression,
        from_expression
    });
};
