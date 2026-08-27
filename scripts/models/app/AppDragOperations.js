'use strict';
// HUMAN VETTED

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
        typecheck(app, 'AppState');
        typecheck(index, 'Number');
        const choice = app.drag_choices[index];
        if (choice == null) return app;
        return released(history.do(app, choice.equation), []);
    }

    function start (app, source_path, x,y) {
        typecheck(app, 'AppState');
        typecheck(source_path, 'String');
        typecheck(x, 'Number');
        typecheck(y, 'Number');
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
    }

    function move (app, x,y, target_key) {
        typecheck(app, 'AppState');
        typecheck(x, 'Number');
        typecheck(y, 'Number');
        typecheck(target_key, 'String+1');
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
    }

    function drop (app, target_key) {
        typecheck(app, 'AppState');
        typecheck(target_key, 'String+1');
        if (app.drag_type.id === DragState.released) return app;
        const drag_choices = target_key == null? [] :
            app.drag_type.choices(app.drag_state, target_key);

        return drag_choices.length === 1?
            released(history.do(app, drag_choices[0].equation), [])
          : released(app, drag_choices);
    }


    function cancel (app) {
        typecheck(app, 'AppState');
        if (
            app.drag_type.id === DragState.released &&
            app.drag_choices.length === 0
        ) return app;
        return released(app, []);
    }

    return Object.freeze({
        choose,
        start,
        move,
        drop,
        cancel,
    });
}
