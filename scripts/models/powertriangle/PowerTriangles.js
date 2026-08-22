'use strict';
// HUMAN VETTED

/*
`PowerTriangles` describes operations, relations, and properties to and from `PowerTriangle`.
*/
const PowerTriangles = (grouplikes, expression_shape) => {
    const freeze = Object.freeze;
    const BASE = 'base';
    const EXPONENT = 'exponent';
    const RESULT = 'result';
    const vertices = freeze([BASE, EXPONENT, RESULT]);

    /*
    For each triangle vertex, gives the child index of that value in the
    corresponding Expression projection. The null entry is the computed
    triangle vertex and therefore is absent from the Expression's contents.
    */
    const indices_for_tag = freeze({
        pow: freeze([0, 1, null]),
        log: freeze([0, null, 1]),
        root: freeze([null, 0, 1]),
    });

    // Missing base -> root, missing exponent -> log, missing result -> pow.
    const tag_for_id = freeze('root log pow'.split(' '));

    function from_expression(expression, promote) {
        const indices = indices_for_tag[expression.type];
        if (indices == null) {
            return promote?
                new PowerTriangle(expression, grouplikes.constant(1), null)
              : null;
        }
        return new PowerTriangle(...indices.map(
            index => index == null? null : expression.contents[index]
        ));
    }

    function to_expression(triangle) {
        const values = vertices.map(vertex => triangle[vertex]);
        const id = values.findIndex(vertex => vertex == null);
        if (id < 0 || values.filter(vertex => vertex == null).length !== 1) return null;

        return grouplikes[tag_for_id[id]](
            ...values.filter(vertex => vertex != null)
        );
    }

    /* Returns whether the expression for the given attribute 
    are the same in the left and right triangles*/
    function same(left, right, vertex) {
        const compared = vertex == null? vertices : [vertex];
        return compared.every(name => {
            const a = left[name];
            const b = right[name];
            if (a == null || b == null) return a == b;
            return expression_shape.encode(a) === expression_shape.encode(b);
        });
    }

    // Returns the PowerTriangle attribute that is being computed by the triangle.
    function computed(triangle) {
        const id = vertices.findIndex(vertex => triangle[vertex] == null);
        return id < 0? null : vertices[id];
    }

    /* Returns the two PowerTriangle attributes that form the contents of the equivalent Expression. */
    function inputs(triangle) {
        return freeze(vertices.filter(vertex => triangle[vertex] != null));
    }

    /* Returns the remaining PowerTriangle attribute that is neither `first` nor `second` */
    function other(first, second) {
        return vertices.find(vertex => vertex !== first && vertex !== second) || null;
    }

    return freeze({
        BASE,
        EXPONENT,
        RESULT,
        from_expression,
        to_expression,
        computed,
        inputs,
        same,
        other,
    });
};
