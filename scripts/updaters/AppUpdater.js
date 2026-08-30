'use strict';
// HUMAN VETTED

/*
`AppUpdater` is the update function in the Model-View-Updater architecture.
Messages and prior state are its only inputs; it returns a new AppState.
*/
function AppUpdater(dependencies) {
    const history = dependencies.app_history_traversal;
    const drag_ops = dependencies.drag_ops;
    const drags = dependencies.equation_drags;
    const expression_shape = dependencies.expression_shape;

    // this function exists for future reference to allow level unlocking behavior
    function mark_completed(app) {
        const level = app.levels[app.level_index];
        if (expression_shape.encode(app.equation) != expression_shape.encode(level.goal)) return app;
        return app;
    }

    function course_index_for_level(app, level_index) {
        return app.courses.findIndex(course =>
            level_index >= course.first_level_index &&
            level_index <= course.last_level_index
        );
    }

    function load_level(app, index) {
        const bounded = Math.max(0, Math.min(app.levels.length-1, index));
        const old_course = course_index_for_level(app, app.level_index);
        const new_course = course_index_for_level(app, bounded);
        const open_courses = new_course >= 0 && new_course !== old_course &&
            !app.open_courses.includes(new_course)?
                [...app.open_courses, new_course] : app.open_courses;
        const drag_type = drags.release();
        return app.with({
            level_index: bounded,
            equation: app.levels[bounded].equation,
            drag_type: drag_type,
            drag_state: drag_type.initialize(),
            drag_choices: [],
            undo_history: [],
            redo_history: [],
            open_courses: open_courses,
        });
    }

    function toggle_course(app, course_index) {
        if (!Number.isInteger(course_index) || course_index < 0 || course_index >= app.courses.length) {
            return app;
        }
        return app.with({
            open_courses: app.open_courses.includes(course_index)?
                app.open_courses.filter(index => index !== course_index)
              : [...app.open_courses, course_index],
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
        rollback: (app, index) => release(history.rollback(app, index)),
        restart: (app) => release(load_level(app, app.level_index)),
        last_level: (app) => release(load_level(app, app.level_index-1)),
        next_level: (app) => release(load_level(app, app.level_index+1)),
        select_level: (app, level_index) => release(load_level(app, level_index)),
        toggle_course: (app, course_index) => toggle_course(app, course_index),
        toggle_theme: (app) => app.with({ theme: app.theme === 'day'? 'night' : 'day' }),
        toggle_history: (app) => app.with({ history_visible: !app.history_visible }),
        toggle_auto_simplify: (app) => release(app.with({
            drag_options: {
                ...app.drag_options,
                auto_simplify: !app.drag_options.auto_simplify,
            },
        })),
    });
}
