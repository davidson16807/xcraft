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

    function path_attributes(path, draggable_paths, valid_targets) {
        const attrs = {
            class: 'expression-node',
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

    function append_product_factor(wrapper, expression, node, previous_expression) {
        if (
            previous_expression &&
            previous_expression.type === 'constant' &&
            expression.type === 'constant'
        ) {
            wrapper.appendChild(math('\\cdot', 'math-operator multiplication-dot'));
        }
        wrapper.appendChild(node);
    }

    function draw_reciprocal_factor(expression, path, draggable_paths, valid_targets) {
        const wrapper = html.span(path_attributes(path, draggable_paths, valid_targets), []);
        wrapper.classList.add('expression-reciprocal');
        wrapper.appendChild(draw_expression(
            expression.contents[0],
            paths.base(path),
            draggable_paths,
            valid_targets
        ));
        return wrapper;
    }

    function draw_mul(expression, path, attributes, draggable_paths, valid_targets) {
        const numerator = [];
        const denominator = [];

        expression.contents.forEach((factor, i) => {
            const item = { factor:factor, path:paths.nary(path, i) };
            if (expressions.is_reciprocal(factor)) denominator.push(item);
            else numerator.push(item);
        });

        if (denominator.length === 0) {
            const wrapper = html.span(attributes);
            wrapper.classList.add('expression-mul');
            numerator.forEach((item, i) => append_product_factor(
                wrapper,
                item.factor,
                draw_expression(item.factor, item.path, draggable_paths, valid_targets),
                i > 0? numerator[i-1].factor : null
            ));
            return wrapper;
        }

        const wrapper = html.span(attributes);
        wrapper.classList.add('expression-mul', 'expression-fraction');

        const numerator_node = html.span({ class:'fraction-numerator' }, []);
        if (numerator.length === 0) {
            numerator_node.appendChild(math('1'));
        } else {
            numerator.forEach((item, i) => append_product_factor(
                numerator_node,
                item.factor,
                draw_expression(item.factor, item.path, draggable_paths, valid_targets),
                i > 0? numerator[i-1].factor : null
            ));
        }

        const denominator_node = html.span({ class:'fraction-denominator' }, []);
        denominator.forEach((item, i) => {
            const base = item.factor.contents[0];
            append_product_factor(
                denominator_node,
                base,
                draw_reciprocal_factor(item.factor, item.path, draggable_paths, valid_targets),
                i > 0? denominator[i-1].factor.contents[0] : null
            );
        });

        wrapper.appendChild(numerator_node);
        wrapper.appendChild(denominator_node);
        return wrapper;
    }

    function draw_expression(expression, path, draggable_paths, valid_targets) {
        const attributes = path_attributes(path, draggable_paths, valid_targets);
        let wrapper;

        switch (expression.type) {
            case 'constant':
                return html.span(attributes, [math(String(expression.contents))]);

            case 'variable':
                return html.span(attributes, [math(expression.contents)]);

            case 'add':
                wrapper = html.span(attributes);
                wrapper.classList.add('expression-add');
                expression.contents.forEach((term, i) => {
                    const signed = equations.sign_and_absolute(term);
                    const term_path = paths.nary(path, i);
                    const term_wrapper = html.span(path_attributes(term_path, draggable_paths, valid_targets), []);
                    term_wrapper.classList.add('addend');
                    if (i > 0) {
                        term_wrapper.appendChild(math(signed.sign < 0? '-' : '+', 'math-operator'));
                    } else if (signed.sign < 0) {
                        term_wrapper.appendChild(math('-', 'math-operator'));
                    }
                    const absolute_node = draw_expression_contents(
                        signed.absolute,
                        term_path,
                        draggable_paths,
                        valid_targets
                    );
                    term_wrapper.appendChild(absolute_node);
                    wrapper.appendChild(term_wrapper);
                });
                return wrapper;

            case 'mul':
                return draw_mul(expression, path, attributes, draggable_paths, valid_targets);

            case 'pow': {
                const base = expression.contents[0];
                const exponent = expression.contents[1];

                if (expressions.is_reciprocal(expression)) {
                    wrapper = html.span(attributes);
                    wrapper.classList.add('expression-fraction');
                    wrapper.appendChild(html.span({ class:'fraction-numerator' }, [math('1')]));
                    wrapper.appendChild(html.span({ class:'fraction-denominator' }, [
                        draw_expression(base, paths.base(path), draggable_paths, valid_targets)
                    ]));
                    return wrapper;
                }

                wrapper = html.span(attributes);
                wrapper.classList.add('expression-power');
                wrapper.appendChild(draw_expression(
                    base,
                    paths.base(path),
                    draggable_paths,
                    valid_targets
                ));
                wrapper.appendChild(html.node('sup', { class:'power-exponent' }, [
                    draw_expression(
                        exponent,
                        paths.exponent(path),
                        draggable_paths,
                        valid_targets
                    )
                ]));
                return wrapper;
            }

            case 'group':
                wrapper = html.span(attributes);
                wrapper.classList.add('expression-group');
                wrapper.appendChild(math('(', 'math-paren'));
                wrapper.appendChild(draw_expression(
                    expression.contents,
                    paths.group(path),
                    draggable_paths,
                    valid_targets
                ));
                wrapper.appendChild(math(')', 'math-paren'));
                return wrapper;
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
