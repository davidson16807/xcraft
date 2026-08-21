# Xcraft Power-Law Architecture Roadmap

> **Status:** Superseded by `POWER-TRIANGLE-DRAG-DESIGN.md`. This file is retained as historical design context; pair-key `mulpow`/`powmul` classes are no longer the active implementation roadmap.

> **Current architecture:** The later VectorLine consolidation supersedes the remaining `ScaleExpressions`/power-law-class plan. See `POWER-TRIANGLE-DRAG-DESIGN.md` for the implemented design.


## Purpose

This document records the intended algebra architecture for exponentiation and the implementation roadmap so future changes preserve the same design direction.

The central rule is that `Equations` should remain a generic equation/tree rewrite layer. Algebraic laws belong in structural components and ring-like expression components, selected polymorphically rather than by special cases in `Equations`.

## Current algebra layers

### `Expression`

Immutable syntax tree only. It represents notation-independent algebraic structure.

### `Grouplike`

Describes the structural laws of one binary expression operation. It owns construction, append, commute, cancellation, identity combination, and evaluation behavior that can be determined from that operation alone.

`Grouplike` should distinguish **left identity** and **right identity**:

- left identity `e_L`: `e_L * a = a`
- right identity `e_R`: `a * e_R = a`

For `add` and `mul`, both identities exist and are the same expression. For `pow`, only the right identity exists:

- `a^1 = a`
- there is no general left-identity law `1^a = a`

A nullary `create([])` is meaningful only when the operation has both a left and right identity; if both exist they are necessarily equal.

Cancellation should likewise be directional. In particular, exponentiation is right-cancellable: for fixed nonzero `b`, `(a^b)^(1/b) = a` under the active domain assumptions. Thus `pow` may cancel its right child while not generally cancelling its left child.

### `Grouplikes`

Registry/dispatcher over `Grouplike` instances. It handles generic expression operations that require knowledge of only the parent operation.

### Unary ring-like expression behavior

Unary group behavior remains separate from binary relationships between operations.

For example:

- additive inverse: `a -> -a`
- multiplicative inverse: `a -> a^-1`
- `is_inverse`
- `absolute`

The current additive and multiplicative implementations (`ScaleExpressions` and the unary portion of `PowerExpressions`) belong to this category.

**Do not register `pow` against the current mixed `PowerExpressions` implementation.** `PowerExpressions` currently also owns binary laws such as common-base combination and power distribution. If the same object were registered for `pow`, generic `combine()` dispatch on the children of a power could accidentally apply multiplicative power laws to `(base, exponent)`. Split unary and binary responsibilities first.

### Binary ring-like relationships

Relationships between two operations should be represented by dedicated `*Expressions` components registered through `Ringlike`.

Relationship keys are conceptual ordered pairs such as:

- `mulpow`
- `powadd`
- `powmul`
- `powpow`

These keys describe algebraic relationships, not necessarily the literal AST type of every participating child. Lower-ranked expressions may be promoted to degenerate higher-ranked forms by adapters such as `Powers` and `Exponents`.

## Fundamental exponentiation laws

Treat the following as the primitive cross-operation laws, subject to level/domain assumptions.

### Identity laws

`a^1 = a`

`a^0 = 1` is an annihilator/zero-exponent law, not an identity law, and should not be conflated with `Grouplike` identity handling.

### Law A — exponent addition

`a^(b+c) = a^b * a^c`

Two directions:

- `powadd`: `a^(b+c) -> a^b * a^c`
- `mulpow`: `a^b * a^c -> a^(b+c)`

### Law B — power of a product

`(ab)^c = a^c * b^c`

Two directions:

- `powmul`: `(ab)^c -> a^c * b^c`
- `mulpow`: `a^c * b^c -> (ab)^c`

### Law C — power of a power

`(a^b)^c = a^(bc)`

Two directions:

- `powpow`: `(a^b)^c -> a^(bc)`
- `powmul`: `a^(bc) -> (a^b)^c`

The reverse direction may require a user-selected factorization of the exponent rather than automatic simplification.

## Promotion hierarchy

A lower-ranked expression may participate in a higher-ranked relationship through a degenerate representation rather than by rewriting the AST first.

For powers:

`a` is interpreted as `a^1`.

This must work for arbitrary base expressions, including constants. Examples:

- `x * x^2` is interpreted as `x^1 * x^2`
- `3 * 3^2` is interpreted as `3^1 * 3^2`

This interpretation belongs in adapter/data structures, not in `Equations`.

## `Power` and `Exponent`

### `Power`

Represents a power keyed by its base:

- base
- exponent/power
- key derived from base

`Powers` maps `Expression <-> Power` and supports operations where a common base matters.

Primary use:

`a^b * a^c -> a^(b+c)`

### `Exponent`

Temporary name for the dual representation keyed by exponent:

- base
- exponent
- key derived from exponent

`Exponents` maps `Expression <-> Exponent` and supports operations where a common exponent matters.

Primary use:

`a^c * b^c -> (ab)^c`

Both adapters should promote ordinary expressions to exponent `1` when appropriate.

## Planned binary `*Expressions` components

Names intentionally follow relationship keys.

### `MultiplyPowerExpressions` — `mulpow`

Handles multiplicative collections of power-like expressions.

Priority when combining two factors:

1. **same base** using `Power`/`Powers`
   - `a^b * a^c -> a^(b+c)`
2. otherwise **same exponent** using `Exponent`/`Exponents`
   - `a^c * b^c -> (ab)^c`
3. otherwise **exponent alignment** when the user drags one factor into another power
   - `a^d * b^c -> (a^(d/c) b)^c`

This priority deliberately resolves `a^c * a^c` as:

`a^(c+c)`

rather than `(a*a)^c`.

Auto-simplify may subsequently reduce `c+c`; the algebraic drag itself should first produce the structurally correct expression.

### `PowerAddExpressions` — `powadd`

Handles:

`a^(b+c) -> a^b * a^c`

### `PowerMultiplyExpressions` — `powmul`

Handles relationships where a `pow` contains multiplication, including:

`(ab)^c -> a^c * b^c`

and the reverse form associated with Law C when a factorization of the exponent is known:

`a^(bc) -> (a^b)^c`

Position within the noncommutative `pow` structure matters: multiplication in the base and multiplication in the exponent are distinct cases even though both have the conceptual key `powmul`.

### `PowerPowerExpressions` — `powpow`

Handles:

`(a^b)^c -> a^(bc)`

The arbitrary reverse should not be automatically advertised unless a factorization is supplied by the gesture/context.

## General exponent alignment

From Law C, for nonzero `c`:

`(a^(d/c))^c = a^d`

Therefore:

`a^d * b^c = (a^(d/c) b)^c`

The requested special case follows with `d = 1`:

`a * b^c = (a^(1/c) b)^c`

The implementation must work identically when `a` or `b` are constants. Ratios such as `d/c` should remain structural expressions (multiplication by a reciprocal), preserving exact fractions rather than eagerly creating decimal approximations.

## Derived laws

The architecture should make these consequences emerge from primitive laws plus inverses rather than require independent special cases:

- `a^-b = (a^b)^-1`
- `a^b / a^c = a^(b-c)`
- `(a/b)^c = a^c / b^c`
- `(a^(1/c))^c = a`
- `(a^c)^(1/c) = a`
- `a^(b/c) = (a^b)^(1/c) = (a^(1/c))^b`

All are subject to the active domain assumptions.

## Assumptions and domains

For now, levels may state assumptions such as:

- denominator/exponent is nonzero
- bases are positive real numbers
- exponents are integers

If assumptions later become part of runtime algebra, the structure implementing a transformation should declare the assumptions it requires. `Equations` should propagate them generically rather than know why a particular law needs them.

A future transformation result could conceptually carry:

- transformed expression/equation
- assumptions introduced or required

Do not implement this until needed by concrete levels/features.

## `Ringlike` direction

`Ringlike` coordinates two fundamentally different categories of behavior and should keep their dispatch separate.

### Unary operation behavior

Indexed by a single operation, eventually including:

- `add` -> additive inverse implementation
- `mul` -> reciprocal implementation
- `pow` -> reciprocal-exponent implementation

Common unary surface:

- `inverse(expression)`
- `is_inverse(expression)`
- `absolute(expression)` (derivable as `is_inverse(expression) ? inverse(expression) : expression`)

For multiplication and exponentiation, the same reciprocal-expression implementation may be reused: multiplication uses `b^-1` as the multiplicative inverse, while exponentiation uses `b^-1` as the inverse exponent for cancelling the right operand.

Unary dispatch must not expose or depend on binary `combine()`/`distribute()` behavior.

### Binary operation relationships

Indexed conceptually by an ordered relationship key:

- `mulpow`
- `powadd`
- `powmul`
- `powpow`
- later the analogous additive/multiplicative relationship keys as the scale side is split

These components own binary laws such as `combine`, `left_distribute`, and `right_distribute`. They should be tried polymorphically: an unsupported rule returns `null`; a unique valid result is accepted. Avoid registry metadata such as `tags` when applicability can be discovered by asking the implementations themselves.

The exact registry representation can evolve as the binary components are implemented, but unary inverse behavior must remain separate from pair-key relationships.

### Required split before exponent cancellation

Before mapping `pow` into unary inverse dispatch, split the current mixed `PowerExpressions` responsibilities:

1. **Unary power inverse implementation**
   - `inverse(expression)`
   - `is_inverse(expression)`
   - no `combine` or `distribute` methods

2. **`MultiplyPowerExpressions` (`mulpow`)**
   - existing common-base combination `a^b * a^c -> a^(b+c)`
   - later common-exponent combination and exponent alignment

3. **`PowerMultiplyExpressions` (`powmul`)**
   - existing `(ab)^c -> a^c * b^c` distribution

Then `pow` can safely reuse the unary reciprocal implementation without causing `Equations.combine()` or distribution dispatch to invoke unrelated multiplicative power laws on the base/exponent children of a `pow`.

`ScaleExpressions` has the same unary/binary conflation (`inverse/is_inverse` plus scale combination/distribution). It should eventually receive an analogous split, but that need not block the power refactor unless the shared registry design requires symmetry immediately.

## Rewrite priority

For an actual drag, deterministic priority matters when several valid laws apply.

For multiplicative power combination:

1. same-base combination
2. same-exponent combination
3. exponent alignment

Existing equation-level priority remains conceptually:

1. combine
2. distribute
3. commute

unless a later interaction model explicitly lets the user choose among multiple applicable rewrites.

## Implementation order

1. Refactor `Grouplike` to support left/right identities and directional cancellation.
2. Add power right identity (`1`) and tests, with no ring-like special case.
3. **Split unary and binary `PowerExpressions` responsibilities before registering `pow` for inverse dispatch.**
   - extract unary reciprocal `inverse/is_inverse` behavior
   - move common-base multiplication law to `MultiplyPowerExpressions`
   - move `(ab)^c -> a^c b^c` to `PowerMultiplyExpressions`
4. Register unary behavior by operation so `pow` can use reciprocal-exponent cancellation safely.
5. Verify `a^b = c -> a = c^(1/b)` through generic right cancellation + unary inverse, subject to level assumptions.
6. Introduce `Exponent` and `Exponents`.
7. Extend `MultiplyPowerExpressions` with same-base priority, then same-exponent combination.
8. Implement generalized exponent alignment `a^d * b^c -> (a^(d/c)b)^c`, including constant bases.
9. Implement `PowerAddExpressions`.
10. Complete `PowerMultiplyExpressions`, including any reverse Law C transform only when factorization is supplied by gesture/context.
11. Implement `PowerPowerExpressions`.
12. Consider the analogous unary/binary split for `ScaleExpressions` so the additive side follows the same architecture.
13. Expand property tests around A–C in both directions and their derived inverse laws.
14. Revisit assumptions only when a level requires runtime tracking beyond level specification.

## Architectural constraints

- `Equations` must not special-case `add`, `mul`, or `pow` laws.
- Unary inverse dispatch and binary relationship dispatch are separate concerns; do not register a mixed implementation in both roles.
- Structure-specific rules stay in the corresponding structure/ring-like component.
- Adapters (`Powers`, `Exponents`, etc.) perform promotion and keying.
- Views handle notation only.
- Auto-simplification is post-drag behavior and does not redefine the algebraic rewrite itself.
- Undo/redo restore exact prior states; simplification happens only on new drags.
