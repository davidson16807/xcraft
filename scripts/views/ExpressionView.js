'use strict';

function ExpressionView(dependencies) {

    const html = dependencies.html;
    const paths = dependencies.expression_paths;
    const grouplikes = dependencies.grouplikes;
    const ringlikes = dependencies.ringlikes;
    const render = dependencies.render;
    const precedence_for_tag = dependencies.precedence_for_tag;

    const empty_paths = new Set();

    function math(latex, class_name) {
        const node = html.span({ class: class_name || 'math-atom' }, []);
        render(latex, node, { throwOnError: false, output: 'html' });
        return node;
    }

    function maybe_parenthesize(node, expression, parent_precedence, is_power_base) {
        const needs_parentheses =
            precedence_for_tag(expression.type) < parent_precedence ||
            (is_power_base && expression.type === 'pow');

        if (!needs_parentheses) return node;

        node.insertBefore(math('(', 'math-paren'), node.firstChild);
        node.appendChild(math(')', 'math-paren'));
        return node;
    }

    function path_attributes(path, draggable_paths, valid_targets, classes) {
        const attrs = {
            class: 'expression-node ' + (classes || ''),
        };
        if (path == null) return attrs;

        attrs['data-path'] = path;
        attrs['data-drop-key'] = `path:${path}`;
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
        if (previous_expression && expression.type === 'constant' && expression.contents < 0) {
            node.insertBefore(math('(', 'math-paren'), node.firstChild);
            node.appendChild(math(')', 'math-paren'));
            return [math('\\cdot', 'math-operator multiplication-dot'), node];
        }

        return (
            previous_expression &&
            previous_expression.type === 'constant' &&
            expression.type === 'constant'
        )? [math('\\cdot', 'math-operator multiplication-dot'), node] : [node];
    }

    function draw_reciprocal_factor(expression, path, draggable_paths, valid_targets, parent_precedence) {
        return html.span(path_attributes(path, draggable_paths, valid_targets, 'expression-reciprocal'), [
            draw(
                expression.contents[0],
                paths.base(path),
                draggable_paths,
                valid_targets,
                parent_precedence
            )
        ]);
    }

    function draw_mul(expression, path, draggable_paths, valid_targets) {
        const items = expression.contents.map(
            (factor, i) => ({ factor:factor, path:paths.nary(path, i) })
        );
        const numerator = items.filter(item => !ringlikes.is_inverse('mul', item.factor));
        const denominator = items.filter(item => ringlikes.is_inverse('mul', item.factor));

        if (denominator.length === 0) {
            return html.span(
                path_attributes(path, draggable_paths, valid_targets, 'expression-mul'),
                numerator.map((item, i) =>
                    product_factor_nodes(
                        item.factor,
                        draw(item.factor, item.path, draggable_paths, valid_targets, 2),
                        i > 0? numerator[i-1].factor : null
                    )
                ).flat()
            );
        }

        const numerator_parent = numerator.length === 1? 0 : 2;
        const denominator_parent = denominator.length === 1? 0 : 2;

        const numerator_node = html.span({ class:'fraction-numerator' },
            numerator.length === 0?
                [math('1')]
              : numerator.map((item, i) =>
                    product_factor_nodes(
                        item.factor,
                        draw(item.factor, item.path, draggable_paths, valid_targets, numerator_parent),
                        i > 0? numerator[i-1].factor : null
                    )
                ).flat()
        );

        const denominator_node = html.span({ class:'fraction-denominator' },
            denominator.map((item, i) =>
                product_factor_nodes(
                    item.factor.contents[0],
                    draw_reciprocal_factor(
                        item.factor,
                        item.path,
                        draggable_paths,
                        valid_targets,
                        denominator_parent
                    ),
                    i > 0? denominator[i-1].factor.contents[0] : null
                )
            ).flat()
        );

        return html.span(
            path_attributes(path, draggable_paths, valid_targets, 'expression-mul expression-fraction'),
            [numerator_node, denominator_node]
        );
    }

    function draw_harmonic(expression, path, draggable_paths, valid_targets) {
        const reciprocal_terms = expression.contents.map((term, i) =>
            html.span({ class:'expression-fraction harmonic-term' }, [
                html.span({ class:'fraction-numerator' }, [math('1')]),
                html.span({ class:'fraction-denominator' }, [
                    draw(term, paths.nary(path, i), draggable_paths, valid_targets, 0)
                ]),
            ])
        );
        const denominator = reciprocal_terms.flatMap((term, i) =>
            i === 0? [term] : [math('+', 'math-operator'), term]
        );

        return html.span(
            path_attributes(path, draggable_paths, valid_targets, 'expression-harmonic expression-fraction'),
            [
                html.span({ class:'fraction-numerator' }, [math('1')]),
                html.span({ class:'fraction-denominator harmonic-denominator' }, denominator),
            ]
        );
    }

    /*
    Draw the contents of a node without duplicating its outer path wrapper.
    This is used for signed addends so the visible sign and term behave as one
    draggable addend while child factors keep their own paths.
    */
    function draw_contents(expression, path, draggable_paths, valid_targets) {
        if (expression.type === 'constant') return math(String(expression.contents));
        if (expression.type === 'variable') return math(expression.contents);

        const node = draw(expression, path, draggable_paths, valid_targets, 1);
        node.removeAttribute('data-path');
        node.removeAttribute('data-drop-key');
        node.removeAttribute('data-draggable');
        node.removeAttribute('data-valid-drop');
        node.classList.remove('draggable-symbol', 'valid-drop');
        return node;
    }

    function projection_slot() {
        return math('\\square', 'power-triangle-ghost-slot');
    }

    function projection_expression(expression, parent_precedence, is_power_base) {
        return expression == null? projection_slot() :
            draw(expression, null, null, null, parent_precedence, is_power_base);
    }

    function draw_log_projection(base_node, result_node, attributes) {
        return html.span(attributes, [
            html.span({ class:'log-operator' }, [
                math('\\log', 'math-operator'),
                html.node('sub', { class:'log-base' }, [base_node]),
            ]),
            math('(', 'math-paren'),
            result_node,
            math(')', 'math-paren'),
        ]);
    }

    function draw_root_projection(exponent_node, result_node, attributes) {
        return html.span(attributes, [
            html.node('sup', { class:'root-index' }, [exponent_node]),
            html.span({ class:'root-body' }, [
                math('\\sqrt{}', 'root-radical'),
                html.span({ class:'root-radicand' }, [result_node]),
            ]),
        ]);
    }

    function draw_power_projection(base_node, exponent_node, attributes) {
        return html.span(attributes, [
            base_node,
            html.node('sup', { class:'power-exponent' }, [exponent_node]),
        ]);
    }

    function draw_power_triangle_projection(computed, vertices) {
        const attributes = { class:'expression-node power-triangle-ghost-projection' };
        switch (computed) {
        case 'result':
            return draw_power_projection(
                projection_expression(vertices.base, 3, true),
                projection_expression(vertices.exponent, 0, false),
                attributes
            );
        case 'exponent':
            return draw_log_projection(
                projection_expression(vertices.base, 0, false),
                projection_expression(vertices.result, 0, false),
                attributes
            );
        case 'base':
            return draw_root_projection(
                projection_expression(vertices.exponent, 0, false),
                projection_expression(vertices.result, 0, false),
                attributes
            );
        default:
            return projection_slot();
        }
    }

    function _draw(expression, path, draggable_paths, valid_targets, parent_precedence, is_power_base) {
        draggable_paths = draggable_paths || empty_paths;
        valid_targets = valid_targets || empty_paths;
        let node;

        switch (expression.type) {
            case 'constant':
                return html.span(path_attributes(path, draggable_paths, valid_targets), [math(String(expression.contents))]);
                break;

            case 'variable':
                return html.span(path_attributes(path, draggable_paths, valid_targets), [math(expression.contents)]);
                break;

            case 'add':
                return html.span(path_attributes(path, draggable_paths, valid_targets, 'expression-add'),
                    expression.contents.map((term, i) => {
                        const is_inverse = ringlikes.is_inverse('add', term);
                        const absolute = ringlikes.absolute('add', term);
                        const term_path = paths.nary(path, i);
                        return html.span(path_attributes(term_path, draggable_paths, valid_targets, 'addend'),
                            [
                                ...(i > 0)? [math(is_inverse? '-' : '+', 'math-operator')]
                                 : is_inverse? [math('-', 'math-operator')]
                                 : [],
                                draw_contents(
                                    absolute,
                                    term_path,
                                    draggable_paths,
                                    valid_targets
                                )
                            ]);
                    })
                );
                break;

            case 'mul':
                return draw_mul(expression, path, draggable_paths, valid_targets);
                break;

            case 'harmonic':
                return draw_harmonic(expression, path, draggable_paths, valid_targets);
                break;

            case 'log': {
                const base = expression.contents[0];
                const result = expression.contents[1];
                return draw_log_projection(
                    draw(base, paths.base(path), draggable_paths, valid_targets, 0),
                    draw(result, paths.nary(path, 1), draggable_paths, valid_targets, 0),
                    path_attributes(path, draggable_paths, valid_targets, 'expression-log')
                );
            }


            case 'root': {
                const exponent = expression.contents[0];
                const result = expression.contents[1];
                return draw_root_projection(
                    draw(exponent, paths.nary(path, 0), draggable_paths, valid_targets, 0),
                    draw(result, paths.nary(path, 1), draggable_paths, valid_targets, 0),
                    path_attributes(path, draggable_paths, valid_targets, 'expression-root')
                );
            }

            case 'pow': {
                const base = expression.contents[0];
                const exponent = expression.contents[1];

                if (ringlikes.is_inverse('mul', expression)) {
                    return html.span(
                        path_attributes(path, draggable_paths, valid_targets, 'expression-fraction'),
                        [
                            html.span({ class:'fraction-numerator' }, [math('1')]),
                            html.span({ class:'fraction-denominator' }, [
                                draw(base, paths.base(path), draggable_paths, valid_targets, 0)
                            ]),
                        ]
                    );
                } else {
                    return draw_power_projection(
                        draw(
                            base,
                            paths.base(path),
                            draggable_paths,
                            valid_targets,
                            3,
                            true
                        ),
                        draw(
                            exponent,
                            paths.exponent(path),
                            draggable_paths,
                            valid_targets,
                            0
                        ),
                        path_attributes(path, draggable_paths, valid_targets, 'expression-power')
                    );
                }
                break;
            }

            default:
                return html.span(path_attributes(path, draggable_paths, valid_targets), [math('?')]);
        }

        return node;
    }

    function draw(expression, path, draggable_paths, valid_targets, parent_precedence, is_power_base)
    {
        return maybe_parenthesize(
            _draw(expression, path, draggable_paths, valid_targets, parent_precedence, is_power_base),
            expression,
            parent_precedence == null? 0 : parent_precedence,
            !!is_power_base
        );
    }

    return Object.freeze({
        draw: draw,
        draw_power_triangle_projection: draw_power_triangle_projection,
    });

}
