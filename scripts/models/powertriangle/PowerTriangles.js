'use strict';
/*
Converts between the three Expression projections of base^exponent=result and
PowerTriangle coordinates. The nullish coordinate identifies the projection.
*/
const PowerTriangles = grouplikes => {
    const freeze = Object.freeze;

    // For each triangle vertex, gives the corresponding Expression contents
    // index. The null entry is the coordinate computed by that projection.
    const indices_for_tag = freeze({
        pow: freeze([0, 1, null]),
        log: freeze([0, null, 1]),
        root: freeze([null, 0, 1]),
    });

    // The missing triangle coordinate determines the projection tag:
    // base -> root, exponent -> log, result -> pow.
    const tag_for_id = freeze('root log pow'.split(' '));

    function from_expression(expression) {
        const indices = indices_for_tag[expression.type];
        if (indices == null) return null;

        const vertices = indices.map(index =>
            index == null? null : expression.contents[index]
        );
        return new PowerTriangle(...vertices);
    }

    function to_expression(triangle) {
        const vertices = [triangle.base, triangle.exponent, triangle.result];
        const missing = vertices
            .map((vertex, id) => vertex == null? id : null)
            .filter(id => id != null);
        if (missing.length !== 1) return null;

        const tag = tag_for_id[missing[0]];
        const contents = [];
        indices_for_tag[tag].forEach((index, id) => {
            if (index != null) contents[index] = vertices[id];
        });
        return grouplikes[tag](...contents);
    }

    return freeze({
        from_expression,
        to_expression,
    });
};
