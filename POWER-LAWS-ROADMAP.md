# Xcraft Power-Law Architecture Roadmap

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

### `Grouplikes`

Registry/dispatcher over `Grouplike` instances. It handles generic expression operations that require knowledge of only the parent operation.

### Unary ring-like expression behavior

Unary group behavior remains separate from binary relationships between operations.

For example:

- additive inverse: `a -> -a`
- multiplicative inverse: `a -> a^-1`
- `is_inverse`
- `absolute`

The current additive and multiplicative implementations (`ScaleExpressions` and unary `PowerExpressions`) belong to this category. `PowerExpressions` is intentionally unary-only: it exposes multiplicative `inverse` / `is_inverse` behavior and does not own binary power laws.

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

## Binary `*Expressions` components

Names intentionally follow relationship keys. Unary `PowerExpressions` remains separate. The first split introduces `MultiplyPowerExpressions` (`mulpow`) and `PowerMultiplyExpressions` (`powmul`); later components fill the remaining roadmap cells.

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

`Ringlike` coordinates two different kinds of behavior:

1. unary group behavior keyed by an operation (`add`, `mul`)
2. binary operation relationships keyed by ordered relationship (`mulpow`, `powadd`, `powmul`, `powpow`)

The exact registry representation can evolve as the binary components are implemented. Avoid forcing unary inverse behavior into pair-key categories.

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

1. Refactor `Grouplike` to support left and right identities.
2. Add power right identity (`1`) and tests, with no `Ringlike` change.
3. Preserve unary inverse/is-inverse behavior as its own category.
4. Introduce `Exponent` and `Exponents`.
5. Split current binary `PowerExpressions` responsibilities into relationship-key components.
6. Implement `MultiplyPowerExpressions` with same-base priority, then same-exponent combination.
7. Implement generalized exponent alignment `a^d * b^c -> (a^(d/c)b)^c`, including constant bases.
8. Implement `PowerAddExpressions`.
9. Implement/complete `PowerMultiplyExpressions`.
10. Implement `PowerPowerExpressions`.
11. Expand property tests around A–C in both directions and their derived inverse laws.
12. Revisit assumptions only when a level requires runtime tracking beyond level specification.

## Architectural constraints

- `Equations` must not special-case `add`, `mul`, or `pow` laws.
- Structure-specific rules stay in the corresponding structure/ring-like component.
- Adapters (`Powers`, `Exponents`, etc.) perform promotion and keying.
- Views handle notation only.
- Auto-simplification is post-drag behavior and does not redefine the algebraic rewrite itself.
- Undo/redo restore exact prior states; simplification happens only on new drags.
