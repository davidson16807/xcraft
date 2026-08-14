'use strict';
// HUMAN VETTED

const ExpressionLatex = (expressions, scales) => {

    function encode_product(factors) {
        const child_parent = factors.length === 1? 0 : 2;
        return factors.map((factor, i) => {
            const factor_latex = encode(factor, child_parent);
            if (i === 0) return factor_latex;
            const previous = factors[i-1];
            const dot = previous.type === 'constant' && factor.type === 'constant'? '\\cdot ' : '';
            return dot + factor_latex;
        }).join('');
    }

    function encode_mul(expression) {
        const numerator = expression.contents.filter(factor => !expressions.is_reciprocal(factor));
        const denominator = expression.contents
            .filter(factor => expressions.is_reciprocal(factor))
            .map(factor => factor.contents[0]);

        if (denominator.length === 0) {
            return expression.contents.map((factor, i) => {
                const factor_latex = encode(factor, 2);
                if (i === 0) return factor_latex;
                const previous = expression.contents[i-1];
                const dot = previous.type === 'constant' && factor.type === 'constant'? '\\cdot ' : '';
                return dot + factor_latex;
            }).join('');
        }

        const numerator_latex = numerator.length === 0? '1' : encode_product(numerator);
        const denominator_latex = encode_product(denominator);
        return `\\frac{${numerator_latex}}{${denominator_latex}}`;
    }

    function encode(expression, parent_precedence) {
        const parent = parent_precedence == null? 0 : parent_precedence;
        let body;

        switch (expression.type) {
            case 'constant':
                body = String(expression.contents);
                break;

            case 'variable':
                body = expression.contents;
                break;

            case 'add':
                body = expression.contents.map((term, i) => {
                    const negative = scales.sign(term) < 0;
                    const absolute = scales.absolute(term);
                    const term_latex = encode(absolute, 1);
                    if (i === 0) return negative? `-${term_latex}` : term_latex;
                    return negative? `-${term_latex}` : `+${term_latex}`;
                }).join('');
                break;

            case 'mul':
                body = encode_mul(expression);
                break;

            case 'pow': {
                const base = expression.contents[0];
                const exponent = expression.contents[1];
                if (expressions.is_reciprocal(expression)) {
                    body = `\\frac{1}{${encode(base, 0)}}`;
                } else {
                    const base_latex = base.type === 'pow'? `\\left(${encode(base, 0)}\\right)` : encode(base, 3);
                    body = `${base_latex}^{${encode(exponent, 0)}}`;
                }
                break;
            }

            default:
                body = '\\ldots';
        }

        if (expressions.precedence(expression) < parent) {
            return `\\left(${body}\\right)`;
        }
        return body;
    }

    return Object.freeze({encode});

};
