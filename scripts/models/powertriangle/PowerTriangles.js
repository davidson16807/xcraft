'use strict';

/*
Maps Expressions to and from power-triangle coordinates.  The initial
implementation supports the result projection, base^exponent, including the
degenerate promotion x=x^1 used by same-base combination.
*/
const PowerTriangles = (grouplikes, expression_shape) => {
    const BASE = 'base';
    const EXPONENT = 'exponent';
    const RESULT = 'result';
    const shape = expression_shape;

    const projection_for_tag = Object.freeze({
        pow: Object.freeze({
            computed: RESULT,
            children: Object.freeze([BASE, EXPONENT]),
        }),
        log: Object.freeze({
            computed: EXPONENT,
            children: Object.freeze([BASE, RESULT]),
        }),
    });

    function projection(expression) {
        return projection_for_tag[expression.type] || null;
    }

    function as(expression, computed, promote) {
        if (computed === RESULT && expression.type === 'pow') {
            return new PowerTriangle(
                expression.contents[0],
                expression.contents[1],
                expression,
                RESULT
            );
        }
        if (computed === EXPONENT && expression.type === 'log') {
            return new PowerTriangle(
                expression.contents[0],
                expression,
                expression.contents[1],
                EXPONENT
            );
        }
        if (computed !== RESULT || !promote) return null;
        return new PowerTriangle(
            expression,
            grouplikes.constant(1),
            expression,
            RESULT
        );
    }

    function create(computed, vertices) {
        if (computed === RESULT) {
            if (vertices.base == null || vertices.exponent == null) return null;
            return grouplikes.pow(vertices.base, vertices.exponent);
        }
        if (computed === EXPONENT) {
            if (vertices.base == null || vertices.result == null) return null;
            return grouplikes.log(vertices.base, vertices.result);
        }
        if (computed === BASE) {
            if (vertices.exponent == null || vertices.result == null) return null;
            return grouplikes.pow(
                vertices.result,
                grouplikes.pow(vertices.exponent, grouplikes.constant(-1))
            );
        }
        return null;
    }

    function same(left, right) {
        return left != null && right != null && shape.encode(left) === shape.encode(right);
    }

    function other(first, second) {
        return [BASE, EXPONENT, RESULT]
            .find(vertex => vertex !== first && vertex !== second) || null;
    }

    return Object.freeze({
        BASE,
        EXPONENT,
        RESULT,
        projection_for_tag,
        projection,
        as,
        create,
        same,
        other,
    });
};
