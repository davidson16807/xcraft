'use strict';

function EquationView(dependencies) {

    const html = dependencies.html;
    const equations = dependencies.equations;
    const paths = dependencies.equation_paths;
    const expressions = dependencies.expressions;
    const render = dependencies.render;

    function math(latex, class_name) {
        const node = html.span({ class: class_name || 'math-atom' }, []);
        render(latex, node, { throwOnError: false, output: 'html' });
        return node;
    }

    function path_attributes(path, draggable_paths, valid_targets, classes) {
        const attrs = {
            class: 'expression-node ' + (classes || ''),
            'data-path': path,
            'data-drop-key': `path:${path}`,
        };
        if (draggable_paths.has(path)) {
            attrs.class += ' draggable-symbol';
            attrs['data-draggable'] = '1';
        }
        if (valid_targets.has(`path:${path}`)) {
            attrs.class += ' valid-drop';
            attrs['data-valid-drop'] = '1';
        }
        return attrs;
    }

    function product_factor_nodes(expression, node, previous_expression) {
        return (
            previous_expression &&
            previous_expression.type === 'constant' &&
            expression.type === 'constant'
        )? [math('\\cdot', 'math-operator multiplication-dot'), node] : [node];
    }

    function draw_reciprocal_factor(expression, path, draggable_paths, valid_targets) {
        return html.span(path_attributes(path, draggable_paths, valid_targets, 'expression-reciprocal'), [
            draw_expression(
                expression.contents[0],
                paths.base(path),
                draggable_paths,
                valid_targets
            )
        ]);
    }

    function draw_mul(expression, path, draggable_paths, valid_targets) {
        const items =  expression.contents.map(
            (factor, i) => ({ factor:factor, path:paths.nary(path, i) })
        );
        const numerator = items.filter(item => !expressions.is_reciprocal(item.factor));
        const denominator = items.filter(item => expressions.is_reciprocal(item.factor));

        if (denominator.length === 0) {

            return html.span(
                path_attributes(path, draggable_paths, valid_targets, 'expression-mul'), 
                numerator.map((item, i) => 
                    product_factor_nodes(
                        item.factor,
                        draw_expression(item.factor, item.path, draggable_paths, valid_targets),
                        i > 0? numerator[i-1].factor : null
                    )
                ).flat()
            );

        } else {

            const numerator_node = html.span({ class:'fraction-numerator' }, 
                numerator.length === 0? 
                    [math('1')]
                  : numerator.map((item, i) => 
                        product_factor_nodes(
                            item.factor,
                            draw_expression(item.factor, item.path, draggable_paths, valid_targets),
                            i > 0? numerator[i-1].factor : null
                        )
                    ).flat()
            );

            const denominator_node = html.span({ class:'fraction-denominator' }, 
                denominator.map((item, i) => {
                    return product_factor_nodes(
                        item.factor.contents[0],
                        draw_reciprocal_factor(item.factor, item.path, draggable_paths, valid_targets),
                        i > 0? denominator[i-1].factor.contents[0] : null
                    );
                }).flat()
            );

            return html.span(
                path_attributes(path, draggable_paths, valid_targets, 'expression-mul expression-fraction'), 
                [numerator_node, denominator_node]
            );

        }

    }

    function draw_expression(expression, path, draggable_paths, valid_targets) {

        switch (expression.type) {
            case 'constant':
                return html.span(path_attributes(path, draggable_paths, valid_targets), [math(String(expression.contents))]);

            case 'variable':
                return html.span(path_attributes(path, draggable_paths, valid_targets), [math(expression.contents)]);

            case 'add':
                return html.span(path_attributes(path, draggable_paths, valid_targets, 'expression-add'), 
                    expression.contents.map((term, i) => {
                        const signed = equations.sign_and_absolute(term);
                        const term_path = paths.nary(path, i);
                        return html.span(path_attributes(term_path, draggable_paths, valid_targets, 'addend'), 
                            [
                                ...(i > 0)? [math(signed.sign < 0? '-' : '+', 'math-operator')]
                                 : signed.sign < 0? [math('-', 'math-operator')]
                                 : [],
                                draw_expression_contents(
                                    signed.absolute,
                                    term_path,
                                    draggable_paths,
                                    valid_targets
                                )
                            ]);
                    })
                );

            case 'mul':
                return draw_mul(expression, path, draggable_paths, valid_targets);

            case 'pow': {
                const base = expression.contents[0];
                const exponent = expression.contents[1];

                if (expressions.is_reciprocal(expression)) {
                    return html.span(
                        path_attributes(path, draggable_paths, valid_targets, 'expression-fraction'), 
                        [
                            html.span({ class:'fraction-numerator' }, [math('1')]),
                            html.span({ class:'fraction-denominator' }, [
                                draw_expression(base, paths.base(path), draggable_paths, valid_targets)
                            ]),
                        ]
                    );
                } else {
                    return html.span(
                        path_attributes(path, draggable_paths, valid_targets, 'expression-power'), 
                        [
                            draw_expression(
                                base,
                                paths.base(path),
                                draggable_paths,
                                valid_targets
                            ),
                            html.node('sup', { class:'power-exponent' }, [
                                draw_expression(
                                    exponent,
                                    paths.exponent(path),
                                    draggable_paths,
                                    valid_targets
                                )
                            ]),
                        ]
                    );
                }

            }

            case 'group':
                return html.span(
                    path_attributes(path, draggable_paths, valid_targets, 'expression-group'), 
                    [
                        math('(', 'math-paren'),
                        draw_expression(
                            expression.contents,
                            paths.group(path),
                            draggable_paths,
                            valid_targets
                        ),
                        math(')', 'math-paren')
                    ]
                );
        }

    }

    /*
    Draw the contents of a node without duplicating its outer path wrapper.
    This is used for signed addends so the visible sign and term behave as one
    draggable addend while child factors keep their own paths.
    */
    function draw_expression_contents(expression, path, draggable_paths, valid_targets) {
        if (expression.type === 'constant') return math(String(expression.contents));
        if (expression.type === 'variable') return math(expression.contents);

        const node = draw_expression(expression, path, draggable_paths, valid_targets);
        node.removeAttribute('data-path');
        node.removeAttribute('data-drop-key');
        node.removeAttribute('data-draggable');
        node.removeAttribute('data-valid-drop');
        node.classList.remove('draggable-symbol', 'valid-drop');
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
            draw_expression(expression, side, draggable_paths, valid_targets)
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
