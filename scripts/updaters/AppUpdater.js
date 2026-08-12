'use strict';

/*
`AppUpdater` is the update function in the Model-View-Updater architecture.
Messages and prior state are its only inputs; it returns a new AppState.
*/
function AppUpdater(dependencies) {
    const levels = dependencies.levels;
    const history = dependencies.history;
    const drag_ops = dependencies.drag_ops;
    const equation_drags = dependencies.equation_drags;

    function released(app) {
        const drag_type = equation_drags.release();
        return app.with({ drag_type: drag_type, drag_state: drag_type.initialize() });
    }

    function mark_completed(app) {
        const level = levels[app.level_index];
        if (!EquationMetrics.is_same_shape(app.equation, level.goal)) return app;
        if (app.completed_levels.includes(app.level_index)) return app;
        return app.with({ completed_levels: [...app.completed_levels, app.level_index] });
    }

    function load_level(app, index) {
        const bounded = Math.max(0, Math.min(levels.length-1, index));
        const drag_type = equation_drags.release();
        return app.with({
            level_index: bounded,
            equation: levels[bounded].equation,
            drag_type: drag_type,
            drag_state: drag_type.initialize(),
            undo_history: [],
            redo_history: [],
            move_count: 0,
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
                    return mark_completed(drag_ops.drop(app, message.target_key));
                case 'drag_cancel':
                    return drag_ops.cancel(app);
                case 'undo':
                    return mark_completed(released(history.undo(released(app))));
                case 'redo':
                    return mark_completed(released(history.redo(released(app))));
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
