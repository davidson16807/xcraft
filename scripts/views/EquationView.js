'use strict';
// HUMAN VETTED

function EquationView(dependencies) {

    const html = dependencies.html;
    const equations = dependencies.equations;
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

    function draw_ghost(equation, drag_state) {
        if (!drag_state || !drag_state.source_path) return null;
        const latex = equations.path_latex(equation, drag_state.source_path);
        if (!latex) return null;
        const ghost = html.div({ class:'drag-ghost' }, []);
        render(latex, ghost, { throwOnError:false, output:'html' });
        ghost.style.left = `${drag_state.current.x}px`;
        ghost.style.top = `${drag_state.current.y}px`;
        return ghost;
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

            const ghost = draw_ghost(equation, drag_state);
            if (ghost) div_io.appendChild(ghost);

        },

    });

}
