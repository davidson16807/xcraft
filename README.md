<!-- HUMAN VETTED -->

# xcraft

A small browser game for building algebraic intuition. Symbols can be dragged and dropped to apply them to each side of an equation.

This application is a low priority effort. Its creation was taken as an opportunity to experiment with vibe coding. The goal of the experiment was to see whether an application could be vibe coded in a single prompt in such a way that a human maintainer could understand the code and take over from there. 

The prompt was as follows:

>Create a game that runs in a browser. The game consists purely of algebraic equations. Algebraic equations can be manipulated according to all the usual rules of algebra. Manipulation is done by dragging symbols with the mouse or touchpad. For any manipulation, the resulting manipulation is also a valid equation that logically follows from the starting equation. There are multiple levels of the game. Each level demonstrate an important concept in algebra, or tests the user to compose what they've learned in earlier levels. The game is intended to build intuition for algebraic manipulations in middle schoolers and high schoolers. It has a clean aesthetic that would also appeal to a mathematician, featuring crisp black letters on a white background in day mode, and crisp white letters on a black background in night mode. Katex is used to render mathematical symbols. The architecture uses MVU, AKA "Elm" architecture, and has an undo/redo feature so users can back out when they make a mistake. The style and design of code closely match that of the "cdcraft" application, here: https://davidson16807.github.io/cdcraft/. The repo for cdcraft can be found here: https://github.com/davidson16807/cdcraft. The design of cdcraft is followed especially close with regard to the architecture, ui, katex usage, and undo/redo capability. `*View`s publicly expose only draw() and/or wire() calls. Prefer "flex" display. Drag functionality use roughly the same class interfaces. Functions clearly distinguish input and output, the value output after invocation is completely determined by input, and nothing is modified except for output. The only 3rd party functionality used is katex and bootstrap.

My other project, [cdcraft](https://davidson16807.github.io/cdcraft/) was chosen as a role model since I wrote the entirety of the application back in 2022-2023 without the aid of LLM and adhere to rigorous design principles that I feel aid in the ability to reason with code. To this day, I trust its design and would change little if it had to be reimplemented. cdcraft features the following architectural ideas:

- Model/View/Updater (AKA "Elm") architecture
- A code base implemented almost entirely using pure functions
- A trivially-correct undo/redo behavior that stores history as cheap snapshots using immutable references to past application state
- An interface for rich polymorphic drag behavior that I understood and wanted to reuse
- Mathematical notation implemented using KaTeX
- Styling provided by Bootstrap
- A simple implementation using no framework, build step, package manager, runtime, or 3rd party library beyond the ones listed above, which were used out of necessity.

The minimum viable product ("MVP") was generated over the course of several minutes by ChatGPT 5.6 Sol in August 2026, using "heavy" thought. Four versions were generated using variations of the prompt above until a solution was found with roughly agreeable code. In all cases, the version that was generated worked out-of-the-box, however several versions featured minor bugs that influenced the decision to keep them. The version shown here was chosen since it adhered closest to the design of cdcraft without featuring any noticeable bugs. 

Once a version was selected, work began to adapt the code to reflect personal tastes. In particular:

* the user interface looked nothing like cdcraft
* the css styling reused none of the styling that I developed for cdcraft
* the LLM arbitrarily chose to deviate from method signatures in cdcraft, such as in the `draw` and `wire` methods of `AppView`. These had the effect of introducing state to methods that could previously be understood as pure.

These problems could be regarded as unspecification within the prompt, and there is a chance the LLM would not commit the same mistakes if prompted to do so, however I did not want to generate more versions than were already generated, since each version differed significantly from the last and there was a decent chance the LLM could not generate something with all the aspects I wanted. This was the first point of frustration. **I did not consider this kind of gambling to be an effective use of my time.** 

However to the LLM's credit, the LLM did tackled what I considered to be the hardest problem of the problem, which was finding a way to manage the interaction between application-specific drag events and the 3rd-party HTML elements from the KaTeX library. This was the problem that largely kept me from starting the effort - there was too much uncertainty regarding whether the task could be done, and not enough time to explore whether it was possible.

This project is still a work in progress. My intent is to review all LLM generated code to understand it and verify that it adheres to intended design. The code base is fortunately small enough for this task to be manageable. To aid this effort, I've added the words "HUMAN VETTED" to the top of any code file that has finished review. 

## Run

Open `index.html` directly in a browser, or serve the directory with any static HTTP server, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.

The page loads KaTeX and Bootstrap from jsDelivr, so those two assets require network access.

## Interaction rules

A drag is never interpreted as arbitrary text editing. `Equations` accepts only explicit equivalence-preserving rewrites. Invalid drops return the original equation reference and therefore do nothing.

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
    algebra/  immutable expression/equation trees + rewrite rules
    app/      immutable AppState, history, drag-state transitions
  updaters/   messages -> new AppState
    drags/    drag interfaces
  views/      DOM rendering and event wiring only
  levels/     level definitions
  dom/        tiny DOM construction helpers
```

`App.js` is the small imperative shell: it owns the current immutable `AppState`, sends messages through `AppUpdater.update(message, state)`, then calls `AppView.draw(state)`.

## Tests

Run:

```bash
node tests/algebra.test.js
```

The test suite verifies a solution path for all ten levels. It also explores reachable states and, for every drag the algebra engine advertises, samples integer values of `x` before and after the rewrite to verify that the equation's solution set is unchanged over those samples.
