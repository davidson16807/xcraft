'use strict';
// HUMAN VETTED

function EquationDrags(equations) {
    function drag_value(source_path, start, current, candidates, target_key) {
        return Object.freeze({
            source_path: source_path,
            start: Object.freeze({ x:start.x, y:start.y }),
            current: Object.freeze({ x:current.x, y:current.y }),
            candidates: candidates,
            target_key: target_key,
        });
    }

    return Object.freeze({
        symbol: function(equation, source_path, start, drag_options) {
            typecheck(equation, 'Relation');
            typecheck(source_path, 'String');
            typecheck(start, 'Object');
            typecheck(drag_options, 'Object');
            return Object.freeze({
                id: DragState.symbol,
                initialize: () => drag_value(
                    source_path,
                    start,
                    start,
                    equations.moves_for_source(equation, source_path, drag_options),
                    null
                ),
                move: (state, point, target_key) => drag_value(
                    source_path,
                    state.start,
                    point,
                    state.candidates,
                    target_key
                ),
                choices: (state, target_key) => equations.choices(
                    equation,
                    state.source_path,
                    target_key,
                    drag_options
                ),
            });
        },

        release: function() {
            return Object.freeze({
                id: DragState.released,
                initialize: () => Object.freeze({}),
                move: state => state,
                choices: () => Object.freeze([]),
            });
        },
    });
}
