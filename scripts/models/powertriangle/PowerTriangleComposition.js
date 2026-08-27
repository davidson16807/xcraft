'use strict';

/*
Composition of a power-triangle projection with itself.

Computed result (power):
    (a^b)^c  <->  a^(bc)

Computed base (root):
    root_c(root_b(a))  <->  root_(bc)(a)

or, in triangle of power notation:


    c     (bc)
 b △  =  △
  △     a
 a


   c          (bc)
   △  b   =  △
     △         a
       a


In both cases exponent is the composition parameter. The projection's computed
value is fed back into its remaining input, so nested projections compose by
multiplying their exponents.

Using drags, each power law is implemented by two operations:
* a "combine" operation that combines triangles belonging to the same operation
* a "distribute" operation that distributes the matching vertex
  across elements of the other known vertex

*/
const PowerTriangleComposition = (triangles, grouplikes, expression_caveats) => {
    const exponent = 1;
    const computed_for_operation = Object.freeze({ root:0, pow:2 });

    function combine(type, left, right) {
        const computed = computed_for_operation[type];
        if (computed == null) return null;

        const recursive = triangles.other(computed, exponent);
        const vertices = [0, 1, 2].filter(vertex => vertex !== computed);
        const values = [null, null, null];
        values[vertices[0]] = left;
        values[vertices[1]] = right;
        const outer = new PowerTriangle(...values);
        const inner = triangles.from_expression(outer[recursive], false);
        if (inner == null || inner[computed] != null) return null;

        const result = triangles.to_expression(inner.with(
            exponent, grouplikes.mul([inner[exponent], outer[exponent]])
        ));
        return result == null? null : expression_caveats.inherit(result, left, right);
    }

    function _distribute(parent, source, target) {
        const triangle = triangles.from_expression(parent, false);
        if (triangle == null) return null;

        const computed = triangles.computed(triangle);
        if (computed == null || computed === exponent) return null;

        const recursive = triangles.other(computed, exponent);
        if (triangle[recursive] !== source || triangle[exponent] !== target) return null;
        if (target.type !== 'mul' || target.contents.length < 2) return null;

        const inner = triangles.to_expression(triangle.with(exponent, target.contents[0]));
        const outer_exponent = grouplikes.mul(target.contents.slice(1));

        const result = triangles.to_expression(
            triangle.with(recursive, inner).with(exponent, outer_exponent)
        );
        return result == null? null : expression_caveats.inherit(result, parent, source, target);
    }

    function left_distribute(parent, left, right) {
        return _distribute(parent, left, right);
    }

    function right_distribute(parent, left, right) {
        return _distribute(parent, right, left);
    }

    return Object.freeze({
        combine,
        left_distribute,
        right_distribute,
    });
};
