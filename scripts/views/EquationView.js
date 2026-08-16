'use strict';

function EquationView(dependencies) {

    const html = dependencies.html;
    const equation_drag_ops = dependencies.equation_drag_operations;
    const paths = dependencies.expression_paths;
    const expressions = dependencies.expressions;
    const scales = dependencies.scale_expressions;
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

    function draw_ghost(expression, point, class_name, prefix) {
        const node = html.div(
            { class:`drag-ghost ${class_name}` },
            [
                ...(prefix == null? [] : [math(prefix, 'math-operator')]),
                expression_view.draw(expression),
            ]
        );
        node.style.left = `${point.x}px`;
        node.style.top = `${point.y}px`;
        return node;
    }


    function source_operation(equation, source_path, drag_options) {
        const source_side = paths.split(source_path).side;
        if (source_path === source_side) {
            const enabled = Object.keys(drag_options.enabled).filter(
                operation => drag_options.enabled[operation]
            );
            return enabled.length === 1? enabled[0] : null;
        }

        return paths.parent(source_path) === source_side?
            paths.resolve(equation, source_side).type : null;
    }

    function inverse_prefix(equation, source_path, drag_options) {
        const source = paths.resolve(equation, source_path);
        const operation = source_operation(equation, source_path, drag_options);

        // The ordinary expression renderer already shows subtraction and
        // division.  Addition and multiplication need an explicit operator
        // when their inverse expression has no unary notation of its own.
        if (operation === 'add' && scales.sign(source) < 0) return '+';
        if (operation === 'mul' && expressions.is_reciprocal(source)) return '\\cdot';
        return null;
    }

    function draw_ghosts(equation, drag_state, drag_options) {
        if (!drag_state || !drag_state.source_path) return [];

        const target_key = drag_state.target_key;
        const is_balance_move =
            target_key != null &&
            target_key.startsWith('side:');

        if (is_balance_move) {
            const inverse = equation_drag_ops.invert(equation, drag_state.source_path, drag_options);
            if (inverse != null) {
                const prefix = inverse_prefix(equation, drag_state.source_path, drag_options);
                return [
                    draw_ghost(inverse, {
                        x: drag_state.start.x + 40,
                        y: drag_state.start.y + 40,
                    }, 'drag-ghost-origin', prefix),
                    draw_ghost(inverse, drag_state.current, 'drag-ghost-current', prefix),
                ];
            }
        }

        const source = paths.resolve(equation, drag_state.source_path);
        return source?
            [draw_ghost(source, drag_state.current, 'drag-ghost-current')] :
            [];
    }

    return Object.freeze({

        draw: function(equation, drag_state, drag_options, div_io) {

            const valid_targets = new Set(drag_state && drag_state.candidates || []);
            const draggable_paths = new Set(equation_drag_ops.draggable_paths(equation, drag_options));

            div_io.replaceChildren(
                html.div({ class:'equation-row' }, [
                    draw_side(equation.left, 'L', draggable_paths, valid_targets),
                    html.span({ class:'equals-sign' }, [math('=', 'math-equals')]),
                    draw_side(equation.right, 'R', draggable_paths, valid_targets),
                ])
            );

            draw_ghosts(equation, drag_state, drag_options).forEach(ghost =>
                div_io.appendChild(ghost)
            );

        },

    });

}
