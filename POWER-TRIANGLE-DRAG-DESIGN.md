# Power Triangle Drag Architecture

## Purpose

This document records the intended architecture for integrating power-triangle mathematics into xcraft without turning mathematical structures into programmatic drag hooks.

The core design principle is:

> Mathematical objects should describe real algebraic structure. Drag dispatch should be explicitly programmatic and should derive or test interpretations against those structures.

The power-triangle work must coexist with the existing `Grouplike`, `ScaleExpressions`, and `PowerExpressions` architecture. It should not force `Ringlike` implementations to acquire methods solely because `Equations` needs somewhere to dispatch a drag.

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

## 10. Coexistence with existing `ScaleExpressions` and `PowerExpressions`

The new triangle operations must not silently override or compete unpredictably with the existing algebra.

The existing structures remain mathematically meaningful:

### `ScaleExpressions`

Represents additive/multiplicative scaling relationships such as:

```text
a(b+c) <-> ab+ac
ax+bx <-> (a+b)x
```

### `PowerExpressions`

Should be preserved where it represents genuine multiplication/exponent structure rather than being used merely as a drag dispatcher.

Existing behavior such as reciprocal/inverse representation can remain there if it forms a coherent multiplicative-power structure.

### Collision handling

A drag may eventually be interpretable by:

- `Grouplike` local operation;
- `ScaleExpressions`;
- `PowerExpressions`;
- power-triangle sameness;
- power-triangle inverse.

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
    +-- PowerExpressions interpretations
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
- `ScaleExpressions`, `PowerExpressions`, and power-triangle structures may overlap; overlap is resolved by result uniqueness, not accidental dispatcher priority.
- Views remain responsible only for notation/rendering.
- Auto-simplification remains a post-drag transformation and should not alter which mathematical law was applied.


## Implementation status — 2026-08-20

Implemented and passing the full algebra suite:

- `PowerTriangle` with `base`, `exponent`, `result`, and `computed` coordinates.
- `PowerTriangles` result projection for `pow(base, exponent)`.
- `PowerTriangles.create(BASE, ...)` can solve the base coordinate as `result^(1/exponent)` without requiring a first-class `root` Expression yet.
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
- Existing `PowerExpressions` same-base combination delegates to the triangle law.
- Existing `PowerExpressions` power-of-product distribution delegates to the same-exponent triangle law.
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
- solve `x^a = b`: implemented through `inverse:exponent:result`, currently rendering the root algebraically as `b^(1/a)`.

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
- The existing ScaleExpressions and PowerExpressions test suite remains green; nested inverse cancellation occupies a non-sibling drag geometry and did not collide with their sibling combine/distribute laws.
- `same:base:exponent` is implemented through the same generic `PowerTriangleSameness` object:
  - `log_a(x) + log_a(y) -> log_a(xy)`
  - `log_a(xy) -> log_a(x) + log_a(y)`
- The mirrored same-base law is registered as a mathematical law exposed by `PowerExpressions`; no logarithm-specific combine/distribute matcher was added.
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

Next milestone:

1. Address the remaining result-fixed logarithm sameness law, which requires harmonic addition: `log_x(a) || log_y(a) <-> log_(xy)(a)`.
2. Decide whether harmonic addition should become a first-class Expression operation or remain a structured projection over the existing reciprocal/add AST.
3. Then implement reciprocal scaling when the logarithm base is powered: `log_(a^c)(x) <-> (1/c)log_a(x)`.
4. Revisit whether a first-class `root` Expression adds enough interaction value beyond the existing `result^(1/exponent)` base projection.


## Level coverage — 2026-08-20

`Levels.js` now acts as both a playable demonstration suite and an executable
roadmap for power-triangle behavior.

New playable demonstrations added after logarithms became first-class:

- solve an exponent: `2^x = 8 -> x = log_2(8)`
- solve a logarithm: `log_2(x) = 3 -> x = 2^3`
- power/log cancellation: `2^log_2(x) -> x`
- log/power cancellation: `log_2(2^x) -> x`
- root-form common-exponent combination: `x^(1/2)y^(1/2) -> (xy)^(1/2)`
- same-result/root-form combination: `a^(1/x)a^(1/y) -> a^(1/x + 1/y)`

The first nine are exercised through the public drag API in `tests/algebra.test.js`; the three newly promoted demonstrations are:

- `log_a(x) + log_a(y) <-> log_a(xy)`
- the reverse split `log_a(xy) -> log_a(x) + log_a(y)`
- solve the logarithm base: `log_x(a) = b -> x = a^(1/b)`

Roadmap fixtures still record the unimplemented logarithmic mirrors:

- same-result harmonic-log combination
- reciprocal scaling when the logarithm base is powered

The composition-mirror levels are now playable:

- `log_a(x^c) -> c log_a(x)`
- `c log_a(x) -> log_a(x^c)`

These roadmap entries intentionally describe transformations ahead of their
implementation so each future law has a concrete user-facing target. Their
level context explicitly identifies them as roadmap functionality.
