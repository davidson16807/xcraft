'use strict';

/*
`PowerTriangleSameness` handles laws on `Expression`s where 
there are multiple triangles of power sharing a matching vertex.

This consists of:

    x^a x^b = x^(a+b)
    log_x(a) + log_x(b) = log_x(ab)
    ᵃ√x ᵇ√x = ᵃ⊕ᵇ√x 

or, in triangle of power notation:


     a      b    (a+b)
    △  *  △  =  △ 
   x      x      x   


    △  +  △  =  △ 
   x  a   x  b   x  (a*b)


     a      b   (a⊕b)
    △  *  △  =  △ 
      x      x      x


and there are another 3 laws where triangles are mirrored.
Here, "⊕" indicates harmonic addition such that a⊕b = 1 / (1/a + 1/b).

Using drags, each power law is implemented by two operations:
* a "combine" operation that combines triangles belonging to the same operation
* a "distribute" operation that distributes the matching vertex
  across the operation of the other known vertex

Names for drags are chosen by analogy to drags for arithmetic.
*/
const PowerTriangleSameness = (triangles, grouplikes) => {

    // the operation associated with each vertex
    const affinities = [
        [null,  'add',     'mul'],
        ['mul',  null,     'mul'],
        ['mul', 'harmonic', null],
    ];

    function _combine(type, left, right, promote) {
        const a = triangles.from_expression(left, promote);
        const b = triangles.from_expression(right, promote);
        if (a == null || b == null) return null;
        if (promote &&
            triangles.from_expression(left, false) == null &&
            triangles.from_expression(right, false) == null) return null;

        const computed = triangles.computed(a);
        if (computed !== triangles.computed(b)) return null;

        const fixed = triangles.inputs(a).filter(vertex =>
            triangles.same(a, b, vertex) &&
            type === affinities[vertex][computed]
        );
        if (fixed.length === 0) return null;

        return fixed.map(vertex => {
            const varying = triangles.other(vertex, computed);
            return triangles.to_expression(a.with(
                varying,
                grouplikes[affinities[vertex][varying]]([
                    a[varying],
                    b[varying],
                ])
            ));
        });
    }

    function combine(type, left, right) {
        return _combine(type, left, right, false) || _combine(type, left, right, true);
    }

    function distribute(parent, source, target) {
        const triangle = triangles.from_expression(parent, false);
        if (triangle == null) return null;

        const computed = triangles.computed(triangle);
        if (computed == null) return null;

        const fixed = triangle.indexOf(source);
        const varying = triangle.indexOf(target);
        if (fixed < 0 || varying < 0) return null;
        if (target.type !== affinities[fixed][varying]) return null;

        return grouplikes[affinities[fixed][computed]](target.contents.map(term =>
            triangles.to_expression(triangle.with(varying, term))
        ));
    }

    return Object.freeze({
        combine,
        distribute,
    });
};
