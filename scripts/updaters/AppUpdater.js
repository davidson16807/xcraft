'use strict';
// HUMAN VETTED

/*
`AppUpdater` is the update function in the Model-View-Updater architecture.
Messages and prior state are its only inputs; it returns a new AppState.
*/
function AppUpdater(dependencies) {
    const app_history_traversal = dependencies.app_history_traversal;
    const drag_ops = dependencies.drag_ops;
    const equation_drags = dependencies.equation_drags;

    // this function exists for future reference to allow level unlocking behavior
    function mark_completed(app) {
        const level = app.levels[app.level_index];
        if (!EquationMetrics.is_same_shape(app.equation, level.goal)) return app;
        return app;
    }

    function load_level(app, index) {
        const bounded = Math.max(0, Math.min(app.levels.length-1, index));
        const drag_type = equation_drags.release();
        return app.with({
            level_index: bounded,
            equation: app.levels[bounded].equation,
            drag_type: drag_type,
            drag_state: drag_type.initialize(),
            undo_history: [],
            redo_history: [],
        });
    }

    function release(app) {
        const drag_type = equation_drags.release();
        return app.with({ drag_type: drag_type, drag_state: drag_type.initialize() });
    }

    return Object.freeze({
        drag_start: (app, source_path, x,y) => drag_ops.start(app, source_path, x,y),
        drag_move: (app, x,y) => drag_ops.move(app, x,y),
        drag_drop: (app, target_key) => drag_ops.drop(app, target_key),
        drag_cancel: (app) => drag_ops.cancel(app),
        undo: (app) => release(app_history_traversal.undo(app)),
        redo: (app) => release(app_history_traversal.redo(app)),
        restart: (app) => release(load_level(app, app.level_index)),
        last_level: (app) => release(load_level(app, app.level_index-1)),
        next_level: (app) => release(load_level(app, app.level_index+1)),
        select_level: (app, level_index) => release(load_level(app, level_index)),
        toggle_theme: (app) => app.with({ theme: app.theme === 'day'? 'night' : 'day' }),
    });
}
