'use strict';
// HUMAN VETTED

/*
`PowerTriangles` describes operations, relations, and properties to and from `PowerTriangle`.
*/
const PowerTriangles = (grouplikes, expression_shape) => {
    const freeze = Object.freeze;
    const vertices = freeze([0, 1, 2]);

    /*
    For each triangle vertex, gives the child index of that value in the
    corresponding Expression projection. The null entry is the computed
    triangle vertex and therefore is absent from the Expression's contents.
    */
    const arguments_for_tag = freeze({
        pow: freeze([0, 1, null]),
        log: freeze([0, null, 1]),
        root: freeze([null, 0, 1]),
    });

    // Missing base -> root, missing exponent -> log, missing result -> pow.
    const tag_for_id = freeze('root log pow'.split(' '));

    function from_expression(expression, promote) {
        const args = arguments_for_tag[expression.type];
        if (args == null) {
            return promote?
                new PowerTriangle(expression, grouplikes.constant(1), null)
              : null;
        }
        return new PowerTriangle(...args.map(
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

    // Returns the PowerTriangle index computed by the triangle.
    function computed(triangle) {
        const computed = vertices.find(vertex => triangle[vertex] == null);
        return computed == null? null : computed;
    }

    /* Returns the two vertex indices that form the equivalent Expression's contents. */
    function inputs(computed) {
        return freeze(vertices.filter(vertex => vertex !== computed));
    }

    /* Returns the remaining PowerTriangle index that is neither `first` nor `second`. */
    function other(first, second) {
        const vertex = vertices.find(vertex => vertex !== first && vertex !== second);
        return vertex == null? null : vertex;
    }

    /* Returns the matching uncomputed vertices between left and right, or null if no such vertex exists.*/
    function matching(left, right) {
        return freeze(vertices.filter(vertex => {
            const a = left[vertex];
            const b = right[vertex];
            return a != null && b != null &&
                expression_shape.encode(a) === expression_shape.encode(b);
        }));
    }

    return freeze({
        from_expression,
        to_expression,
        computed,
        matching,
        inputs,
        other,
    });
};
