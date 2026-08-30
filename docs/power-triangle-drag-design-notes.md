# Power Triangle Drag Architecture

## Purpose

The power-triangle subsystem should let xcraft perform power, root, and logarithm manipulations while preserving the architectural rule that mathematical objects represent genuine mathematical structure rather than serving merely as programmatic drag hooks.

The central separation is:

- **Mathematical structures** describe valid algebraic relationships.
- **Drag resolution** determines which enabled mathematical interpretation applies to a user gesture.
- **Equations** performs generic tree/equation rewriting.
- **Views** remain concerned only with notation.

A drag may have several mathematically valid interpretations. The system should evaluate enabled interpretations and apply the drag only when exactly one distinct changed result remains.

---

## 1. Power triangle

A power triangle represents

\[
\text{base}^{\text{exponent}}=\text{result}.
\]

The vertices are:

```js
const BASE = 'base';
const EXPONENT = 'exponent';
const RESULT = 'result';
```

The three projections are:

```text
pow(base, exponent)       -> result
log(base, result)         -> exponent
root(exponent, result)    -> base
```

Each projection has metadata:

```js
pow: {
    computed: RESULT,
    children: [BASE, EXPONENT],
}

log: {
    computed: EXPONENT,
    children: [BASE, RESULT],
}

root: {
    computed: BASE,
    children: [EXPONENT, RESULT],
}
```

This metadata lets a drag determine triangle vertices directly from an expression type and child path.

---

## 2. Law lookup

A power-triangle law is identified by:

1. its law family;
2. the fixed vertex;
3. the computed vertex.

Conceptually:

```text
<family>:<fixed>:<computed>
```

Examples:

```text
same:base:result
same:base:exponent

inverse:base:result
inverse:base:exponent
```

The computed vertex distinguishes an ordinary law from its mirrored or “co-” form, so no separate `co_same` or `co_inverse` bit is required.

---

## 3. Sameness laws

Sameness laws support the two drag orientations historically called **combine** and **distribute**.

### Fixed base

```text
same:base:result

x^a * x^b
    <-> x^(a+b)
```

and its mirrored projection:

```text
same:base:exponent

log_x(a) + log_x(b)
    <-> log_x(ab)
```

### Fixed exponent

```text
same:exponent:result

a^x * b^x
    <-> (ab)^x
```

and:

```text
same:exponent:base

root_x(a) * root_x(b)
    <-> root_x(ab)
```

### Fixed result

Define harmonic addition:

\[
x\parallel y
=
\frac{1}{1/x+1/y}.
\]

Then:

```text
same:result:base

root_x(a) * root_y(a)
    <-> root_(x||y)(a)
```

and:

```text
same:result:exponent

log_x(a) || log_y(a)
    <-> log_(xy)(a)
```

The operations associated with a fixed vertex can therefore be represented as mathematical data:

```js
const sameness_operations = {
    base: {
        exponent: add,
        result: mul,
    },

    exponent: {
        base: mul,
        result: mul,
    },

    result: {
        base: mul,
        exponent: harmonic,
    },
};
```

---

## 4. Combine and distribute

`combine` and `distribute` are not independent mathematical properties.

They are opposite traversals of one sameness equality.

For:

\[
a^ba^c=a^{b+c},
\]

a combine gesture performs:

```text
a^b * a^c
    -> a^(b+c)
```

while a distribute gesture performs:

```text
a^(b+c)
    -> a^b * a^c
```

Both operations should independently derive the same key:

```text
same:base:result
```

This is an important implementation invariant.

---

## 5. Finding a combine key

Consider:

```text
a^b * a^c
```

Both children are projections computing `RESULT`.

Their triangle coordinates are:

```text
a^b:
    base = a
    exponent = b

a^c:
    base = a
    exponent = c
```

The possible fixed vertices are the two non-computed vertices.

Comparison finds:

```text
base:
    a == a       yes

exponent:
    b == c       no
```

Therefore:

```text
fixed = base
computed = result
```

and lookup is:

```js
sameness.get('base:result')
```

The parent operation must also agree with the operation associated with the computed coordinate. Here that is multiplication.

No global traversal over all laws is necessary to find this interpretation.

---

## 6. Finding a distribute key

Consider:

```text
a^(b+c)
```

The parent is a `pow` projection:

```text
computed = result
child 0 = base
child 1 = exponent
```

Dragging the base across the exponent therefore gives:

```text
fixed = base
computed = result
```

and directly selects:

```js
sameness.get('base:result')
```

The law knows that the free exponent coordinate uses addition, so `b+c` can be decomposed and the result coordinate uses multiplication:

```text
a^(b+c)
    -> a^b * a^c
```

Likewise:

```text
(ab)^c
```

with the exponent dragged across the base derives:

```text
fixed = exponent
computed = result
```

and therefore:

```text
same:exponent:result
```

producing:

```text
a^c * b^c
```

---

## 7. Promotion

Lower-ranked expressions may participate through mathematically justified degenerate triangle representations.

For result-producing powers:

\[
x=x^1.
\]

Therefore:

```text
x     -> x^1
3     -> 3^1
(a+b) -> (a+b)^1
```

may be used internally by the triangle adapter without rewriting the AST first.

This allows:

```text
x * x^2
    -> x^(1+2)
```

and:

```text
3 * 3^2
    -> 3^(1+2)
```

through exactly the same law.

Promotion should be explicit and limited. Arbitrary expressions should not automatically be interpretable as every possible triangle projection.

---

## 8. Inverse laws

Inverse relationships use the same fixed/computed lookup scheme.

Examples include:

```text
inverse:base:result

a^log_a(b)
    <-> b
```

and:

```text
inverse:base:exponent

log_a(a^b)
    <-> b
```

Similarly:

```text
inverse:exponent:result
inverse:exponent:base
inverse:result:base
inverse:result:exponent
```

cover the root/log mirrored cases.

Inverse laws naturally correspond to the user operations **append** and **cancel**.

---

## 9. Inverse operations may remove structure

A cancellation drag is allowed to make matching inverse structure disappear.

For example:

```text
a^log_a(b)
    -> b
```

or:

```text
log_a(a^b)
    -> b
```

This disappearance is the mathematical result of the inverse relationship, not an auto-simplification.

Consequently, a gesture that visually resembles “combining” two pieces may actually resolve to an inverse cancellation law.

Gesture classification and mathematical interpretation should therefore remain separate.

---

## 10. Equation balancing through inverse lookup

Consider:

```text
a^b = c
```

Dragging `a` across the equality gives:

```text
parent projection = pow
computed = result
source vertex = base
```

Therefore:

```text
inverse:base:result
```

applies.

Removing the fixed base leaves:

```text
b
```

while reconstructing the missing exponent coordinate on the other side gives:

```text
log_a(c)
```

so:

\[
b=\log_a c.
\]

Dragging `b` instead gives:

```text
inverse:exponent:result
```

and produces:

\[
a=\sqrt[b]{c}.
\]

`Equations` should not contain special cases for logs or roots; the projection metadata determines the missing coordinate.

---

## 11. Proposed classes

The implementation should use a small number of reusable mathematical objects rather than one class per equality.

```text
power/
    PowerTriangle.js
    PowerTriangles.js
    PowerTriangleSameness.js
    PowerTriangleInverse.js
    PowerTriangleLaws.js
```

### `PowerTriangle`

Represents named coordinates:

```js
PowerTriangle({
    base,
    exponent,
    result,
    computed,
})
```

### `PowerTriangles`

Maps Expressions to and from triangle representations.

Likely operations include:

```js
from_expression(expression)
as(expression, computed)
create(computed, vertices)
other(vertex_a, vertex_b)
```

### `PowerTriangleSameness`

Represents:

```js
{
    fixed,
    computed,
}
```

and implements the two directions of its equality:

```js
combine(...)
distribute(...)
```

### `PowerTriangleInverse`

Likewise represents:

```js
{
    fixed,
    computed,
}
```

and supports:

```js
append(...)
cancel(...)
```

### `PowerTriangleLaws`

Provides lookup maps:

```js
sameness.get('base:result')
sameness.get('base:exponent')
...

inverse.get('base:result')
inverse.get('base:exponent')
...
```

These objects can be generated from the three vertices rather than handwritten individually.

---

## 12. Ambiguity

Some gestures have genuinely multiple mathematical interpretations.

For example:

\[
a^ca^c
\]

can validly become:

\[
a^{c+c}
\]

through same-base combination, or:

\[
(aa)^c
\]

through same-exponent combination.

Rather than hiding this ambiguity behind a permanent dispatch priority, xcraft should use a general interpretation-resolution policy.

For one gesture:

1. Find all structurally plausible interpretations.
2. Restrict them to currently enabled operations/law families.
3. Evaluate each interpretation.
4. Discard `null` results.
5. Discard unchanged results.
6. Deduplicate structurally identical results.
7. If exactly one distinct changed result remains, apply it.
8. Otherwise return a no-op.

Conceptually:

```js
const results = interpretations
    .filter(is_enabled)
    .map(apply)
    .filter(changed)
    .deduplicate();

return results.length === 1?
    results[0] :
    original;
```

This policy does not require every individual matcher to be globally unique.

---

## 13. Operation controls

Existing Add/Multiply controls provide a precedent for controlling ambiguity.

Future controls may enable or disable interpretations such as:

```text
scale
power
power-triangle sameness
power-triangle inverse
```

or finer-grained operations if actual levels require them.

The UI controls which mathematical interpretations are enabled. Model code should not depend on toolbar widgets themselves.

This makes an otherwise ambiguous drag usable when the player explicitly selects the intended algebraic mode.

---

## 14. Interaction with existing structures

### `ScaleExpressions`

Should retain genuine additive/multiplicative relationships such as:

\[
a(b+c)\leftrightarrow ab+ac.
\]

### `PowerExpressions`

Should remain where it represents genuine multiplication/exponent structure, including unary multiplicative inverse behavior if that remains mathematically coherent.

It should not accumulate functions merely because `Equations` needs another callback.

### Power-triangle structures

Handle relationships that arise naturally from the three-coordinate power relation and its projections.

---

## 15. Collision policy

A drag may eventually be interpretable through several systems:

```text
Grouplike
ScaleExpressions
PowerExpressions
PowerTriangleSameness
PowerTriangleInverse
```

This is acceptable.

All enabled interpretations should be evaluated.

If several systems return the **same transformed equation**, deduplicate the result and proceed.

If they return **different transformed equations**, the drag is ambiguous and should be a no-op unless operation controls restrict the enabled set enough to leave one interpretation.

This is preferable to silently selecting whichever implementation happened to run first.

---

## 16. Harmonic addition

The same-result laws require:

\[
x\parallel y=
\frac1{1/x+1/y}.
\]

In the current AST, the two operands of this expression are not naturally siblings.

Two designs are possible:

### First-class operation

Represent:

```js
harmonic([x, y])
```

as a real mathematical expression operation and render it as reciprocal addition.

This is defensible because harmonic addition is itself an associative and commutative mathematical operation.

### Semantic-span matching

Keep it desugared into reciprocal/add/reciprocal syntax and teach drag handling to identify the larger semantic structure.

This is substantially more complicated.

If full symmetry of same-result drags is implemented, first-class harmonic addition is currently the cleaner candidate.

---

## 17. Dispatch flow

The intended architecture is approximately:

```text
EquationDragOperations
        |
        | gesture + enabled interpretations
        v
Interpretation resolver
        |
        +-- Grouplike
        +-- ScaleExpressions
        +-- PowerExpressions
        +-- PowerTriangleSameness
        +-- PowerTriangleInverse
        |
        v
distinct changed results
        |
        +-- 0 results -> no-op
        |
        +-- 1 result  -> apply
        |
        +-- >1 results -> ambiguous -> no-op
```

The resolver is intentionally programmatic.

The mathematical structures it queries are not.

---

## 18. Initial implementation sequence

1. Add the three power-triangle vertex constants and projection metadata.
2. Add `PowerTriangles` support for `pow`.
3. Implement only `same:base:result`.
4. Verify:
   - `a^b * a^c -> a^(b+c)`
   - `a^(b+c) -> a^b * a^c`
   both derive the same law lookup.
5. Introduce the general interpretation collector and unique-result resolver.
6. Add `same:exponent:result`.
7. Add `log` as a triangle projection.
8. Add:
   - `a^log_a(b) -> b`
   - `log_a(a^b) -> b`
9. Connect inverse relationships to equation append/cancel behavior.
10. Add `root`.
11. Add the remaining mirrored inverse and sameness laws.
12. Decide whether harmonic addition becomes a first-class expression before implementing same-result combination.
13. Add operation-family controls only when actual ambiguity requires them.

---

## Architectural invariants

- Mathematical classes represent real algebraic structure, not dispatcher hooks.
- `combine` and `distribute` are opposite orientations of one sameness equality.
- `append` and `cancel` arise from one inverse relationship.
- Inverse cancellation may legitimately delete nested expression structure.
- Law identity comes from triangle vertices rather than raw AST type-pair names.
- `co_same` and `co_inverse` are produced by changing the computed vertex.
- Degenerate promotion such as \(x=x^1\) is allowed only where mathematically justified.
- Constants use the same triangle machinery as variables.
- All enabled interpretations of an ambiguous gesture are evaluated.
- Only one distinct changed result permits a drag.
- Identical results from multiple interpretations are deduplicated.
- UI operation controls may restrict the enabled interpretation set.
- Overlap between `ScaleExpressions`, `PowerExpressions`, and power-triangle laws is allowed and resolved explicitly.
- `Equations` remains free of power/log/root-specific algebra.
- Views remain responsible for presentation.
- Auto-simplification happens after the algebraic drag and does not determine which law applied.