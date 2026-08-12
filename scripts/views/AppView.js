'use strict';

function AppView(dependencies) {
    const dom = dependencies.dom;
    const levels = dependencies.levels;
    const equation_view = dependencies.equation_view;
    const render = dependencies.render;

    const app_element = dom.getElementById('app');
    const equation_element = dom.getElementById('equation');
    const level_title = dom.getElementById('level-title');
    const level_concept = dom.getElementById('level-concept');
    const goal_math = dom.getElementById('goal-math');
    const level_counter = dom.getElementById('level-counter');
    const move_counter = dom.getElementById('move-counter');
    const undo_button = dom.getElementById('undo');
    const redo_button = dom.getElementById('redo');
    const restart_button = dom.getElementById('restart');
    const previous_button = dom.getElementById('previous-level');
    const next_button = dom.getElementById('next-level');
    const theme_button = dom.getElementById('theme');
    const level_strip = dom.getElementById('level-strip');
    const solved_mark = dom.getElementById('solved-mark');

    function render_equation(node, equation) {
        render(EquationMetrics.to_latex(equation), node, {
            throwOnError: false,
            output: 'html',
        });
    }

    function wire(dispatch) {
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

        window.addEventListener('pointermove', event => {
            dispatch({ type:'drag_move', point:{ x:event.clientX, y:event.clientY } });
        }, { passive:true });

        window.addEventListener('pointerup', event => {
            const under_pointer = dom.elementFromPoint(event.clientX, event.clientY);
            const target = under_pointer && under_pointer.closest('[data-valid-drop="1"]');
            dispatch(target?
                { type:'drag_drop', target_key:target.getAttribute('data-drop-key') } :
                { type:'drag_cancel' }
            );
        });

        window.addEventListener('pointercancel', () => dispatch({ type:'drag_cancel' }));

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

        window.addEventListener('keydown', event => {
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

    function draw_level_strip(app) {
        level_strip.replaceChildren();
        levels.forEach((level, i) => {
            const button = dom.createElement('button');
            button.type = 'button';
            button.className = 'level-dot';
            if (i === app.level_index) button.classList.add('active');
            if (app.completed_levels.includes(i)) button.classList.add('complete');
            button.setAttribute('data-level-index', i);
            button.setAttribute('aria-label', `Level ${i+1}: ${level.title}`);
            button.textContent = String(i+1);
            level_strip.appendChild(button);
        });
    }

    return Object.freeze({
        wire: wire,

        draw: function(app) {
            const level = levels[app.level_index];
            const solved = EquationMetrics.is_same_shape(app.equation, level.goal);
            app_element.setAttribute('data-theme', app.theme);

            level_title.textContent = level.title;
            level_concept.textContent = level.concept;
            level_counter.textContent = `${app.level_index+1} / ${levels.length}`;
            move_counter.textContent = app.move_count === 1? '1 move' : `${app.move_count} moves`;

            goal_math.replaceChildren();
            render_equation(goal_math, level.goal);

            undo_button.disabled = app.undo_history.length === 0;
            redo_button.disabled = app.redo_history.length === 0;
            previous_button.disabled = app.level_index === 0;
            next_button.disabled = app.level_index === levels.length-1;
            theme_button.textContent = app.theme === 'day'? '☾' : '☀';
            theme_button.setAttribute('aria-label', app.theme === 'day'? 'Use night mode' : 'Use day mode');
            solved_mark.classList.toggle('visible', solved);

            draw_level_strip(app);
            equation_view.draw(
                equation_element,
                app.equation,
                app.drag_type.id === DragState.symbol? app.drag_state : null
            );
        },
    });
}
