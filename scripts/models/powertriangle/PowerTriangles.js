'use strict';

/*
`PowerTriangles` describes operations, relations, and properties to and from
`PowerTriangle`.
*/
const PowerTriangles = (grouplikes, expression_shape) => {
    const freeze = Object.freeze;
    const BASE = 'base';
    const EXPONENT = 'exponent';
    const RESULT = 'result';
    const vertices = freeze([BASE, EXPONENT, RESULT]);

    /*
    Maps each Expression type attributes to an array
    storing indices of Expression contents for each vertex 
    or null if the vertex is computed
    */
    const indices_for_tag = freeze({
        pow: freeze([0, 1, null]),
        log: freeze([0, null, 1]),
        root: freeze([null, 0, 1]),
    });

    // Maps computed index to Expression type attribute
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

    /* The attribute for which PowerTriangle[attribute] == null */
    function computed(triangle) {
        const id = vertices.findIndex(vertex => triangle[vertex] == null);
        return id < 0? null : vertices[id];
    }

    /* Coordinate names in the same order as the projection Expression's contents. */
    function inputs(triangle) {
        return freeze(vertices.filter(vertex => triangle[vertex] != null));
    }

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
