'use strict';
// HUMAN VETTED

function AppView(dependencies, app_updater) {
    const html = dependencies.html;
    const render = dependencies.render;
    const equation_view = dependencies.equation_view;
    const equation_shape = dependencies.equation_shape;

    function draw(app, dom_io) {

        const app_element = dom_io.getElementById('app');
        const equation_element = dom_io.getElementById('equation');
        const level_title = dom_io.getElementById('level-title');
        const level_concept = dom_io.getElementById('level-concept');
        const level_context = dom_io.getElementById('level-context');
        const goal_math = dom_io.getElementById('goal-math');
        const level_counter = dom_io.getElementById('level-counter');
        const undo_button = dom_io.getElementById('undo');
        const redo_button = dom_io.getElementById('redo');
        const restart_button = dom_io.getElementById('restart');
        const previous_button = dom_io.getElementById('previous-level');
        const next_button = dom_io.getElementById('next-level');
        const theme_button = dom_io.getElementById('theme');
        const level_strip = dom_io.getElementById('level-strip');
        const solved_mark = dom_io.getElementById('solved-mark');

        const level = app.levels[app.level_index];
        const solved = equation_shape.encode(app.equation) === equation_shape.encode(level.goal);
        app_element.setAttribute('data-theme', app.theme);

        level_title.textContent = level.title;
        level_concept.textContent = level.concept;
        level_context.textContent = level.context;
        level_context.hidden = !level.context;
        level_counter.textContent = `${app.level_index+1} / ${app.levels.length}`;

        undo_button.disabled = app.undo_history.length === 0;
        redo_button.disabled = app.redo_history.length === 0;
        previous_button.disabled = app.level_index === 0;
        next_button.disabled = app.level_index === app.levels.length-1;
        theme_button.textContent = app.theme === 'day'? '☾' : '☀';
        theme_button.setAttribute('aria-label', app.theme === 'day'? 'Use night mode' : 'Use day mode');
        solved_mark.classList.toggle('visible', solved);

        level_strip.replaceChildren(
            ...app.levels.map((level, i) => 
                html.button({ 
                    'class': 'level-dot' + i === app.level_index? ' active':'', 
                    'data-level-index':i, 
                    'aria-label': `Level ${i+1}: ${level.title}`
                }, [], String(i+1))
        ));

        equation_view.draw(
            app.equation,
            app.drag_type.id === DragState.symbol? app.drag_state : null,
            equation_element,
        );
    }

    function wire(app, dom_io) {
        draw(app, dom_io);

        const equation_element = dom_io.getElementById('equation');
        const undo_button = dom_io.getElementById('undo');
        const redo_button = dom_io.getElementById('redo');
        const restart_button = dom_io.getElementById('restart');
        const previous_button = dom_io.getElementById('previous-level');
        const next_button = dom_io.getElementById('next-level');
        const theme_button = dom_io.getElementById('theme');
        const level_strip = dom_io.getElementById('level-strip');

        function dispatch(updated) {
            if (updated !== app) {
                app = updated;
                draw(app, dom_io);
            }
        }

        equation_element.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            const source = event.target.closest('[data-draggable="1"]');
            if (!source || !equation_element.contains(source)) return;
            event.preventDefault();
            dispatch(app_updater.drag_start(app, source.getAttribute('data-path'), event.clientX, event.clientY ), dom_io);
        });

        dom_io.addEventListener('pointermove', event => {
            const under_pointer = dom_io.elementFromPoint(event.clientX, event.clientY);
            const target = under_pointer && under_pointer.closest('[data-valid-drop="1"]');
            dispatch(
                app_updater.drag_move(
                    app,
                    event.clientX,
                    event.clientY,
                    target? target.getAttribute('data-drop-key') : null
                ),
                dom_io
            );
        }, { passive:true });

        dom_io.addEventListener('pointerup', event => {
            const under_pointer = dom_io.elementFromPoint(event.clientX, event.clientY);
            const target = under_pointer && under_pointer.closest('[data-valid-drop="1"]');
            dispatch(target?
                    app_updater.drag_drop(app, target.getAttribute('data-drop-key')) :
                    app_updater.drag_cancel(app), 
                dom_io);
        });

        dom_io.addEventListener('pointercancel', () => dispatch(app_updater.drag_cancel(app), dom_io));

        undo_button.addEventListener('click', () => dispatch(app_updater.undo(app), dom_io));
        redo_button.addEventListener('click', () => dispatch(app_updater.redo(app), dom_io));
        restart_button.addEventListener('click', () => dispatch(app_updater.restart(app), dom_io));
        previous_button.addEventListener('click', () => dispatch(app_updater.last_level(app), dom_io));
        next_button.addEventListener('click', () => dispatch(app_updater.next_level(app), dom_io));
        theme_button.addEventListener('click', () => dispatch(app_updater.toggle_theme(app), dom_io));

        level_strip.addEventListener('click', event => {
            const button = event.target.closest('[data-level-index]');
            if (!button) return;
            dispatch(app_updater.select_level(appNumber(button.getAttribute('data-level-index'))), dom_io);
        });

        dom_io.addEventListener('keydown', event => {
            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
                event.preventDefault();
                dispatch(app_updater.undo(app), dom_io);
            } else if (
                (event.ctrlKey || event.metaKey) &&
                (key === 'y' || (key === 'z' && event.shiftKey))
            ) {
                event.preventDefault();
                dispatch(app_updater.redo(app), dom_io);
            } else if (key === 'escape') {
                dispatch(app_updater.drag_cancel(app), dom_io);
            }
        });

    }

    return Object.freeze({
        wire: wire,
        draw: draw,
    });

}
