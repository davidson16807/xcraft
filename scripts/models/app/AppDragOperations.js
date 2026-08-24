'use strict';

function AppDragOperations(drags, history) {

    function released(app, drag_choices) {
        const drag_type = drags.release();
        return app.with({
            drag_type: drag_type,
            drag_state: drag_type.initialize(),
            drag_choices: drag_choices || [],
        });
    }

    function choose(app, index) {
        const choice = app.drag_choices[index];
        if (choice == null) return app;
        return released(history.do(app, choice.equation), []);
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
                drag_choices: target_key == null? [] :
                    app.drag_type.choices(drag_state, target_key),
            });
        },

        drop: function(app, target_key) {
            if (app.drag_type.id === DragState.released) return app;
            const drag_choices = target_key == null? [] :
                app.drag_type.choices(app.drag_state, target_key);

            if (drag_choices.length === 0) return released(app, []);
            if (drag_choices.length === 1) {
                return choose(app.with({ drag_choices:drag_choices }), 0);
            }
            return released(app, drag_choices);
        },

        choose: choose,

        cancel: function(app) {
            if (
                app.drag_type.id === DragState.released &&
                app.drag_choices.length === 0
            ) return app;
            return released(app, []);
        },
    });
}
