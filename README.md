# equationcraft

A small browser game for building intuition for algebra by dragging parts of equations.

The code intentionally follows the architectural ideas used by **cdcraft**:

- Model / View / Updater (Elm-style MVU).
- Immutable model values and cheap undo/redo snapshots.
- Views publicly expose only `draw()` and/or `wire()`.
- Drag behavior is represented by small objects with `initialize`, `move`, and `command` operations.
- KaTeX renders mathematical glyphs; Bootstrap supplies basic control styling.
- No framework, build step, package manager, or other third-party runtime is used.

## Run

Open `index.html` directly in a browser, or serve the directory with any static HTTP server, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.

The page loads KaTeX and Bootstrap from jsDelivr, so those two assets require network access.

## Interaction rules

A drag is never interpreted as arbitrary text editing. `EquationOperations` accepts only explicit equivalence-preserving rewrites. Invalid drops return the original equation reference and therefore do nothing.

Implemented gestures include:

- Drag an additive term to the opposite side of `=` to add its opposite there.
- Drag a known nonzero numeric factor across `=` to divide the other side by it.
- Drag a known nonzero numeric denominator across `=` to multiply the other side by it.
- Drag like terms together to add coefficients.
- Drag numeric factors together to multiply them.
- Drag a constant numerator/denominator together to evaluate the quotient.
- Drag a numeric factor onto a parenthesized sum to distribute it.

Crossing a variable factor is intentionally not offered because dividing by an unknown can discard the zero case unless domain conditions are tracked explicitly.

## Architecture

```text
scripts/
  models/
    algebra/              immutable expression/equation trees + rewrite rules
    app/                  immutable AppState, history, drag-state transitions
  updaters/               messages -> new AppState
    drags/                drag interfaces
  views/                  DOM rendering and event wiring only
  levels/                 level definitions
  dom/                    tiny DOM construction helpers
```

`App.js` is the small imperative shell: it owns the current immutable `AppState`, sends messages through `AppUpdater.update(message, state)`, then calls `AppView.draw(state)`.

## Tests

Run:

```bash
node tests/algebra.test.js
```

The test suite verifies a solution path for all ten levels. It also explores reachable states and, for every drag the algebra engine advertises, samples integer values of `x` before and after the rewrite to verify that the equation's solution set is unchanged over those samples.
