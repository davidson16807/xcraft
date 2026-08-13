'use strict';
// HUMAN VETTED

function AppDragOperations(drags, history) {
    return Object.freeze({
        start: function(app, source_path, x,y) {
            const drag_type = drags.symbol(app.equation, source_path, {x:x,y:y});
            if (drag_type.initialize().candidates.length === 0) return app;
            return app.with({
                drag_type: drag_type,
                drag_state: drag_type.initialize(),
            });
        },

        move: function(app, x,y) {
            if (app.drag_type.id === DragState.released) return app;
            return app.with({ drag_state: app.drag_type.move(app.drag_state, {x:x,y:y}) });
        },

        drop: function(app, target_key) {
            if (app.drag_type.id === DragState.released) return app;
            const equation = app.drag_type.command(app.drag_state, target_key)(app.equation);
            const released = drags.release();
            const committed = history.do(app, equation);
            return committed.with({
                drag_type: released,
                drag_state: released.initialize(),
            });
        },

        cancel: function(app) {
            if (app.drag_type.id === DragState.released) return app;
            const released = drags.release();
            return app.with({
                drag_type: released,
                drag_state: released.initialize(),
            });
        },
    });
}
