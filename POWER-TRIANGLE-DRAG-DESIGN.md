# Power Triangle Drag Architecture

## Purpose

This document records the intended architecture for integrating power-triangle mathematics into xcraft without turning mathematical structures into programmatic drag hooks.

The core design principle is:

> Mathematical objects should describe real algebraic structure. Drag dispatch should be explicitly programmatic and should derive or test interpretations against those structures.

The power-triangle work must coexist with the existing `Grouplike`, `ScaleExpressions`, `Powers`, and `Ringlike` architecture. It should not force mathematical structures to acquire methods solely because `Equations` needs somewhere to dispatch a drag.

---

## 1. Power triangle representation

A power triangle represents the ternary relation

```text
base ^ exponent = result
```

with three named vertices:

```js
const BASE = 'base';
const EXPONENT = 'exponent';
const RESULT = 'result';
```

The three projections are:

```text
pow(base, exponent)  -> result
log(base, result)    -> exponent
root(exponent, result) -> base
```

Conceptually, each expression form declares:

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

The ordering of `children` is important because it provides a deterministic priority when more than one vertex can be interpreted as fixed.

Explicit `log` and `root` expression types are desirable if the complete triangle symmetry is implemented. They make vertex lookup and drag interpretation direct rather than requiring syntactic inference from reciprocal powers.

---

## 2. Mathematical law families

Power-triangle laws are organized by:

1. the **family** of the law;
2. the **fixed vertex**;
3. the **computed vertex**.

The computed vertex determines whether the law is the ordinary or mirrored/co- form. Therefore `co_*` does not need to be encoded separately in a lookup key.

A canonical lookup key is:

```text
<family>:<fixed vertex>:<computed vertex>
```

Examples:

```text
same:base:result
same:base:exponent
inverse:base:result
inverse:base:exponent
```

### 2.1 Sameness family

The six sameness laws are:

```text
same:base:result
    x^a * x^b <-> x^(a+b)

same:base:exponent
    log_x(a) + log_x(b) <-> log_x(ab)

same:exponent:result
    a^x * b^x <-> (ab)^x

same:exponent:base
    root_x(a) * root_x(b) <-> root_x(ab)

same:result:base
    root_x(a) * root_y(a) <-> root_(x||y)(a)

same:result:exponent
    log_x(a) || log_y(a) <-> log_(xy)(a)
```

where harmonic addition is

```text
x || y = 1 / (1/x + 1/y)
```

The sameness laws handle the user operations historically called **combine** and **distribute**.

- `combine` traverses the expanded side of a sameness equality toward the contracted side.
- `distribute` traverses the contracted side toward the expanded side.

These are user-operation orientations of one reversible mathematical equality; they are not separate mathematical laws.

### 2.2 Inverse family

The six inverse laws are indexed the same way:

```text
inverse:base:result
    a^log_a(b) <-> b

inverse:base:exponent
    log_a(a^b) <-> b

inverse:exponent:result
    root_n(b)^n <-> b

inverse:exponent:base
    root_n(b^n) <-> b

inverse:result:base
    root_(log_b(a))(a) <-> b

inverse:result:exponent
    log_(root_b(a))(a) <-> b
```

The two directions are not separate `inverse` and `co_inverse` implementations; changing the computed vertex produces the mirrored law.

The inverse family naturally supports user interactions corresponding to **append** and **cancel**.

A crucial consequence is that a valid inverse/cancellation drag may legitimately make part of an expression disappear. For example:

```text
log_a(a^b) -> b
```

or

```text
a^log_a(b) -> b
```

The disappearance of the matching inverse structure is not a special simplification step. It is the direct result of the inverse law.

This means cancellation may often be discovered during a drag otherwise classified as a combination-like gesture. The drag engine should therefore distinguish gesture classification from the mathematical law that ultimately applies.

---

## 3. Operations associated with fixed vertices

For each fixed vertex, the other two coordinates are related by mutually inverse maps and corresponding operations.

A compact mathematical table is:

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

Interpretation:

- fixed base: addition of exponents corresponds to multiplication of results;
- fixed exponent: multiplication of bases corresponds to multiplication of results;
- fixed result: multiplication of bases corresponds to harmonic addition of exponents.

This table is mathematical data, not drag dispatch logic.

---

## 4. Proposed code objects

The initial implementation should favor a small number of generic mathematical objects rather than one class per equality.

Suggested files:

```text
power/
    PowerTriangle.js
    PowerTriangles.js
    PowerTriangleSameness.js
    PowerTriangleInverse.js
    PowerTriangleLaws.js
```

### 4.1 `PowerTriangle`

Represents one triangle or triangle interpretation:

```js
PowerTriangle({
    base,
    exponent,
    result,
    computed,
})
```

`computed` identifies which vertex is represented by the original expression projection.

A triangle may contain a projected expression rather than three independently stored AST nodes; the exact storage can remain minimal as long as all named coordinates can be queried.

### 4.2 `PowerTriangles`

Responsible for mapping between `Expression` and triangle coordinates.

Likely responsibilities:

```js
from_expression(expression)
as(expression, computed_vertex)
create(computed_vertex, vertices)
other(vertex_a, vertex_b)
```

`create()` constructs the appropriate expression projection:

```text
computed RESULT   -> pow(base, exponent)
computed EXPONENT -> log(base, result)
computed BASE     -> root(exponent, result)
```

`as(expression, RESULT)` may promote an arbitrary ordinary expression to the degenerate power

```text
x -> x^1
```

without rewriting the AST first.

This promotion must apply to constants as well as variables and compound expressions:

```text
x     -> x^1
3     -> 3^1
(a+b) -> (a+b)^1
```

Promotion should be explicit and limited to interpretations for which it is mathematically justified. It should not allow every expression to masquerade as every triangle projection.

### 4.3 `PowerTriangleSameness`

Represents one sameness law identified by:

```js
{
    fixed,
    computed,
}
```

It can derive the remaining free vertex using `PowerTriangles.other()` and obtain the corresponding operations from the fixed-vertex operation table.

It provides the two user-facing orientations:

```js
combine(left, right)
distribute(triangle_or_context)
```

Those methods are justified because they are the two directions of the *same equality* represented by the sameness object.

### 4.4 `PowerTriangleInverse`

Represents one inverse law identified by:

```js
{
    fixed,
    computed,
}
```

It supports the inverse-oriented user operations:

```js
append(...)
cancel(...)
```

Again, these are two directions/usages of one mathematical inverse relationship, not arbitrary callbacks.

### 4.5 `PowerTriangleLaws`

Contains lookup maps such as:

```js
sameness.get('base:result')
sameness.get('base:exponent')
...

inverse.get('base:result')
inverse.get('base:exponent')
...
```

The family is already known from the user operation being considered, so separate maps are likely cleaner than keys containing the family prefix.

The six objects in each map can be generated rather than handwritten:

```js
for (const fixed of vertices) {
    for (const computed of vertices) {
        if (fixed === computed) continue;
        ...
    }
}
```

---

## 5. Finding a sameness key for combine

Example:

```text
a^b * a^c
```

Both operands are parsed as triangle projections computing `RESULT`:

```text
a^b:
    computed = result
    base = a
    exponent = b

a^c:
    computed = result
    base = a
    exponent = c
```

Potential fixed vertices are the other two coordinates.

Compare them in the projection's declared child order:

```text
base:     a == a  -> applicable
exponent: b == c  -> not applicable
```

The selected key is therefore:

```text
base:result
```

under the sameness family.

The law's operation on the computed vertex must also agree with the actual AST parent operation. Here the computed/result operation is multiplication, matching the `mul` parent.

The lookup is then direct:

```js
const law = sameness.get('base:result');
const result = law.combine(left, right);
```

which produces:

```text
a^(b+c)
```

---

## 6. Finding a sameness key for distribute

Example:

```text
a^(b+c)
```

The user drags the base `a` across the exponent expression `b+c`.

From the parent projection:

```text
parent.type = pow
computed = result
source child 0 = base
source child 1 = exponent
```

Therefore the drag determines directly:

```text
fixed = base
computed = result
```

and hence the lookup key:

```text
base:result
```

The same law that combined

```text
a^b * a^c -> a^(b+c)
```

now distributes in the opposite direction:

```text
a^(b+c) -> a^b * a^c
```

This is an important design invariant:

> Combine and distribute should independently derive the same law key from opposite sides of the equality.

Another example:

```text
(ab)^c
```

Dragging `c` over the multiplicative base identifies:

```text
fixed = exponent
computed = result
```

so lookup is:

```text
same:exponent:result
```

and distribution produces:

```text
a^c * b^c
```

---

## 7. Finding an inverse key

Example equation:

```text
a^b = c
```

Dragging the base `a` across the equality gives, from the source path:

```text
parent projection = pow
computed = result
source vertex = base
```

Therefore:

```text
fixed = base
computed = result
```

and the inverse key is:

```text
base:result
```

The remaining triangle vertex is `exponent`.

Cancellation on the source side leaves:

```text
b
```

Appending the inverse projection to the target constructs:

```text
log_a(c)
```

so the equation becomes:

```text
b = log_a(c)
```

Dragging the exponent `b` instead gives:

```text
fixed = exponent
computed = result
```

and therefore:

```text
base = root_b(c)
```

No logarithm/root-specific branch should exist in `Equations`; the source projection and child index determine the fixed/computed vertices.

---

## 8. Direct inverse cancellation

Nested inverse projections can be recognized through the same coordinates.

Example:

```text
a^log_a(b)
```

Outer projection:

```text
computed = result
fixed candidate base = a
```

Inner projection:

```text
computed = exponent
base = a
result = b
```

The shared base identifies:

```text
inverse:base:result
```

and cancellation produces:

```text
b
```

Likewise:

```text
log_a(a^b) -> b
```

uses:

```text
inverse:base:exponent
```

This means inverse relationships can naturally remove entire nested structures during a combination/cancellation drag.

---

## 9. Ambiguity and interpretation policy

Not every drag has a mathematically unique interpretation.

Example:

```text
a^c * a^c
```

Both sameness interpretations are valid:

```text
same base:
    a^c * a^c -> a^(c+c)

same exponent:
    a^c * a^c -> (aa)^c
```

The desired default is the same-base result:

```text
a^(c+c)
```

but this should not require pretending the other interpretation is invalid.

### General ambiguity policy

The safer general policy is the same one already useful elsewhere in xcraft:

1. enumerate all **enabled** interpretations that are structurally plausible for the gesture;
2. evaluate each interpretation;
3. discard results that are `null` or return the original expression/equation unchanged;
4. deduplicate structurally identical results;
5. apply the drag only if exactly one distinct changed result remains;
6. otherwise return a no-op.

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

This removes the requirement that every matcher be globally unique.

### Operation controls

Ambiguity can be controlled by exposing one or more operation/law-family toggles in the UI, analogous to the existing Add/Multiply operation controls.

Examples of possible enabled families:

```text
scale
power
power-triangle sameness
power-triangle inverse
```

or more granular controls if later required.

The model should consume only the enabled mathematical interpretations, not depend directly on toolbar widgets.

---

## 10. Coexistence with existing algebra

The triangle operations must not silently override or compete unpredictably with the existing algebra.

### `ScaleExpressions`

`ScaleExpressions` continues to represent additive/multiplicative scaling relationships such as:

```text
a(b+c) <-> ab+ac
ax+bx <-> (a+b)x
```

### `Powers`

`Powers` owns the numeric-power decomposition used to represent multiplicative inverses. It now supplies the unary multiplicative `inverse` / `is_inverse` behavior consumed by `Ringlike` directly. Same-base combination, same-exponent distribution, and scalar composition are power-triangle laws rather than responsibilities of an intermediate expression wrapper.

### Collision handling

A drag may eventually be interpretable by:

- `Grouplike` local operation;
- `ScaleExpressions`;
- a power-triangle sameness/composition law;
- a power-triangle inverse law.

Rather than hard-code a permanent priority among all of them, the preferred direction is to expose their interpretations to a common resolver and apply the ambiguity policy above.

This gives a useful invariant:

> Existing and new structures may overlap mathematically. Overlap is acceptable as long as distinct resulting rewrites are detected explicitly rather than selected accidentally by dispatcher order.

If two structures return the same transformed equation, deduplication makes the overlap harmless.

If they return different equations, the gesture is ambiguous and should be a no-op unless operation controls disable all but one interpretation.

This is preferable to relying on accidental ordering such as:

```text
combine before distribute before swap
```

for fundamentally different mathematical interpretations.

Gesture-category priority may still be retained where the gestures themselves are distinct, but competing interpretations of one gesture should use explicit uniqueness resolution.

---

## 11. Harmonic addition

The same-result laws use harmonic addition:

```text
x || y = 1 / (1/x + 1/y)
```

If it remains desugared into ordinary `pow/add/pow` syntax, the operands are not siblings, making ordinary sibling-combination drags difficult to recognize.

Two possible approaches exist:

### First-class harmonic expression

Introduce a genuine operation such as:

```js
harmonic([x, y])
```

with the view rendering it using reciprocal notation.

This is mathematically defensible because harmonic addition is a real associative and commutative operation rather than a UI-only grouping construct.

### Semantic-span matching

Keep harmonic addition desugared and allow the drag matcher to recognize non-sibling semantic expression spans.

This is more complicated and should not be preferred unless first-class harmonic syntax causes other architectural problems.

Current preference: consider harmonic addition as a first-class mathematical operation if full same-result drag symmetry is required.

---

## 12. Proposed dispatch flow

The eventual high-level flow should look approximately like:

```text
EquationDragOperations
    |
    | gesture + enabled interpretations
    v
Equation/Expression operation resolver
    |
    +-- Grouplike interpretations
    +-- ScaleExpressions interpretations
    +-- Powers unary inverse interpretation
    +-- PowerTriangle sameness interpretations
    +-- PowerTriangle inverse interpretations
    |
    v
collect distinct changed results
    |
    +-- exactly 1 -> apply
    +-- 0         -> no-op
    +-- >1        -> ambiguous -> no-op
```

`Equations` should remain responsible for generic tree/equation rewriting and should not know specific power/log/root identities.

The resolver is explicitly programmatic. Mathematical structures are not required to masquerade as dispatchers.

---

## 13. Implementation order

A safe incremental implementation path is:

1. Add `PowerTriangle` vertex constants and projection metadata.
2. Add `PowerTriangles.from_expression()` / `create()` for `pow` only.
3. Implement `same:base:result` using the new representation.
4. Verify both user directions use the same law:
   - `a^b * a^c -> a^(b+c)`
   - `a^(b+c) -> a^b * a^c`
5. Introduce interpretation collection + uniqueness/no-op resolution before adding overlapping laws.
6. Add `same:exponent:result`:
   - `a^c * b^c <-> (ab)^c`
7. Add `log` projection and base-fixed inverse laws.
8. Add direct inverse cancellation:
   - `a^log_a(b) -> b`
   - `log_a(a^b) -> b`
9. Add `root` projection and exponent-fixed inverse laws.
10. Add the remaining mirrored sameness/inverse laws.
11. Decide whether harmonic addition becomes a first-class expression before implementing same-result combination drags.
12. Only after overlap exists in practice, add or extend operation-family UI controls needed to resolve ambiguities.

---

## 14. Architectural invariants

The following constraints should guide future changes:

- Mathematical classes must represent genuine algebraic structure, not exist solely to satisfy an `Equations` callback.
- `combine` and `distribute` are two directions of one sameness equality.
- `append` and `cancel` are two uses/directions of one inverse relationship.
- Inverse cancellation is allowed to remove nested expression structure directly.
- Power-triangle law keys are derived from semantic vertices, not raw `parent.type + child.type` strings.
- `co_same` and `co_inverse` are represented by changing the computed vertex, not by duplicating law families.
- Lower-ranked expressions may be promoted only through mathematically justified degenerate projections such as `x = x^1`.
- Constants must participate in the same promotion and law machinery as variables.
- Competing enabled interpretations are evaluated explicitly; a drag applies only when exactly one distinct changed result survives.
- Structurally identical results from multiple interpretations are deduplicated rather than treated as ambiguity.
- Operation-family controls may restrict which interpretations participate in ambiguity resolution.
- `ScaleExpressions` and power-triangle structures may overlap; overlap is resolved by result uniqueness, not accidental dispatcher priority.
- Views remain responsible only for notation/rendering.
- Auto-simplification remains a post-drag transformation and should not alter which mathematical law was applied.


## Implementation status — 2026-08-20

Implemented and passing the full algebra suite:

- `PowerTriangle` with `base`, `exponent`, `result`, and `computed` coordinates.
- `PowerTriangles` recognizes all three first-class projections:
  - `pow(base, exponent)` computes `result`;
  - `log(base, result)` computes `exponent`;
  - `root(exponent, result)` computes `base`.
- `PowerTriangles.create(BASE, ...)` now constructs `root(exponent, result)` directly rather than encoding the base projection as `result^(1/exponent)`.
- Explicit, law-controlled promotion of ordinary Expressions to the degenerate result projection `x = x^1`.
- `PowerTriangleSameness` as one reusable implementation parameterized by fixed/computed vertex and the operations on the two free coordinates.
- `same:base:result`:
  - `a^b * a^c -> a^(b+c)`
  - `a^(b+c) -> a^b * a^c`
- `same:exponent:result`:
  - `a^c * b^c -> (ab)^c`
  - `(ab)^c -> a^c * b^c`
- `PowerTriangleComposition` for the fixed-base/result projection:
  - `(a^b)^c -> a^(bc)`
  - `a^(bc) -> (a^b)^c`
  - n-ary multiplicative exponents distribute structurally as `a^(b*c*d) -> (a^b)^(c*d)`; commuting exponent factors first selects another equivalent nesting.
- Composition makes the previous `(a^b)^(1/b)` gap traversable: first compose to `a^(b*(1/b))`, then use the existing same-base inverse-factor combination inside the exponent. With auto-simplification the tested two-drag path reduces completely.
- `PowerTriangleInverse` for `inverse:exponent:result`:
  - cancelling the fixed exponent from `x^a` leaves `x`;
  - appending that exponent to a result `b` constructs `b^(1/a)`.
- Equation balancing now asks registered inverse laws before falling back to the legacy ringlike inverse path. Thus `x^2 = 9` can become `x = 9^(1/2)` and auto-simplify to `x = 3` without defining `Ringlike.inverse('pow', ...)`.
- Constant bases use the same implementation as symbolic bases.
- Same-base combination and power-of-product distribution are registered directly as power-triangle laws; no multiplicative expression wrapper duplicates them.
- Programmatic interpretation resolution deduplicates structurally identical results.
- Resolution distinguishes `none`, `resolved`, and `ambiguous`; an ambiguous combine/distribute blocks fallback to a lower-priority operation such as commute.
- Example genuine ambiguity: `a^c * a^c` has both same-base and same-exponent interpretations and therefore currently produces a no-op.
- Primitive `Grouplike` combination still has first refusal, so promoted triangle interpretations do not override identities/cancellation.
- Same-exponent combination does not promote arbitrary ordinary factors; this prevents `ab` from becoming the vacuous `(ab)^1`.

Current top-level gesture priority remains:

1. combine
2. distribute
3. commute

Within combine or distribute, mathematical interpretations are resolved as a set rather than by implementation order.

Current status against the explicitly tracked missing cases:

- `(a^b)^c`: implemented by `PowerTriangleComposition.combine`.
- `x^(ab)`: implemented by `PowerTriangleComposition.distribute`.
- `(a^b)^(1/b)`: composition is implemented and exposes the inverse exponent factors for a subsequent combination drag; the tested two-drag path completes.
- solve `x^a = b`: implemented through `inverse:exponent:result` and now constructs the explicit base projection `root(a, b)`.

Additional implementation completed:

- `log(base, result)` is now a first-class Expression operation and evaluates as `ln(result)/ln(base)`.
- `PowerTriangles` recognizes `log(base, result)` as the projection computing the exponent coordinate, with child vertices `[base, result]`.
- `PowerTriangles.create(EXPONENT, ...)` constructs `log(base, result)`.
- Fixed-base inverse laws are registered for both computed projections:
  - `inverse:base:result` supports `a^b = c <-> b = log_a(c)`.
  - `inverse:base:exponent` supports `log_a(c) = b <-> c = a^b`.
- Nested inverse cancellation is part of the combine stage. Dragging the matching fixed-base expressions together rewrites the smallest enclosing projection pair:
  - `a^log_a(b) -> b`
  - `log_a(a^b) -> b`
- Nested cancellation works regardless of which matching fixed-base occurrence is used as the drag source.
- Structurally mismatched fixed bases do not cancel.
- `log` rendering is supported in `ExpressionView` as `log_base(result)` and `ExpressionShape` treats log argument order as significant.
- `log` is enabled alongside `pow` as a local structural operation; Add/Multiply toolbar toggles do not disable it.
- The existing ScaleExpressions and multiplicative inverse tests remain green; nested inverse cancellation occupies a non-sibling drag geometry and does not collide with sibling scale operations.
- `same:base:exponent` is implemented through the same generic `PowerTriangleSameness` object:
  - `log_a(x) + log_a(y) -> log_a(xy)`
  - `log_a(xy) -> log_a(x) + log_a(y)`
- The mirrored same-base law is registered directly as a mathematical power-triangle law; no logarithm-specific combine/distribute matcher was added.
- A genuine overlap is now tested explicitly: `log_a(x)+log_a(x)` has both a ScaleExpressions interpretation (`2 log_a(x)`) and a triangle interpretation (`log_a(x*x)`), so the drag is a no-op while both interpretations are enabled.
- `inverse:result:exponent` is implemented: `log_x(a)=b -> x=a^(1/b)` by cancelling the fixed result and constructing the missing base projection.
- `PowerTriangleComposition` now supports the mirrored fixed-base/exponent projection as the same composition structure:
  - `c log_a(x) -> log_a(x^c)`
  - `log_a(x^c) -> c log_a(x)`
- The mirrored composition law is keyed `base:exponent`; no logarithm-specific rewrite class was introduced.
- A single law may now return multiple candidate interpretations. `ExpressionOperations.resolve` flattens and deduplicates those candidates before deciding `none`, `resolved`, or `ambiguous`.
- Example internal ambiguity: in `log_a(x) * log_b(y)`, either logarithm can occupy the scaled projection role, so the combine stage blocks the drag rather than silently choosing one orientation or falling through to commutation.

Known UI limitation:

- The traditional balance ghost can display a standalone additive or multiplicative inverse (`-a`, `1/a`). A fixed-base triangle inverse is instead a partial projection such as `log_a(□)`, whose completed Expression depends on the opposite equation side. Until partial/projection ghosts are modeled explicitly, these balance drags retain the ordinary source ghost even though the target and rewrite are correctly advertised.

Step 7 implementation completed:

- `harmonic` is now a first-class associative/commutative `Grouplike` operation with no finite identity. It evaluates as `1 / sum(1/x_i)` and renders as the corresponding reciprocal-of-reciprocals expression.
- `same:result:exponent` is implemented by the existing generic `PowerTriangleSameness` with fixed vertex `result`, computed vertex `exponent`, base operation `mul`, and exponent operation `harmonic`.
- The two user-facing directions are now playable:
  - `log_x(a) || log_y(a) -> log_(xy)(a)`
  - `log_(xy)(a) -> log_x(a) || log_y(a)`
- The first-class harmonic representation is tested against the desugared `(1/u + 1/v)^-1` form and for associativity/commutativity.
- Add/Multiply toolbar toggles preserve `harmonic`, as they already preserve unrelated `pow` and `log` operations.

Step 8 implementation completed:

- `PowerTriangleComposition` now takes an explicit `(fixed, computed)` vertex pair instead of assuming the fixed vertex is always the base.
- `composition:result:exponent` is implemented:
  - `log_(a^c)(x) -> (1/c) log_a(x)` by dragging the fixed result across the powered base.
  - `(1/c) log_a(x) -> log_(a^c)(x)` is registered as a valid result-fixed composition interpretation.
- The result-fixed combine matcher recognizes the canonical expanded form only when the scalar coefficient is structurally multiplicative-inverse (`1/c`). This prevents the new law from making ordinary `c log_a(x)` ambiguous with the already implemented base-fixed composition mirror.
- The reverse reciprocal-coefficient drag remains genuinely ambiguous through the full resolver because `(1/c)log_a(x)` also satisfies the base-fixed law `log_a(x^(1/c))`. It therefore returns a no-op until operation-family controls choose one interpretation.
- The roadmap level `log_(2^3)(x) -> (1/3)log_2(x)` is now playable through the public drag API.

Step 9 root projection completed:

- `root(exponent, result)` is a first-class Expression/Grouplike operation and is the base projection of a `PowerTriangle`.
- `PowerTriangles.as(expression, BASE)` and `PowerTriangles.create(BASE, ...)` are now symmetric with the existing result and exponent projections.
- `same:exponent:base` works generically: `root_n(x) root_n(y) <-> root_n(xy)`.
- `same:result:base` works generically: `root_x(a) root_y(a) <-> root_(x||y)(a)`.
- `inverse:exponent:base` and `inverse:result:base` required registration only; `PowerTriangleInverse` itself was unchanged.
- Together with the already implemented result/exponent projections, all six inverse/co-inverse nesting identities are now representable through the same cancellation machinery:
  - `a^log_a(b) -> b`
  - `log_a(a^b) -> b`
  - `(root_n(b))^n -> b`
  - `root_n(b^n) -> b` under the active domain assumptions
  - `log_(root_n(a))(a) -> n`
  - `root_(log_b(a))(a) -> b`
- Existing root-oriented levels were migrated from reciprocal-power syntax to explicit root projections and continued to solve through the public drag API.

Next milestone:

1. Add property-generated symmetry tests across the completed projection/law matrix.
2. Consider the two remaining root-side scalar/composition projections now that `computed=BASE` is first-class.
3. Revisit operation-family UI controls for the concrete ambiguities accumulated during implementation.


## PowerExpressions removal audit — 2026-08-20

`PowerExpressions` has been removed.

Its former responsibilities resolved as follows:

- multiplicative reciprocal representation and detection -> `Powers.inverse` / `Powers.is_inverse`, exposed through `Ringlike` under `mul`;
- same-base combination -> `PowerTriangleSameness(base, result)`;
- same-exponent distribution -> `PowerTriangleSameness(exponent, result)`;
- mirrored sameness and scalar composition -> the corresponding registered power-triangle laws;
- law aggregation -> the explicit `ExpressionOperations.laws` registry.

`Ringlike` now tolerates providers that implement only the operations that are mathematically meaningful for them. `Powers` therefore supplies unary multiplicative inverse behavior without pretending to provide scale-like `combine` or `distribute` methods. `ScaleExpressions` was subsequently removed by the VectorLine consolidation described below.

The complete algebra test suite remains green after deleting `scripts/models/ringlike/PowerExpressions.js`. This confirms that the class had become an adapter/dispatcher rather than an independent mathematical structure.


## Level coverage — 2026-08-20

`Levels.js` now acts as both a playable demonstration suite and an executable
roadmap for power-triangle behavior.

New playable demonstrations added after logarithms became first-class:

- solve an exponent: `2^x = 8 -> x = log_2(8)`
- solve a logarithm: `log_2(x) = 3 -> x = 2^3`
- power/log cancellation: `2^log_2(x) -> x`
- log/power cancellation: `log_2(2^x) -> x`
- root common-exponent combination: `root_2(x) root_2(y) -> root_2(xy)`
- same-result root combination: `root_x(a) root_y(a) -> root_(x||y)(a)`

The first nine are exercised through the public drag API in `tests/algebra.test.js`; the three newly promoted demonstrations are:

- `log_a(x) + log_a(y) <-> log_a(xy)`
- the reverse split `log_a(xy) -> log_a(x) + log_a(y)`
- solve the logarithm base: `log_x(a) = b -> x = a^(1/b)`

The same-result harmonic-log levels are now playable through the first-class `harmonic` operation.

The reciprocal-scaling logarithm-base level is now playable:

- `log_(a^c)(x) -> (1/c)log_a(x)`

No logarithmic roadmap fixture currently remains. The base/root projection is now first-class, so further coverage can target the remaining root-side composition projections and architectural audit rather than representation gaps.

The composition-mirror levels are now playable:

- `log_a(x^c) -> c log_a(x)`
- `c log_a(x) -> log_a(x^c)`

These roadmap entries intentionally describe transformations ahead of their
implementation so each future law has a concrete user-facing target. Their
level context explicitly identifies them as roadmap functionality.

## Power-triangle inverse drag ghosts — 2026-08-20

Balance ghosts now portray power-triangle inverses as partial projections in the
view layer. A visible square marks the coordinate that will be supplied by the
opposite equation side; no placeholder `Expression` is introduced into the
model.

Examples:

```text
2^x = 8, drag 2     -> log_2(□)
2^x = 8, drag x     -> root_x(□)
log_2(x) = 3, drag 2 -> 2^□
log_x(8) = 3, drag 8 -> root_□(8)
root_2(x) = 3, drag 2 -> □^2
root_x(8) = 2, drag 8 -> log_□(8)
```

`EquationView` derives the fixed/computed vertices from `PowerTriangles`
projection metadata and asks `ExpressionView` to render the complementary
projection. The existing additive/multiplicative inverse ghosts are unchanged.
The ghost is shown only when the hovered equation side is an actually advertised
balance target, so a partial projection is never shown for an invalid drag.


## VectorLine consolidation — 2026-08-20

The power-triangle law classes and `ScaleExpressions` have now been replaced by
a single one-dimensional vector-space model plus an explicitly programmatic
compiler.

### Mathematical structures

Two `VectorLine` instances are wired:

```text
additive real line
    scalar addition       = add
    scalar multiplication = mul
    vector addition       = add
    vector zero           = 0
    scalar action         = multiplication-as-scaling

multiplicative positive-real line
    scalar addition       = add
    scalar multiplication = mul
    vector addition       = mul
    vector zero           = 1
    scalar action         = pow / log / root projections
    fixed-result scalar coordinate addition = harmonic
```

`VectorLine` explicitly records the four vector-space action axioms:

```text
1·v = v
(rs)·v = r·(s·v)
(r+s)·v = r·v + s·v
r·(u+v) = r·u + r·v
```

For the multiplicative line, vector `+` in those formulas is ordinary
multiplication, so these become the familiar exponent laws.

`PowerTriangles` is no longer a container for separately registered power
facts. It is the representation of the ternary scalar-action relation, with
three projections:

```text
pow(base, exponent)    -> result
log(base, result)      -> exponent
root(exponent, result) -> base
```

### Programmatic compilation

`LinearActionInterpretations` is deliberately not a mathematical structure. It
compiles a `VectorLine` into the concrete drag interpretations supported by the
current AST representation and canonical-form policy.

The multiplicative line generates exactly the former 15 hand-instantiated
objects:

```text
6 additivity/sameness projection views
6 projection inverse/round-trip views
3 scalar-composition projection views
```

The additive line currently generates two result-projection additivity views:
like-term combination and ordinary distribution. Because scalar and vector
values share the same Expression carrier on this line, the UI advertises one
canonical distribution orientation; the other vector-space axiom produces the
same mathematics but can differ in unsimplified presentation for identities such
as zero.

### Deleted adapters

The following files no longer exist:

```text
scripts/models/ringlike/ScaleExpressions.js
scripts/models/powertriangle/PowerTriangleSameness.js
scripts/models/powertriangle/PowerTriangleComposition.js
scripts/models/powertriangle/PowerTriangleInverse.js
```

Their behavior is generated from `VectorLine` instead.

`Ringlike` has also been reduced to unary inverse presentation only:

```text
inverse
is_inverse
absolute
```

It has no `combine`, `left_distribute`, `right_distribute`, or law-aggregation
hooks. Cross-operation mathematics is resolved exclusively through the explicit
interpretation registry in `ExpressionOperations`.

The full level/property suite passes with unchanged counts after this
consolidation, which is evidence that the deleted classes represented sampled
views of the same linear-action structure rather than independent mathematics.
