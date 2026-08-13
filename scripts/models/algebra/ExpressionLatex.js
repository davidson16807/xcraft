'use strict';
// HUMAN VETTED

const ExpressionLatex = () => {

    function precedence(expression) {
        switch (expression.type) {
            case 'add': return 1;
            case 'mul': return 2;
            case 'div': return 2;
            case 'group': return 4;
            default: return 4;
        }
    }

    function encode (expression, parent_precedence) {
        const parent = parent_precedence == null? 0 : parent_precedence;
        let body;
        switch (expression.type) {
            case 'constant':
                body = String(expression.value);
                break;
            case 'variable':
                body = expression.name;
                break;
            case 'add':
                body = expression.contents.map((term, i) => {
                    const mono = coefficient_and_basis(term);
                    const negative = mono.coefficient < 0;
                    const abs = negative?
                        from_coefficient_and_basis(-mono.coefficient, mono.basis) : term;
                    const latex = encode(abs, 1);
                    if (i === 0) return negative? `-${latex}` : latex;
                    return negative? `-${latex}` : `+${latex}`;
                }).join('');
                break;
            case 'mul':
                body = expression.contents.map((factor, i) => {
                    const latex = encode(factor, 2);
                    if (i === 0) return latex;
                    const previous = expression.contents[i-1];
                    const dot = previous.type === 'constant' && factor.type === 'constant'? '\\cdot ' : '';
                    return dot + latex;
                }).join('');
                break;
            case 'div':
                body = `\\frac{${encode(expression.numerator, 0)}}{${encode(expression.denominator, 0)}}`;
                break;
            case 'group':
                body = `\\left(${encode(expression.expression, 0)}\\right)`;
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
