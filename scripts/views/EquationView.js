'use strict';
// HUMAN VETTED

function EquationView(dependencies) {

    const html = dependencies.html;
    const equations = dependencies.equations;
    const paths = dependencies.expression_paths;
    const expression_view = dependencies.expression_view;
    const render = dependencies.render;

    function math(latex, class_name) {
        const node = html.span({ class: class_name || 'math-atom' }, []);
        render(latex, node, { throwOnError: false, output: 'html' });
        return node;
    }

    function draw_side(expression, side, draggable_paths, valid_targets) {
        const attrs = {
            class: 'equation-side',
            'data-drop-key': `side:${side}`,
        };
        if (valid_targets.has(`side:${side}`)) {
            attrs.class += ' valid-drop';
            attrs['data-valid-drop'] = '1';
        }
        return html.span(attrs, [
            expression_view.draw(expression, side, draggable_paths, valid_targets)
        ]);
    }

    function draw_ghost(expression, point, class_name) {
        const node = html.div(
            { class:`drag-ghost ${class_name}` },
            [expression_view.draw(expression)]
        );
        node.style.left = `${point.x}px`;
        node.style.top = `${point.y}px`;
        return node;
    }

    function draw_ghosts(equation, drag_state) {
        if (!drag_state || !drag_state.source_path) return [];

        const target_key = drag_state.target_key;
        const is_balance_move =
            target_key != null &&
            target_key.startsWith('side:');

        if (is_balance_move) {
            const inverse = equations.opposite(equation, drag_state.source_path);
            if (inverse != null) {
                return [
                    draw_ghost(inverse, {
                        x: drag_state.start.x + 40,
                        y: drag_state.start.y + 40,
                    }, 'drag-ghost-origin'),
                    draw_ghost(inverse, drag_state.current, 'drag-ghost-current'),
                ];
            }
        }

        const source = paths.resolve(equation, drag_state.source_path);
        return source?
            [draw_ghost(source, drag_state.current, 'drag-ghost-current')] :
            [];
    }

    return Object.freeze({

        draw: function(equation, drag_state, div_io) {

            const valid_targets = new Set(drag_state && drag_state.candidates || []);
            const draggable_paths = new Set(equations.draggable_paths(equation));

            div_io.replaceChildren(
                html.div({ class:'equation-row' }, [
                    draw_side(equation.left, 'L', draggable_paths, valid_targets),
                    html.span({ class:'equals-sign' }, [math('=', 'math-equals')]),
                    draw_side(equation.right, 'R', draggable_paths, valid_targets),
                ])
            );

            draw_ghosts(equation, drag_state).forEach(ghost =>
                div_io.appendChild(ghost)
            );

        },

    });

}
