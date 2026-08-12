'use strict';
// HUMAN VETTED

function AppView(dependencies, app_updater) {
    const equation_view = dependencies.equation_view;
    const render = dependencies.render;

    function draw(app, dom_io) {

        const app_element = dom_io.getElementById('app');
        const equation_element = dom_io.getElementById('equation');
        const level_title = dom_io.getElementById('level-title');
        const level_concept = dom_io.getElementById('level-concept');
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
        const solved = EquationMetrics.is_same_shape(app.equation, level.goal);
        app_element.setAttribute('data-theme', app.theme);

        level_title.textContent = level.title;
        level_concept.textContent = level.concept;
        level_counter.textContent = `${app.level_index+1} / ${app.levels.length}`;

        undo_button.disabled = app.undo_history.length === 0;
        redo_button.disabled = app.redo_history.length === 0;
        previous_button.disabled = app.level_index === 0;
        next_button.disabled = app.level_index === app.levels.length-1;
        theme_button.textContent = app.theme === 'day'? '☾' : '☀';
        theme_button.setAttribute('aria-label', app.theme === 'day'? 'Use night mode' : 'Use day mode');
        solved_mark.classList.toggle('visible', solved);

        level_strip.replaceChildren();
        app.levels.forEach((level, i) => {
            const button = dom_io.createElement('button');
            button.type = 'button';
            button.className = 'level-dot';
            if (i === app.level_index) button.classList.add('active');
            button.setAttribute('data-level-index', i);
            button.setAttribute('aria-label', `Level ${i+1}: ${level.title}`);
            button.textContent = String(i+1);
            level_strip.appendChild(button);
        });

        equation_view.draw(
            equation_element,
            app.equation,
            app.drag_type.id === DragState.symbol? app.drag_state : null
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

        function dispatch(message) {
            const updated = app_updater.update(message, app);
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
            dispatch({
                type: 'drag_start',
                source_path: source.getAttribute('data-path'),
                point: { x:event.clientX, y:event.clientY },
            });
        });

        dom_io.addEventListener('pointermove', event => {
            dispatch({ type:'drag_move', point:{ x:event.clientX, y:event.clientY } });
        }, { passive:true });

        dom_io.addEventListener('pointerup', event => {
            const under_pointer = dom_io.elementFromPoint(event.clientX, event.clientY);
            const target = under_pointer && under_pointer.closest('[data-valid-drop="1"]');
            dispatch(target?
                { type:'drag_drop', target_key:target.getAttribute('data-drop-key') } :
                { type:'drag_cancel' }
            );
        });

        dom_io.addEventListener('pointercancel', () => dispatch({ type:'drag_cancel' }));

        undo_button.addEventListener('click', () => dispatch({ type:'undo' }));
        redo_button.addEventListener('click', () => dispatch({ type:'redo' }));
        restart_button.addEventListener('click', () => dispatch({ type:'restart' }));
        previous_button.addEventListener('click', () => dispatch({ type:'previous_level' }));
        next_button.addEventListener('click', () => dispatch({ type:'next_level' }));
        theme_button.addEventListener('click', () => dispatch({ type:'toggle_theme' }));

        level_strip.addEventListener('click', event => {
            const button = event.target.closest('[data-level-index]');
            if (!button) return;
            dispatch({
                type:'select_level',
                level_index:Number(button.getAttribute('data-level-index')),
            });
        });

        dom_io.addEventListener('keydown', event => {
            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
                event.preventDefault();
                dispatch({ type:'undo' });
            } else if (
                (event.ctrlKey || event.metaKey) &&
                (key === 'y' || (key === 'z' && event.shiftKey))
            ) {
                event.preventDefault();
                dispatch({ type:'redo' });
            } else if (key === 'escape') {
                dispatch({ type:'drag_cancel' });
            }
        });
    }

    return Object.freeze({
        wire: wire,
        draw: draw,
    });
}
