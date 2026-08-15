'use strict';

function EquationDrags(equations) {
    function drag_value(source_path, source_operation, start, current, candidates, target_key) {
        return Object.freeze({
            source_path: source_path,
            source_operation: source_operation,
            start: Object.freeze({ x:start.x, y:start.y }),
            current: Object.freeze({ x:current.x, y:current.y }),
            candidates: candidates,
            target_key: target_key,
        });
    }

    return Object.freeze({
        symbol: function(equation, source_path, source_operation, start) {
            return Object.freeze({
                id: DragState.symbol,
                initialize: () => drag_value(source_path, source_operation, start, start, equations.moves_for_source(equation, source_path, source_operation), null),
                move: (state, point, target_key) => drag_value(source_path, source_operation, state.start, point, state.candidates, target_key),
                command: (state, target_key) => equation_input =>
                    equations.move(equation_input, state.source_path, target_key, state.source_operation),
            });
        },

        release: function() {
            return Object.freeze({
                id: DragState.released,
                initialize: () => Object.freeze({}),
                move: state => state,
                command: () => equation => equation,
            });
        },
    });
}
