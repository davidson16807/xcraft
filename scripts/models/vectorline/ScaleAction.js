'use strict';

/*
Expression representation of the ordinary scalar action on the additive real
line.  Only the result projection is represented explicitly in the AST:

    scalar * vector = result

`Scales` supplies the canonical numeric-coefficient decomposition used by
like-term combination.  Distribution can still match arbitrary symbolic
scalars because the drag geometry identifies the two direct multiplication
children.
*/
const ScaleAction = (grouplikes, scales, expression_shape) => {
    const VECTOR = 'vector';
    const SCALAR = 'scalar';
    const RESULT = 'result';
    const shape = expression_shape;

    function supports(computed) {
        return computed === RESULT;
    }

    function operation(computed) {
        return computed === RESULT? 'mul' : null;
    }

    function other(first, second) {
        return [VECTOR, SCALAR, RESULT]
            .find(vertex => vertex !== first && vertex !== second) || null;
    }

    function same(left, right) {
        if (left == null || right == null) return left === right;
        return shape.encode(left) === shape.encode(right);
    }

    function as(expression, computed) {
        if (computed !== RESULT) return null;
        const scale = scales.from_expression(expression);
        if (scale.basis == null) return null;
        return Object.freeze({
            [VECTOR]: scale.basis,
            [SCALAR]: grouplikes.constant(scale.coefficient),
            [RESULT]: expression,
            computed: RESULT,
        });
    }

    function create(computed, vertices, options) {
        if (computed !== RESULT) return null;
        const scalar = vertices[SCALAR];
        const vector = vertices[VECTOR];
        if (scalar == null || vector == null) return null;
        const preserve_action = options && options.preserve_action;
        if (!preserve_action && scalar.type === 'constant' && scalar.contents === 0) {
            return grouplikes.constant(0);
        }
        if (!preserve_action && scalar.type === 'constant' && scalar.contents === 1) return vector;

        const order = options && options.order;
        if (Array.isArray(order) && order.length === 2) {
            return grouplikes.mul(order.map(vertex => vertices[vertex]));
        }
        return grouplikes.mul([scalar, vector]);
    }

    function matches(parent, computed, fixed, source, other_vertex, target) {
        if (computed !== RESULT || parent.type !== 'mul') return false;
        return parent.contents.includes(source) && parent.contents.includes(target) &&
            source !== target;
    }

    return Object.freeze({
        VECTOR,
        SCALAR,
        RESULT,
        supports,
        operation,
        other,
        same,
        as,
        create,
        matches,
    });
};
