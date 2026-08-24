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
            class: `equation-side equation-side-${side.toLowerCase()}`,
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

    function draw_preview(expression) {
        const node = expression_view.draw(expression);
        const slot = node.querySelector('.expression-slot');
        if (slot == null) return node;

        // Addition and multiplication historically show only the operation
        // being applied, not a placeholder for the existing equation side.
        if (expression.type === 'add') {
            const addend = slot.closest('.addend');
            (addend || slot).remove();
        } else if (expression.type === 'mul') {
            slot.remove();
            node.insertBefore(math('\\cdot', 'math-operator multiplication-dot'), node.firstChild);
        }
        return node;
    }

    function draw_choice(choice, index, mirror, active) {
        if (mirror) {
            return html.div({
                class: 'drag-ghost drag-choice drag-choice-mirror',
                'data-drag-choice-mirror': index,
                'aria-hidden': 'true',
            }, [draw_preview(choice.preview)]);
        }

        const attributes = {
            class: `drag-ghost drag-choice drag-choice-${choice.type}`,
            'data-drag-choice': index,
            type: 'button',
            'aria-label': `Apply ${choice.type} operation`,
        };
        if (active) {
            attributes['aria-disabled'] = 'true';
            attributes['tabindex'] = '-1';
        }
        return html.button(attributes, [draw_preview(choice.preview)]);
    }

    function draw_cancel() {
        return html.button({
            class: 'drag-choices-cancel',
            'data-drag-choices-cancel': '1',
            type: 'button',
            'aria-label': 'Cancel drag choices',
        }, [], '×');
    }

    function draw_choice_row(side, choices, active, show_cancel) {
        const children = [];
        choices.forEach((choice, index) => {
            if (choice.side === side) {
                children.push(draw_choice(choice, index, false, active));
            } else if (choice.type === 'balance') {
                children.push(draw_choice(choice, index, true, active));
            }
        });

        if (show_cancel && choices.some(choice => choice.side === side)) {
            children.push(draw_cancel());
        }

        return html.div({
            class: `drag-ghosts-row drag-ghosts-${side.toLowerCase()}${active? ' drag-ghosts-active' : ''}`,
            'data-drag-ghosts-side': side,
        }, children);
    }

    return Object.freeze({

        draw: function(equation, drag_state, drag_choices, drag_options, div_io) {
            const valid_targets = new Set(drag_state && drag_state.candidates || []);
            const draggable_paths = new Set(
                equation_drag_ops.draggable_paths(equation, drag_options)
            );
            const active = drag_state != null;
            const show_cancel = !active && drag_choices.length > 0;

            div_io.replaceChildren(
                html.div({ class:'equation-row' }, [
                    draw_side(equation.left, 'L', draggable_paths, valid_targets),
                    html.span({ class:'equals-sign' }, [math('=', 'math-equals')]),
                    draw_side(equation.right, 'R', draggable_paths, valid_targets),
                    draw_choice_row('L', drag_choices, active, show_cancel),
                    draw_choice_row('R', drag_choices, active, show_cancel),
                ])
            );
        },

    });

}
