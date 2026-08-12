'use strict';

function AppHistoryTraversal(max_history_size) {
    const snapshot = app => Object.freeze({
        equation: app.equation,
        move_count: app.move_count,
    });

    return Object.freeze({
        do: function(app, equation) {
            if (equation === app.equation) return app;
            const undo = [...app.undo_history, snapshot(app)];
            if (undo.length > max_history_size) undo.shift();
            return app.with({
                equation: equation,
                undo_history: undo,
                redo_history: [],
                move_count: app.move_count + 1,
            });
        },

        undo: function(app) {
            if (app.undo_history.length === 0) return app;
            const undo = app.undo_history.slice();
            const previous = undo.pop();
            return app.with({
                equation: previous.equation,
                move_count: previous.move_count,
                undo_history: undo,
                redo_history: [...app.redo_history, snapshot(app)],
            });
        },

        redo: function(app) {
            if (app.redo_history.length === 0) return app;
            const redo = app.redo_history.slice();
            const next = redo.pop();
            return app.with({
                equation: next.equation,
                move_count: next.move_count,
                undo_history: [...app.undo_history, snapshot(app)],
                redo_history: redo,
            });
        },
    });
}
