'use strict';

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

    return Object.freeze({
        update: function(message, app) {
            switch (message.type) {
                case 'drag_start':
                    return drag_ops.start(app, message.source_path, message.point);
                case 'drag_move':
                    return drag_ops.move(app, message.point);
                case 'drag_drop':
                    return drag_ops.drop(app, message.target_key);
                case 'drag_cancel':
                    return drag_ops.cancel(app);
                case 'undo':
                    drag_type = equation_drags.release();
                    return app.with({ drag_type: drag_type, drag_state: drag_type.initialize() });
                case 'redo':
                    drag_type = equation_drags.release();
                    return app.with({ drag_type: drag_type, drag_state: drag_type.initialize() });
                case 'restart':
                    return load_level(app, app.level_index);
                case 'previous_level':
                    return load_level(app, app.level_index-1);
                case 'next_level':
                    return load_level(app, app.level_index+1);
                case 'select_level':
                    return load_level(app, message.level_index);
                case 'toggle_theme':
                    return app.with({ theme: app.theme === 'day'? 'night' : 'day' });
                default:
                    return app;
            }
        },
    });
}
