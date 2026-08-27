'use strict';
// HUMAN VETTED

function AppView(dependencies, app_updater) {
    const html = dependencies.html;
    const equation_view = dependencies.equation_view;
    const expression_shape = dependencies.expression_shape;

    function draw(app, dom_io) {
        typecheck(app, 'AppState');
        typecheck(dom_io, 'HTMLDocument+Document');

        const app_element = dom_io.getElementById('app');
        const equation_element = dom_io.getElementById('equation');
        const history_element = dom_io.getElementById('history');
        const level_title = dom_io.getElementById('level-title');
        const level_concept = dom_io.getElementById('level-concept');
        const level_counter = dom_io.getElementById('level-counter');
        const undo_button = dom_io.getElementById('undo');
        const redo_button = dom_io.getElementById('redo');
        const previous_button = dom_io.getElementById('previous-level');
        const next_button = dom_io.getElementById('next-level');
        const light_button = dom_io.getElementById('light');
        const dark_button = dom_io.getElementById('dark');
        const auto_simplify_button = dom_io.getElementById('auto-simplify');
        const auto_simplify_indicator = dom_io.getElementById('auto-simplify-indicator');
        const history_button = dom_io.getElementById('history-toggle');
        const history_indicator = dom_io.getElementById('history-indicator');
        const level_menu = dom_io.getElementById('level-menu');
        const solved_mark = dom_io.getElementById('solved-mark');

        const level = app.levels[app.level_index];
        const solved = expression_shape.encode(app.equation) === expression_shape.encode(level.goal);
        app_element.setAttribute('data-theme', app.theme);

        level_title.textContent = level.title;
        level_concept.textContent = level.concept;
        level_counter.textContent = `${app.level_index+1} / ${app.levels.length}`;

        undo_button.disabled = app.undo_history.length === 0;
        redo_button.disabled = app.redo_history.length === 0;
        previous_button.disabled = app.level_index === 0;
        next_button.disabled = app.level_index === app.levels.length-1;
        light_button.style.display = app.theme !== 'day'? 'none' : '';
        dark_button.style.display = app.theme !== 'night'? 'none' : '';
        auto_simplify_button.setAttribute('aria-pressed', String(!!app.drag_options.auto_simplify));
        auto_simplify_indicator.textContent = app.drag_options.auto_simplify? 'On' : 'Off';
        history_button.setAttribute('aria-pressed', String(app.history_visible));
        history_indicator.textContent = app.history_visible? 'On' : 'Off';
        solved_mark.classList.toggle('visible', solved);

        history_element.hidden = !app.history_visible;
        history_element.replaceChildren(
            ...(app.history_visible? app.undo_history.map((equation, index) => {
                const equation_node = html.div({ class:'history-equation' }, []);
                equation_view.draw(equation, null, [], null, equation_node);
                return html.button({
                    type: 'button',
                    class: 'history-item',
                    'data-history-index': String(index),
                    'aria-label': `Roll back to transformation ${index + 1}`,
                }, [equation_node]);
            }) : [])
        );

        if (app.history_visible) history_element.scrollTop = history_element.scrollHeight;

        level_menu.replaceChildren(
            ...app.levels.map((level, i) =>
                html.button({
                    'class': 'level-menu-item' + (i === app.level_index? ' active' : ''),
                    'data-level-index': i,
                    'aria-current': i === app.level_index? 'step' : 'false',
                    'aria-label': `Level ${i+1}: ${level.title}`
                }, [], `${i+1}. ${level.title}`)
            )
        );

        equation_view.draw(
            app.equation,
            app.drag_type.id === DragState.symbol? app.drag_state : null,
            app.drag_choices,
            app.drag_options,
            equation_element,
        );
    }

    function wire(app, dom_io) {
        typecheck(app, 'AppState');
        typecheck(dom_io, 'HTMLDocument+Document');
        draw(app, dom_io);

        const equation_element = dom_io.getElementById('equation');
        const history_element = dom_io.getElementById('history');
        const undo_button = dom_io.getElementById('undo');
        const redo_button = dom_io.getElementById('redo');
        const restart_button = dom_io.getElementById('restart');
        const previous_button = dom_io.getElementById('previous-level');
        const next_button = dom_io.getElementById('next-level');
        const theme_button = dom_io.getElementById('theme');
        const auto_simplify_button = dom_io.getElementById('auto-simplify');
        const history_button = dom_io.getElementById('history-toggle');
        const level_menu = dom_io.getElementById('level-menu');

        function dispatch(updated) {
            if (updated !== app) {
                app = updated;
                draw(app, dom_io);
            }
        }

        function set_mirror(index, visible) {
            equation_element
                .querySelectorAll(`[data-drag-choice-mirror="${index}"]`)
                .forEach(node => node.classList.toggle('visible', visible));
        }

        equation_element.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            if (event.target.closest('[data-drag-choice], [data-drag-choices-cancel]')) return;
            const source = event.target.closest('[data-draggable="1"]');
            if (!source || !equation_element.contains(source)) return;
            event.preventDefault();
            dispatch(app_updater.drag_start(
                app,
                source.getAttribute('data-path'),
                event.clientX,
                event.clientY
            ));
        });

        dom_io.addEventListener('pointermove', event => {
            if (app.drag_type.id === DragState.released) return;
            const under_pointer = dom_io.elementFromPoint(event.clientX, event.clientY);
            const target = under_pointer && under_pointer.closest('[data-valid-drop="1"]');
            dispatch(app_updater.drag_move(
                app,
                event.clientX,
                event.clientY,
                target? target.getAttribute('data-drop-key') : null
            ));
        }, { passive:true });

        dom_io.addEventListener('pointerup', event => {
            if (app.drag_type.id === DragState.released) return;
            const under_pointer = dom_io.elementFromPoint(event.clientX, event.clientY);
            const target = under_pointer && under_pointer.closest('[data-valid-drop="1"]');
            dispatch(target?
                app_updater.drag_drop(app, target.getAttribute('data-drop-key')) :
                app_updater.drag_cancel(app)
            );
        });

        dom_io.addEventListener('pointercancel', () => {
            if (app.drag_type.id !== DragState.released) dispatch(app_updater.drag_cancel(app));
        });

        equation_element.addEventListener('click', event => {
            const cancel = event.target.closest('[data-drag-choices-cancel]');
            if (cancel) {
                dispatch(app_updater.drag_cancel(app));
                return;
            }

            const choice = event.target.closest('[data-drag-choice]');
            if (!choice) return;
            dispatch(app_updater.drag_choose(
                app,
                Number(choice.getAttribute('data-drag-choice'))
            ));
        });

        equation_element.addEventListener('pointerover', event => {
            const choice = event.target.closest('[data-drag-choice]');
            if (choice) set_mirror(choice.getAttribute('data-drag-choice'), true);
        });

        equation_element.addEventListener('pointerout', event => {
            const choice = event.target.closest('[data-drag-choice]');
            if (!choice || choice.contains(event.relatedTarget)) return;
            set_mirror(choice.getAttribute('data-drag-choice'), false);
        });

        equation_element.addEventListener('focusin', event => {
            const choice = event.target.closest('[data-drag-choice]');
            if (choice) set_mirror(choice.getAttribute('data-drag-choice'), true);
        });

        equation_element.addEventListener('focusout', event => {
            const choice = event.target.closest('[data-drag-choice]');
            if (choice) set_mirror(choice.getAttribute('data-drag-choice'), false);
        });

        undo_button.addEventListener('click', () => dispatch(app_updater.undo(app)));
        redo_button.addEventListener('click', () => dispatch(app_updater.redo(app)));
        restart_button.addEventListener('click', () => dispatch(app_updater.restart(app)));
        previous_button.addEventListener('click', () => dispatch(app_updater.last_level(app)));
        next_button.addEventListener('click', () => dispatch(app_updater.next_level(app)));
        theme_button.addEventListener('click', () => dispatch(app_updater.toggle_theme(app)));
        auto_simplify_button.addEventListener('click', () => dispatch(app_updater.toggle_auto_simplify(app)));
        history_button.addEventListener('click', () => dispatch(app_updater.toggle_history(app)));

        history_element.addEventListener('click', event => {
            const item = event.target.closest('[data-history-index]');
            if (!item) return;
            const index = Number(item.getAttribute('data-history-index'))
            if (!Number.isInteger(index) || index < 0 || index >= app.undo_history.length) return app;
            dispatch(app_updater.rollback(app, index));
        });

        level_menu.addEventListener('click', event => {
            const button = event.target.closest('[data-level-index]');
            if (!button) return;
            dispatch(app_updater.select_level(app, Number(button.getAttribute('data-level-index'))));
        });

        dom_io.addEventListener('keydown', event => {
            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
                event.preventDefault();
                dispatch(app_updater.undo(app));
            } else if (
                (event.ctrlKey || event.metaKey) &&
                (key === 'y' || (key === 'z' && event.shiftKey))
            ) {
                event.preventDefault();
                dispatch(app_updater.redo(app));
            } else if (key === 'escape') {
                dispatch(app_updater.drag_cancel(app));
            }
        });
    }

    return Object.freeze({
        wire: wire,
        draw: draw,
    });
}
