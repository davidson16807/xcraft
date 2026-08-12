'use strict';

function EquationView(dependencies) {
    const html = dependencies.html;
    const equation_ops = dependencies.equation_ops;
    const render = dependencies.render;

    function math(latex, class_name) {
        const node = html.span({ class: class_name || 'math-atom' }, []);
        render(latex, node, { throwOnError: false, output: 'html' });
        return node;
    }

    function sign_and_absolute(expression) {
        const mono = Expression.coefficient_and_basis(expression);
        if (mono.coefficient < 0) {
            return {
                sign: -1,
                absolute: Expression.from_coefficient_and_basis(-mono.coefficient, mono.basis),
            };
        }
        return { sign: 1, absolute: expression };
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

    function draw_expression(expression, path, draggable_paths, valid_targets, options) {
        const opts = options || {};
        const wrapper = html.span(path_attributes(path, draggable_paths, valid_targets), []);

        switch (expression.type) {
            case 'constant':
                wrapper.appendChild(math(String(expression.value)));
                break;

            case 'variable':
                wrapper.appendChild(math(expression.name));
                break;

            case 'add':
                wrapper.classList.add('expression-add');
                expression.terms.forEach((term, i) => {
                    const signed = sign_and_absolute(term);
                    const term_path = `${path}/${i}`;
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
                break;

            case 'mul':
                wrapper.classList.add('expression-mul');
                expression.factors.forEach((factor, i) => {
                    if (
                        i > 0 &&
                        expression.factors[i-1].type === 'constant' &&
                        factor.type === 'constant'
                    ) wrapper.appendChild(math('\\cdot', 'math-operator multiplication-dot'));
                    wrapper.appendChild(draw_expression(
                        factor,
                        `${path}/${i}`,
                        draggable_paths,
                        valid_targets
                    ));
                });
                break;

            case 'div': {
                wrapper.classList.add('expression-fraction');
                const numerator = html.span({ class:'fraction-numerator' }, [
                    draw_expression(expression.numerator, `${path}/n`, draggable_paths, valid_targets)
                ]);
                const denominator = html.span({ class:'fraction-denominator' }, [
                    draw_expression(expression.denominator, `${path}/d`, draggable_paths, valid_targets)
                ]);
                wrapper.appendChild(numerator);
                wrapper.appendChild(denominator);
                break;
            }

            case 'group':
                wrapper.classList.add('expression-group');
                wrapper.appendChild(math('(', 'math-paren'));
                wrapper.appendChild(draw_expression(
                    expression.expression,
                    `${path}/g`,
                    draggable_paths,
                    valid_targets
                ));
                wrapper.appendChild(math(')', 'math-paren'));
                break;
        }

        if (opts.ghost) wrapper.classList.add('drag-ghost-expression');
        return wrapper;
    }

    /*
    Draw the contents of a node without duplicating its outer path wrapper.
    This is used for signed addends so the visible sign and term behave as one
    draggable addend while child factors keep their own paths.
    */
    function draw_expression_contents(expression, path, draggable_paths, valid_targets) {
        if (expression.type === 'constant') return math(String(expression.value));
        if (expression.type === 'variable') return math(expression.name);

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
        const source = EquationPaths.resolve(equation, drag_state.source_path);
        if (!source) return null;
        const ghost = html.div({ class:'drag-ghost' }, []);
        const latex = Expression.to_latex(source);
        render(latex, ghost, { throwOnError:false, output:'html' });
        ghost.style.left = `${drag_state.current.x}px`;
        ghost.style.top = `${drag_state.current.y}px`;
        return ghost;
    }

    return Object.freeze({
        draw: function(container, equation, drag_state) {
            const valid_targets = new Set(drag_state && drag_state.candidates || []);
            const draggable_paths = new Set(equation_ops.draggable_paths(equation));

            container.replaceChildren();
            const row = html.div({ class:'equation-row' }, [
                draw_side(equation.left, 'L', draggable_paths, valid_targets),
                html.span({ class:'equals-sign' }, [math('=', 'math-equals')]),
                draw_side(equation.right, 'R', draggable_paths, valid_targets),
            ]);
            container.appendChild(row);

            const ghost = draw_ghost(equation, drag_state);
            if (ghost) container.appendChild(ghost);
        },
    });
}
