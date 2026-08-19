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

This split is now implemented. `PowerExpressions` is unary-only, while binary laws live in relationship-specific components. `pow` may therefore safely reuse `PowerExpressions` for reciprocal-exponent inversion without exposing binary `combine()` or distribution behavior on `(base, exponent)` children.

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
- exponent/power as an `Expression`
- key derived from base

Keeping the exponent as an `Expression` allows symbolic rules such as `x^a * x^b -> x^(a+b)`. Numeric sums are constructed structurally first and may then be reduced by auto-simplification.

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

Implemented for base-over-sum distribution:

`a^(b+c) -> a^b * a^c`

The user gesture is to drag the base onto the additive exponent. `Ringlike`
therefore selects the `powadd` relationship through left distribution.

### `PowerMultiplyExpressions` — `powmul`

Handles relationships where a `pow` contains multiplication, including:

`(ab)^c -> a^c * b^c`

and the reverse form associated with Law C when a factorization of the exponent is known:

`a^(bc) -> (a^b)^c`

Position within the noncommutative `pow` structure matters: multiplication in the base and multiplication in the exponent are distinct cases even though both have the conceptual key `powmul`.

### `PowerPowerExpressions` — `powpow`

Partially implemented. Reciprocal nested exponents combine directly through
power invertibility:

`(a^b)^(1/b) -> a`

`(a^(1/b))^b -> a`

General exponent composition remains to be implemented:

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

These components own binary laws such as `combine`, `left_distribute`, and `right_distribute`. They are registered by operation-pair key rather than searched polymorphically. `Ringlike` performs exactly one deterministic lookup:

- unary behavior: `type`;
- combination: `parent.type + child.type`, where `child` is the higher-precedence expression between the drag source and drop target according to `precedence_for_tag`;
- left distribution: `parent.type + right.type`, because the left operand distributes across the right operand;
- right distribution: `parent.type + left.type`, because the right operand distributes across the left operand.

Atomic expressions (`constant`, `variable`) have precedence rank `0` for relationship selection and are treated as degenerate/promotable forms by the registered relationship implementation. View parenthesization must therefore treat rank `0` as atomic rather than as a low-precedence operator.

Avoid registry metadata such as `tags`; applicability is encoded directly by the operation-pair lookup. Unary inverse behavior remains separate from pair-key relationships.

### Unary/binary split

The split required before exponent cancellation is now implemented:

1. **Unary power inverse implementation**
   - `inverse(expression)`
   - `is_inverse(expression)`
   - no `combine` or `distribute` methods

2. **`MultiplyPowerExpressions` (`mulpow`)**
   - common-base combination `a^b * a^c -> a^(b+c)`
   - common-exponent combination `a^c * b^c -> (ab)^c`
   - exponent alignment `a^d * b^c -> (a^(d/c)b)^c`

3. **`PowerMultiplyExpressions` (`powmul`)**
   - existing `(ab)^c -> a^c * b^c` distribution

`pow` now safely reuses the unary reciprocal implementation without causing `Equations.combine()` or distribution dispatch to invoke unrelated multiplicative power laws on the base/exponent children of a `pow`.

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

1. **Implemented:** refactor `Grouplike` to support one-sided identity behavior and directional cancellation.
2. **Implemented:** add power right identity (`1`) and tests, with no ring-like special case.
3. **Implemented:** split unary and binary `PowerExpressions` responsibilities.
   - unary reciprocal `inverse/is_inverse` remains in `PowerExpressions`
   - common-base multiplication lives in `MultiplyPowerExpressions`
   - `(ab)^c -> a^c b^c` lives in `PowerMultiplyExpressions`
4. **Implemented:** register unary behavior by operation so `pow` can use reciprocal-exponent cancellation safely.
5. **Implemented:** verify `a^b = c -> a = c^(1/b)` through generic right cancellation + unary inverse, subject to level assumptions.
6. **Implemented:** introduce `Exponent` and `Exponents`.
7. **Implemented:** extend `MultiplyPowerExpressions` with same-base priority and same-exponent combination.
8. **Implemented:** generalized exponent alignment `a^d * b^c -> (a^(d/c)b)^c`, including constant bases. The drop target supplies the exponent being aligned to.
9. **Implemented:** `PowerAddExpressions` for `a^(b+c) -> a^b a^c` by dragging the base onto the additive exponent.
10. Complete `PowerMultiplyExpressions`, including any reverse Law C transform only when factorization is supplied by gesture/context.
11. **Implemented:** `PowerPowerExpressions.combine()` now handles general nested exponent composition `(a^b)^c -> a^(bc)`, while recognizing reciprocal pairs first so `(a^b)^(1/b) -> a` and `(a^(1/b))^b -> a` reduce exactly.
12. Consider the analogous unary/binary split for `ScaleExpressions` so the additive side follows the same architecture.
13. Expand property tests around A–C in both directions and their derived inverse laws.
14. Revisit assumptions only when a level requires runtime tracking beyond level specification.


## Level fixtures

The application intentionally includes level fixtures ahead of implementation so algebraic laws can be observed directly as each rewrite lands.

Currently solve-tested power levels demonstrate:

- right identity: `a^1 -> a`
- right exponent cancellation: `a^b = c -> a = c^(1/b)`
- same-base multiplication: `a^b * a^c -> a^(b+c)`, including symbolic exponents
- power of a product: `(ab)^c -> a^c * b^c`
- the derived like-base quotient form represented structurally as `a^b * a^-c -> a^(b-c)`
- same-exponent combination: `a^c * b^c -> (ab)^c`
- exponent alignment: `a^d * b^c -> (a^(d/c)b)^c`
- exponent-sum distribution: `a^(b+c) -> a^b a^c`
- reciprocal nested-power cancellation in both orders: `(a^b)^(1/b) -> a` and `(a^(1/b))^b -> a`

The power fixtures are ordered pedagogically rather than by implementation status. `Undo an exponent` appears before `Same base` because it introduces directional power invertibility. The fixtures then exercise same-base combination, power of a product, quotient of powers, same-exponent combination, exponent alignment, and negative exponents before moving to the remaining binary power relationships.

The remaining roadmap mechanisms are exposed directly by levels:

- `Split an exponent sum` is now implemented through `PowerAddExpressions` (`powadd`).
- `Root then power` and `Power then root` are now implemented through reciprocal-exponent `PowerPowerExpressions.combine()`.
- `Power of a power` is now implemented through general exponent multiplication in `PowerPowerExpressions.combine()` (`powpow`).
- `Negative exponent` also requires the reverse/nesting side of `powpow`: `x^-b = (x^b)^-1` factors the exponent as `b*(-1)`; directional cancellation alone does not perform this rewrite.
- `Factor an exponent` is the reverse `powpow` fixture and uses the general symbolic form `x^(ab) = c`.
- `Zero exponent` is presented as `y^0 = x`, making `x` the quantity being solved while the irrelevant nonzero base remains unspecified.
- A single `Rational exponent` fixture is retained; the previous two orientations were redundant with the nested-power/root fixtures.
- `Power of a quotient` remains as a derived distribution fixture.

These levels need not be solvable before their corresponding relationship is implemented; their purpose is to provide stable interactive fixtures and targets.

## Architectural constraints

- `Equations` must not special-case `add`, `mul`, or `pow` laws.
- Unary inverse dispatch and binary relationship dispatch are separate concerns; do not register a mixed implementation in both roles.
- Structure-specific rules stay in the corresponding structure/ring-like component.
- Adapters (`Powers`, `Exponents`, etc.) perform promotion and keying.
- Views handle notation only.
- Auto-simplification is post-drag behavior and does not redefine the algebraic rewrite itself.
- Undo/redo restore exact prior states; simplification happens only on new drags.
