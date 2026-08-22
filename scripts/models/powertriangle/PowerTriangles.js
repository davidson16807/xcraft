'use strict';
// HUMAN VETTED

/*
`PowerTriangles` describes operations, relations, and properties to and from `PowerTriangle`.
*/
const PowerTriangles = (grouplikes, expression_shape) => {
    const freeze = Object.freeze;
    const BASE = 0;
    const EXPONENT = 1;
    const RESULT = 2;
    const vertices = freeze([0, 1, 2]);
    const tag_for_vertex = freeze('root log pow'.split);

    function from_expression(expression, promote) {
        const computed = tag_for_vertex.indexOf(expression.type);
        if (computed < 0) {
            return promote?
                new PowerTriangle(expression, grouplikes.constant(1), null)
              : null;
        }

        const values = [...expression.contents];
        values.splice(computed, 0, null);
        return new PowerTriangle(...values);
    }

    function to_expression(triangle) {
        const computed = triangle.findIndex(vertex => vertex == null);
        if (computed < 0 || triangle.filter(vertex => vertex == null).length !== 1) return null;

        return grouplikes[tag_for_vertex[computed]](
            ...triangle.filter(vertex => vertex != null)
        );
    }

    /* Returns whether the Expressions at the selected vertex, or all vertices,
    are structurally the same in the left and right triangles. */
    function same(left, right, vertex) {
        const compared = vertex == null? vertices : [vertex];
        return compared.every(index => {
            const a = left[index];
            const b = right[index];
            if (a == null || b == null) return a == b;
            return expression_shape.encode(a) === expression_shape.encode(b);
        });
    }

    // Returns the index of the vertex being computed by the triangle.
    function computed(triangle) {
        const vertex = triangle.findIndex(value => value == null);
        return vertex < 0? null : vertex;
    }

    // Returns the two vertex indices that form the equivalent Expression's contents.
    function inputs(triangle) {
        return freeze(vertices.filter(vertex => triangle[vertex] != null));
    }

    // Returns the remaining vertex index that is neither `first` nor `second`.
    function other(first, second) {
        return vertices.find(vertex => vertex !== first && vertex !== second) ?? null;
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
