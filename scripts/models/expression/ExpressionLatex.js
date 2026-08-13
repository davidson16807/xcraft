'use strict';
// HUMAN VETTED

const ExpressionLatex = (expressions, scales) => {

    function precedence(expression) {
        switch (expression.type) {
            case 'add': return 1;
            case 'mul': return 2;
            case 'pow': return 3;
            case 'group': return 4;
            default: return 4;
        }
    }

    function encode_product(factors) {
        return factors.map((factor, i) => {
            const factor_latex = encode(factor, 2);
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

        if (denominator.length === 0) return encode_product(numerator);

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
                    body = `${encode(base, 3)}^{${encode(exponent, 0)}}`;
                }
                break;
            }

            case 'group':
                body = `\\left(${encode(expression.contents, 0)}\\right)`;
                break;

            default:
                body = '?';
        }

        if (precedence(expression) < parent && expression.type !== 'group') {
            return `\\left(${body}\\right)`;
        }
        return body;
    }

    return Object.freeze({encode});

};
