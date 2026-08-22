'use strict';

/*
`PowerTriangleSameness` handles laws where 
one vertex of the triangle of power stays the same.

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

Using drags, each power law is handled by two operations:
* a "combine" operation that combines triangles belonging to the same operation
* a "distribute" operation that decomposes a triangle to its component triangles

Names for drags are chosen by analogy to drags for arithmetic.
*/
const PowerTriangleSameness = (
    power_triangles,
    grouplikes,
    fixed,
    computed,
    other_operation,
    computed_operation,
    promote
) => {
    const other = power_triangles.other(fixed, computed);

    function combine(left, right) {
        const a = power_triangles.from_expression(left, promote);
        const b = power_triangles.from_expression(right, promote);
        if (a == null || b == null) return null;
        if (a[computed] != null || b[computed] != null) return null;
        if (!power_triangles.same(a, b, fixed)) return null;

        return power_triangles.to_expression(a.with(
            other,
            grouplikes[other_operation]([a[other], b[other]])
        ));
    }

    function distribute(parent, source, target) {
        const triangle = power_triangles.from_expression(parent, false);
        if (triangle == null || triangle[computed] != null) return null;
        if (triangle[fixed] !== source || triangle[other] !== target) return null;
        if (target.type !== other_operation) return null;

        return grouplikes[computed_operation](target.contents.map(term =>
            power_triangles.to_expression(triangle.with(other, term))
        ));
    }

    return Object.freeze({
        family: 'same',
        fixed,
        computed,
        other_operation,
        computed_operation,
        expanded_operation: computed_operation,
        promote,
        combine,
        distribute,
    });
};
