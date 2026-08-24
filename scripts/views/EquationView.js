'use strict';

function EquationView(dependencies) {

    const html = dependencies.html;
    const equation_drag_ops = dependencies.equation_drag_operations;
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

    function preview_operator(operator) {
        return ({ add:'+', mul:'\\cdot' })[operator] || null;
    }

    function draw_choice(choice, index, clickable, mirror) {
        const operator = preview_operator(choice.preview.operator);
        const attrs = {
            class: `drag-ghost drag-choice${mirror? ' drag-choice-mirror' : ''}`,
        };

        if (mirror) {
            attrs['data-drag-choice-mirror'] = String(index);
            attrs['aria-hidden'] = 'true';
            return html.div(attrs, [
                ...(operator == null? [] : [math(operator, 'math-operator')]),
                expression_view.draw(choice.preview.expression),
            ]);
        }

        attrs['data-drag-choice-preview'] = String(index);
        if (clickable) {
            attrs['data-drag-choice'] = String(index);
            attrs['type'] = 'button';
            attrs['aria-label'] = `Apply ${choice.type} operation`;
            return html.button(attrs, [
                ...(operator == null? [] : [math(operator, 'math-operator')]),
                expression_view.draw(choice.preview.expression),
            ]);
        }

        return html.div(attrs, [
            ...(operator == null? [] : [math(operator, 'math-operator')]),
            expression_view.draw(choice.preview.expression),
        ]);
    }

    function draw_choice_row(side, drag_choices, pending) {
        const primary = [];
        const mirrors = [];

        drag_choices.forEach((choice, index) => {
            if (choice.side === side) primary.push(draw_choice(choice, index, pending, false));
            if (choice.type === 'balance' && choice.side !== side) {
                mirrors.push(draw_choice(choice, index, false, true));
            }
        });

        const children = [...primary, ...mirrors];
        if (pending && primary.length > 0) {
            children.push(html.button({
                type: 'button',
                class: 'drag-choices-cancel',
                'data-drag-choices-cancel': '1',
                'aria-label': 'Cancel operation choices',
            }, [], '×'));
        }

        return html.div({
            class: `drag-ghosts-row drag-ghosts-${side === 'L'? 'left' : 'right'} ${pending? 'drag-choices-pending' : 'drag-choices-live'}`,
        }, children);
    }

    function draw_column(expression, side, draggable_paths, valid_targets, drag_choices, pending) {
        return html.div({ class:`equation-column equation-column-${side === 'L'? 'left' : 'right'}` }, [
            draw_side(expression, side, draggable_paths, valid_targets),
            draw_choice_row(side, drag_choices, pending),
        ]);
    }

    return Object.freeze({

        draw: function(equation, drag_state, drag_choices, drag_options, div_io) {
            const valid_targets = new Set(drag_state && drag_state.candidates || []);
            const draggable_paths = new Set(
                equation_drag_ops.draggable_paths(equation, drag_options)
            );
            const choices = drag_choices || [];
            const pending = drag_state == null && choices.length > 1;

            div_io.replaceChildren(
                html.div({ class:'equation-row' }, [
                    draw_column(
                        equation.left,
                        'L',
                        draggable_paths,
                        valid_targets,
                        choices,
                        pending
                    ),
                    html.span({ class:'equals-sign' }, [math('=', 'math-equals')]),
                    draw_column(
                        equation.right,
                        'R',
                        draggable_paths,
                        valid_targets,
                        choices,
                        pending
                    ),
                ])
            );
        },

    });
}
