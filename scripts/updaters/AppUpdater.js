'use strict';

/*
`AppUpdater` is the update function in the Model-View-Updater architecture.
Messages and prior state are its only inputs; it returns a new AppState.
*/
function AppUpdater(dependencies) {
    const history = dependencies.app_history_traversal;
    const drag_ops = dependencies.drag_ops;
    const drags = dependencies.equation_drags;
    const editor = dependencies.expression_editor;
    const expression_shape = dependencies.expression_shape;

    // this function exists for future reference to allow level unlocking behavior
    function mark_completed(app) {
        const level = app.levels[app.level_index];
        if (expression_shape.encode(app.equation) != expression_shape.encode(level.goal)) return app;
        return app;
    }

    function load_level(app, index) {
        const bounded = Math.max(0, Math.min(app.levels.length-1, index));
        const drag_type = drags.release();
        return app.with({
            level_index: bounded,
            equation: app.levels[bounded].equation,
            drag_type: drag_type,
            drag_state: drag_type.initialize(),
            drag_choices: [],
            undo_history: [],
            redo_history: [],
            edit_state: null,
        });
    }

    function release(app) {
        const drag_type = drags.release();
        return app.with({
            drag_type: drag_type,
            drag_state: drag_type.initialize(),
            drag_choices: [],
        });
    }

    function clear_edit(app) {
        return app.edit_state == null? app : app.with({ edit_state:null });
    }

    function edit_result(app, result) {
        if (result == null) return app;
        const changed = result.expression !== app.equation;
        const updated = changed? history.do(app, result.expression) : app;
        return updated.with({ edit_state:result.state });
    }

    return Object.freeze({
        drag_start: (app, source_path, x,y) => app.editing?
            app : drag_ops.start(app, source_path, x,y),
        drag_move: (app, x,y, target_key) => app.editing?
            app : drag_ops.move(app, x,y, target_key),
        drag_drop: (app, target_key) => app.editing?
            app : drag_ops.drop(app, target_key),
        drag_choose: (app, index) => app.editing?
            app : drag_ops.choose(app, index),
        drag_cancel: (app) => drag_ops.cancel(app),
        undo: (app) => clear_edit(release(history.undo(app))),
        redo: (app) => clear_edit(release(history.redo(app))),
        rollback: (app, index) => clear_edit(release(history.rollback(app, index))),
        restart: (app) => release(load_level(app, app.level_index)),
        last_level: (app) => release(load_level(app, app.level_index-1)),
        next_level: (app) => release(load_level(app, app.level_index+1)),
        select_level: (app, level_index) => release(load_level(app, level_index)),
        toggle_theme: (app) => app.with({ theme: app.theme === 'day'? 'night' : 'day' }),
        toggle_history: (app) => app.with({ history_visible: !app.history_visible }),
        toggle_auto_simplify: (app) => release(app.with({
            drag_options: {
                ...app.drag_options,
                auto_simplify: !app.drag_options.auto_simplify,
            },
        })),
        toggle_edit: (app) => release(app.with({
            editing: !app.editing,
            edit_state: null,
        })),
        edit_select: (app, path) => {
            if (!app.editing) return app;
            const state = editor.select(app.equation, path);
            return state == null? app : app.with({ edit_state:state });
        },
        edit_clear: (app) => app.editing? clear_edit(app) : app,
        edit_left: (app) => !app.editing || app.edit_state == null?
            app : app.with({ edit_state:editor.left(app.equation, app.edit_state) }),
        edit_right: (app) => !app.editing || app.edit_state == null?
            app : app.with({ edit_state:editor.right(app.equation, app.edit_state) }),
        edit_input: (app, character) => !app.editing || app.edit_state == null?
            app : edit_result(app, editor.input(app.equation, app.edit_state, character)),
        edit_backspace: (app) => !app.editing || app.edit_state == null?
            app : edit_result(app, editor.backspace(app.equation, app.edit_state)),
        edit_delete: (app) => !app.editing || app.edit_state == null?
            app : edit_result(app, editor.remove(app.equation, app.edit_state)),
    });
}
