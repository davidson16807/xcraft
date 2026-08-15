'use strict';

function ExpressionView(dependencies) {

    const html = dependencies.html;
    const paths = dependencies.expression_paths;
    const expressions = dependencies.expressions;
    const scales = dependencies.scale_expressions;
    const render = dependencies.render;

    const empty_paths = new Set();

    function math(latex, class_name) {
        const node = html.span({ class: class_name || 'math-atom' }, []);
        render(latex, node, { throwOnError: false, output: 'html' });
        return node;
    }

    function maybe_parenthesize(node, expression, parent_precedence, is_power_base) {
        const needs_parentheses =
            expressions.precedence(expression) < parent_precedence ||
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
        return html.span(path_attributes(path, draggable_paths, valid_targets, 'expression-reciprocal factor'), [
            draw(
                expression.contents[0],
                paths.base(path),
                draggable_paths,
                valid_targets,
                parent_precedence
            )
        ]);
    }

    function factor_node(node) {
        node.classList.add('factor');
        return node;
    }

    function draw_mul(expression, path, draggable_paths, valid_targets) {
        const items = expression.contents.map(
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
                        factor_node(draw(item.factor, item.path, draggable_paths, valid_targets, 2)),
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
                        factor_node(draw(item.factor, item.path, draggable_paths, valid_targets, numerator_parent)),
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

    function _draw(expression, path, draggable_paths, valid_targets, parent_precedence, is_power_base) {
        draggable_paths = draggable_paths || empty_paths;
        valid_targets = valid_targets || empty_paths;
        switch (expression.type) {
            case 'constant':
                return html.span(path_attributes(path, draggable_paths, valid_targets), [math(String(expression.contents))]);

            case 'variable':
                return html.span(path_attributes(path, draggable_paths, valid_targets), [math(expression.contents)]);

            case 'add': {
                const is_singleton_side = expression.contents.length === 1;
                return html.span(path_attributes(path, draggable_paths, valid_targets, 'expression-add'),
                    expression.contents.map((term, i) => {
                        /*
                        A singleton top-level add is an interaction wrapper, not
                        notation that needs sign normalization.  Drawing its term
                        directly preserves the nested mul/factor path, so a lone x
                        exposes both +x and ×x drag affordances.
                        */
                        const sign = is_singleton_side? 1 : scales.sign(term);
                        const visible = is_singleton_side? term : scales.absolute(term);
                        const term_path = paths.nary(path, i);
                        return html.span(path_attributes(term_path, draggable_paths, valid_targets, 'addend'),
                            [
                                ...(i > 0)? [math(sign < 0? '-' : '+', 'math-operator')]
                                 : sign < 0? [math('-', 'math-operator')]
                                 : [],
                                draw_contents(
                                    visible,
                                    term_path,
                                    draggable_paths,
                                    valid_targets
                                )
                            ]);
                    })
                );
            }

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
                                draw(base, paths.base(path), draggable_paths, valid_targets, 0)
                            ]),
                        ]
                    );
                } else {
                    return html.span(
                        path_attributes(path, draggable_paths, valid_targets, 'expression-power'),
                        [
                            draw(
                                base,
                                paths.base(path),
                                draggable_paths,
                                valid_targets,
                                3,
                                true
                            ),
                            html.node('sup', { class:'power-exponent' }, [
                                draw(
                                    exponent,
                                    paths.exponent(path),
                                    draggable_paths,
                                    valid_targets,
                                    0
                                )
                            ]),
                        ]
                    );
                }
            }

            default:
                return html.span(path_attributes(path, draggable_paths, valid_targets), [math('?')]);
        }
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

    return Object.freeze({ draw: draw });

}
