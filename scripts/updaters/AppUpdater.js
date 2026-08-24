'use strict';

/*
`AppUpdater` is the update function in the Model-View-Updater architecture.
Messages and prior state are its only inputs; it returns a new AppState.
*/
function AppUpdater(dependencies) {
    const history = dependencies.app_history_traversal;
    const drag_ops = dependencies.drag_ops;
    const drags = dependencies.equation_drags;
    const equation_shape = dependencies.equation_shape;

    // this function exists for future reference to allow level unlocking behavior
    function mark_completed(app) {
        const level = app.levels[app.level_index];
        if (equation_shape.encode(app.equation) != equation_shape.encode(level.goal)) return app;
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

    return Object.freeze({
        drag_start: (app, source_path, x,y) => drag_ops.start(app, source_path, x,y),
        drag_move: (app, x,y, target_key) => drag_ops.move(app, x,y, target_key),
        drag_drop: (app, target_key) => drag_ops.drop(app, target_key),
        drag_choose: (app, index) => drag_ops.choose(app, index),
        drag_cancel: (app) => drag_ops.cancel(app),
        undo: (app) => release(history.undo(app)),
        redo: (app) => release(history.redo(app)),
        restart: (app) => release(load_level(app, app.level_index)),
        last_level: (app) => release(load_level(app, app.level_index-1)),
        next_level: (app) => release(load_level(app, app.level_index+1)),
        select_level: (app, level_index) => release(load_level(app, level_index)),
        toggle_theme: (app) => app.with({ theme: app.theme === 'day'? 'night' : 'day' }),
        toggle_auto_simplify: (app) => release(app.with({
            drag_options: {
                ...app.drag_options,
                auto_simplify: !app.drag_options.auto_simplify,
            },
        })),
    });
}
