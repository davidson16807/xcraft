'use strict';
// HUMAN VETTED

function AppHistoryTraversal(max_history_size) {
    typecheck(max_history_size, 'Number');

    return Object.freeze({
        do: function(app, equation) {
            typecheck(app, 'AppState');
            typecheck(equation, 'Relation');
            if (equation === app.equation) return app;
            const undo = [...app.undo_history, app.equation];
            if (undo.length > max_history_size) undo.shift();
            return app.with({
                equation: equation,
                undo_history: undo,
                redo_history: [],
            });
        },

        undo: function(app) {
            typecheck(app, 'AppState');
            if (app.undo_history.length === 0) return app;
            const undo = app.undo_history.slice();
            const previous = undo.pop();
            return app.with({
                equation: previous,
                undo_history: undo,
                redo_history: [...app.redo_history, app.equation],
            });
        },

        redo: function(app) {
            typecheck(app, 'AppState');
            if (app.redo_history.length === 0) return app;
            const redo = app.redo_history.slice();
            const next = redo.pop();
            return app.with({
                equation: next,
                undo_history: [...app.undo_history, app.equation],
                redo_history: redo,
            });
        },

        rollback: function(app, index) {
            typecheck(app, 'AppState');
            typecheck(index, 'Number');
            const previous = app.undo_history[index];
            return app.with({
                equation: previous,
                undo_history: app.undo_history.slice(0, index),
                redo_history: [
                    ...app.redo_history,
                    app.equation,
                    ...app.undo_history.slice(index + 1).reverse(),
                ],
            });
        },

    });

}
