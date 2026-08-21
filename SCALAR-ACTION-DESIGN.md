# Scalar Action Architecture

## Status

This document describes the first implemented scalar-action refactor. It supersedes the earlier plan to hand-instantiate separate power-triangle sameness/composition law objects for every vertex orientation.

The implementation deliberately stops before adding `log`, `root`, harmonic addition, or nested composition drags. Its purpose is to prove that the existing scale and power drag laws can be generated from one executable mathematical structure while preserving the current game.

## Mathematical structure

A `ScalarAction` represents a one-dimensional vector space at the Expression level.

It is configured by:

- scalar addition;
- scalar multiplication;
- vector addition;
- scalar action `act(scalar, vector)`.

It exposes executable versions of the four scalar-action/vector-space laws:

1. scalar identity
   `1·v = v`
2. scalar composition
   `(ab)·v = a·(b·v)`
3. scalar distributivity
   `(a+b)·v = a·v + b·v`
4. vector distributivity
   `a·(u+v) = a·u + a·v`

The symbols `+`, multiplication, and `·` above refer to the operations configured for the particular scalar action.

### Ordinary scaling

For `ScaleExpressions`:

- scalar addition: expression `add`;
- scalar multiplication: expression `mul`;
- vector addition: expression `add`;
- action: multiplication, `act(a,x) = ax`.

This is `(R,+)` as a one-dimensional vector space over itself.

### Exponentiation

For `PowerExpressions`:

- scalar addition: expression `add`;
- scalar multiplication: expression `mul`;
- vector addition: expression `mul`;
- action: exponentiation, `act(a,x) = x^a`.

On the intended positive-real domain this is `(R>0,×)` as a one-dimensional real vector space.

The four generic laws become:

- `x^1 = x`;
- `(x^b)^a = x^(ab)`;
- `x^(a+b) = x^a x^b`;
- `(xy)^a = x^a y^a`.

## Code

### `ScalarAction.js`

`ScalarAction` contains no drag-path knowledge. It constructs both sides of each mathematical law from Expressions.

The current public law functions are:

```js
scalar_identity(vector)
scalar_composition(outer, inner, vector)
scalar_distributivity(scalars, vector)
vector_distributivity(scalar, vectors)
```

Each returns an immutable pair:

```js
{
    expanded,
    contracted,
}
```

This makes law direction a property of the user operation rather than a separate mathematical fact.

### `ScalarActionExpressions.js`

This is the Expression matcher/adapter for a `ScalarAction`.

It currently exposes candidate rewrites for the two distributive axioms because those correspond to the existing sibling combine/distribute gesture model:

```js
combine_candidates(parent_type, left, right)
distribute_candidates(parent, left, right, source_is_left)
```

It does not choose among conflicting mathematical interpretations.

The scalar-identity law continues to be handled by existing `Grouplike` identity machinery.

The scalar-composition law is executable in `ScalarAction`, but it is not yet wired to drags because the current `EquationDragOperations` rejects ancestor/descendant drags. That interaction needs to be designed before composition is exposed to players.

## Generated combine interpretations

For a scalar action, both distributive laws have a reverse/combine direction.

### Same vector

If two vector-sum siblings decompose as

```text
a·v
b·v
```

then scalar distributivity produces

```text
(a+b)·v
```

For powers this is the same-base law:

```text
x^a * x^b -> x^(a+b)
```

Unlike the previous `Powers` implementation, exponent scalars may now be arbitrary Expressions rather than only numeric constants.

### Same scalar

If two vector-sum siblings decompose as

```text
a·u
a·v
```

then vector distributivity produces

```text
a·(u+v)
```

For powers this is the same-exponent law:

```text
x^a * y^a -> (xy)^a
```

For ordinary scaling this also provides common-coefficient factoring when the current scale decomposition can identify the coefficient.

## Generated distribute interpretations

A distribution drag identifies one sibling as the source and the other as the target being expanded.

If the target occupies the scalar role and is a scalar-add expression, scalar distributivity is used.

For powers:

```text
x^(a+b) -> x^a * x^b
```

If the target occupies the vector role and is a vector-add expression, vector distributivity is used.

For powers:

```text
(xy)^a -> x^a * y^a
```

For scaling:

```text
a(x+y) -> ax + ay
```

The scale action permits both multiplication factors to be interpreted as scalar/vector because ordinary multiplication is commutative. Those two interpretations often produce the same expression with reversed factor order; `ExpressionShape` deduplicates them before ambiguity is decided.

## Candidate resolution and ambiguity

Mathematical structures return candidate replacement Expressions.

`Equations` installs every candidate into the complete equation tree before deciding whether the gesture is valid.

For a combine gesture it considers:

- the local `Grouplike` result;
- all registered scalar/ring-like candidate results.

For distribution it considers all registered relation candidates.

The algorithm is:

1. apply every candidate to the complete tree;
2. discard results structurally identical to the original equation;
3. deduplicate identical resulting equations;
4. accept the gesture only when exactly one distinct changed equation remains;
5. otherwise return the original equation.

This implements the intended ambiguity rule instead of relying on dispatcher order.

Example:

```text
x^2 * x^2
```

has two changed scalar-action interpretations:

```text
x^(2+2)
```

and

```text
(xx)^2
```

With both interpretations enabled, the drag is therefore a no-op.

Future operation controls can restrict the candidate set before uniqueness resolution.

## Identity collisions

The scalar-action interpretation can overlap with ordinary group identities. These overlaps should deduplicate rather than become false ambiguities.

The implementation therefore normalizes the zero vector under scalar action:

For ordinary scaling:

```text
a·0 = 0
```

For the power vector space, whose vector zero is multiplicative identity `1`:

```text
1^a = 1
```

It also normalizes scalar identities such as `1·v = v` in the action constructors.

The generic vector operation folds ordinary group identities when generated laws construct a vector sum/product. This prevents algebraically identical candidates such as multiplication by `1` from appearing structurally distinct.

## `ScaleExpressions` and `PowerExpressions`

These names remain useful as concrete configurations of the generic structure.

They now primarily provide:

- a `ScalarAction` configuration;
- AST decomposition/pair interpretation;
- existing unary inverse/is-inverse behavior.

`PowerExpressions` no longer uses `Powers.combine()` for its combination law. Its scalar-action decomposition reads any `pow(base, exponent)` directly, so symbolic exponent Expressions participate naturally.

`Powers` remains in use for the existing unary reciprocal representation and can be reconsidered later.

## `Ringlike`

The experiment makes a remaining architectural seam explicit.

`Ringlike` currently has two responsibilities:

1. unary inverse lookup by operation (`add` -> ScaleExpressions, `mul` -> PowerExpressions);
2. programmatic collection/deduplication of candidate relation rewrites.

The second responsibility is not itself mathematical. If the scalar-action experiment survives further work, the candidate collection logic should likely move to an explicitly named operation/interpretation resolver, leaving `Ringlike` as mathematical coordination or removing it if no coherent role remains.

Compatibility `left_distribute` / `right_distribute` methods remain for existing direct callers. New equation rewrites use the plural candidate APIs rather than target-type dispatch.

## Current tests

The implementation preserves all ten existing level solutions and the existing property suite.

Focused tests additionally establish:

- symbolic same-base combination:
  `2^x * 2^3 -> 2^(x+3)`;
- scalar-distributive expansion:
  `2^(x+3) -> 2^x * 2^3`;
- same-exponent combination:
  `2^x * 3^x -> 6^x`;
- ambiguity rejection:
  `x^2 * x^2` is a no-op when both generated interpretations are enabled.

## Not yet implemented

The following are intentionally deferred:

- explicit `log` Expression projection;
- explicit `root` Expression projection;
- the power/action triangle coordinate abstraction;
- inverse/co-inverse cancellation between power/log/root projections;
- harmonic addition and same-result laws;
- composition drags such as `(x^a)^b <-> x^(ab)`;
- operation-family buttons for resolving genuinely ambiguous candidate sets;
- moving candidate resolution out of `Ringlike` into a dedicated resolver.

These should be added only after the current shared scalar-action structure is judged useful in actual code.
