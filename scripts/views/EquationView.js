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

    function relation_symbol(type) {
        return ({
            eq: '=',
            neq: '\\ne',
            lt: '<',
            lte: '\\le',
            gt: '>',
            gte: '\\ge',
        })[type] || '?';
    }

    function preview_operator(operator) {
        return ({ add:'+', mul:'\\cdot' })[operator] || null;
    }

    function draw_choice(choice, index, clickable, mirror, visible) {
        const operator = preview_operator(choice.operator);
        const attrs = {
            class: `drag-ghost drag-choice${mirror? ' drag-choice-mirror' : ''}${visible? ' visible' : ''}`,
        };

        if (mirror) {
            attrs['data-drag-choice-mirror'] = String(index);
            attrs['aria-hidden'] = 'true';
            return html.div(attrs, [
                ...(operator == null? [] : [math(operator, 'math-operator')]),
                expression_view.draw(choice.expression),
            ]);
        }

        attrs['data-drag-choice-preview'] = String(index);
        if (clickable) {
            attrs['data-drag-choice'] = String(index);
            attrs['type'] = 'button';
            attrs['aria-label'] = `Apply ${choice.type} operation`;
            return html.button(attrs, [
                ...(operator == null? [] : [math(operator, 'math-operator')]),
                expression_view.draw(choice.expression),
            ]);
        }

        return html.div(attrs, [
            ...(operator == null? [] : [math(operator, 'math-operator')]),
            expression_view.draw(choice.expression),
        ]);
    }

    function draw_choice_row(side, drag_choices, pending) {

        const primary = drag_choices
            .filter(choice => choice.side === side)
            .map((choice, index) => draw_choice(choice, index, pending, false, false));

        const mirrors = drag_choices
            .filter(choice => choice.type === 'balance' && choice.side !== side)
            .map((choice, index) => draw_choice(choice, index, false, true, drag_choices.length === 1));

        const row = html.div({
            class: `drag-ghosts-row ${pending? 'drag-choices-pending' : 'drag-choices-live'}`,
        }, [...primary, ...mirrors]);

        const cancel = !pending || primary.length < 1? null
            : html.button({
                type: 'button',
                class: 'drag-choices-cancel',
                'data-drag-choices-cancel': '1',
                'aria-label': 'Cancel operation choices',
            }, [], '×');

        const children = side === '0'?
            [...(cancel == null? [] : [cancel]), row] :
            [row, ...(cancel == null? [] : [cancel])];

        return html.div({
            class: `drag-ghosts-shell drag-ghosts-${side === '0'? 'left' : 'right'}`,
        }, children);
    }

    function draw_column(
        side_expression,
        side,
        draggable_paths,
        valid_targets,
        drag_choices,
        pending
    ) {
        return html.div({ class:`equation-column equation-column-${side === '0'? 'left' : 'right'}` }, [
            expression_view.draw(
                side_expression,
                side,
                draggable_paths,
                valid_targets
            ),
            draw_choice_row(side, drag_choices, pending),
        ]);
    }

    return Object.freeze({

        draw: function(equation, drag_state, drag_choices, drag_options, div_io) {
            drag_choices = drag_choices || [];
            const provisional_choice = drag_state != null && drag_choices.length === 1 &&
                ['swap', 'commute'].includes(drag_choices[0].type)? drag_choices[0] : null;
            const provisional = provisional_choice == null? equation : provisional_choice.equation;
            const valid_targets = new Set(drag_state && drag_state.candidates || []);
            const draggable_paths = new Set(
                drag_options == null? [] : equation_drag_ops.draggable_paths(provisional, drag_options)
            );
            const choices = provisional_choice == null? drag_choices : [];
            const pending = drag_state == null && choices.length > 1;

            const caveats = ExpressionCaveats.all(provisional);
            div_io.replaceChildren(
                html.div({ class:'equation-display' }, [
                    html.div({ class:'equation-row' }, [
                        draw_column(
                            provisional.contents[0],
                            '0',
                            draggable_paths,
                            valid_targets,
                            choices,
                            pending
                        ),
                        html.span({ class:'equals-sign' }, [math(relation_symbol(provisional.type), 'math-equals')]),
                        draw_column(
                            provisional.contents[1],
                            '1',
                            draggable_paths,
                            valid_targets,
                            choices,
                            pending
                        ),
                    ]),
                    ...(caveats.length === 0? [] : [
                        html.div({ class:'equation-caveats', 'aria-label':'Caveats' },
                            caveats.map(caveat =>
                                html.div({ class:'equation-caveat' }, [expression_view.draw(caveat)])
                            )
                        )
                    ]),
                ])
            );
        },

    });
}
