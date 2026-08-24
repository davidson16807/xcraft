'use strict';

function AppDragOperations(drags, history) {
    function release(app, drag_choices) {
        const released = drags.release();
        return app.with({
            drag_type: released,
            drag_state: released.initialize(),
            drag_choices: drag_choices || [],
        });
    }

    function choose(app, index) {
        const choice = app.drag_choices[index];
        if (choice == null) return app;
        return release(history.do(app, choice.equation), []);
    }

    return Object.freeze({
        start: function(app, source_path, x,y) {
            const drag_type = drags.symbol(
                app.equation,
                source_path,
                {x:x,y:y},
                app.drag_options
            );
            const drag_state = drag_type.initialize();
            if (drag_state.candidates.length === 0) return app;
            return app.with({
                drag_type: drag_type,
                drag_state: drag_state,
                drag_choices: [],
            });
        },

        move: function(app, x,y, target_key) {
            if (app.drag_type.id === DragState.released) return app;
            const drag_state = app.drag_type.move(
                app.drag_state,
                {x:x,y:y},
                target_key
            );
            return app.with({
                drag_state: drag_state,
                drag_choices: app.drag_type.choices(drag_state, target_key),
            });
        },

        drop: function(app, target_key) {
            if (app.drag_type.id === DragState.released) return app;
            const choices = app.drag_type.choices(app.drag_state, target_key);
            const released = release(app, choices);
            return choices.length === 1? choose(released, 0) : released;
        },

        choose: choose,

        cancel: function(app) {
            if (
                app.drag_type.id === DragState.released &&
                app.drag_choices.length === 0
            ) return app;
            return release(app, []);
        },
    });
}
