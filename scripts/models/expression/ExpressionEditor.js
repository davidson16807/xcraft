'use strict';

/*
Structural expression editing using the same numeric paths used by dragging.
Atoms are edited as text. Operators rewrite the current Expression and move
into the newly-created operand. Parentheses only move through structure; they
do not introduce a presentation-only model node.
*/
const ExpressionEditor = (paths, grouplikes) => {
    const slot = () => new Expression('slot');

    function _atom_text(expression) {
        switch (expression.type) {
            case 'slot': return '';
            case 'constant': return String(expression.contents);
            case 'variable': return expression.contents;
            default: return null;
        }
    }

    function _atom(text) {
        if (text === '') return slot();
        if (/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
            return grouplikes.constant(Number(text));
        }
        return grouplikes.variable(text);
    }

    function _is_reciprocal(expression) {
        return expression.type === 'pow' &&
            expression.contents[1] != null &&
            expression.contents[1].type === 'constant' &&
            expression.contents[1].contents === -1;
    }

    function _child_indexes(expression) {
        if (!Array.isArray(expression.contents)) return [];
        return _is_reciprocal(expression)? [0] : expression.contents.map((_, index) => index);
    }

    function _end(expression) {
        const text = _atom_text(expression);
        return text == null? _child_indexes(expression).length : text.length;
    }

    function _resolve(relation, state) {
        return paths.resolve(relation, state.path);
    }

    function _replace(relation, state, replacement, next_path, next_offset, selected) {
        const expression = paths.replace(relation, state.path, replacement);
        return new ExpressionEditResult(
            expression,
            new ExpressionEditState(
                next_path == null? state.path : next_path,
                next_offset == null? 0 : next_offset,
                !!selected
            )
        );
    }

    function _inside_side(path) {
        const segments = path.split('/');
        return segments.length >= 2 && (segments[0] === '0' || segments[0] === '1');
    }

    function _side_expression_path(side) {
        return `${side}/0`;
    }

    function _first(relation, path) {
        const expression = paths.resolve(relation, path);
        if (expression == null) return null;
        const text = _atom_text(expression);
        if (text != null) return new ExpressionEditState(path, 0, false);
        if (!Array.isArray(expression.contents) || expression.contents.length === 0) {
            return new ExpressionEditState(path, 0, false);
        }
        return _first(relation, paths.nary(path, 0));
    }

    function _last(relation, path) {
        const expression = paths.resolve(relation, path);
        if (expression == null) return null;
        const text = _atom_text(expression);
        if (text != null) return new ExpressionEditState(path, text.length, false);
        if (!Array.isArray(expression.contents) || expression.contents.length === 0) {
            return new ExpressionEditState(path, 0, false);
        }
        return _last(relation, paths.nary(path, expression.contents.length - 1));
    }

    function _parent_position(relation, state, after) {
        const parent_path = paths.parent(state.path);
        const parent = paths.resolve(relation, parent_path);
        if (parent == null) return state;

        if (parent.type === 'side') {
            const side = paths.segment(parent_path);
            if (after && side === '0') {
                return _first(relation, _side_expression_path('1')) || state;
            }
            if (!after && side === '1') {
                return _last(relation, _side_expression_path('0')) || state;
            }
            return state;
        }

        if (parent instanceof Relation) return state;
        const index = Number(paths.segment(state.path));
        if (!Number.isInteger(index)) return state;
        return new ExpressionEditState(parent_path, index + (after? 1 : 0), false);
    }

    function select(relation, path) {
        typecheck(relation, 'Relation');
        typecheck(path, 'String');
        let expression = paths.resolve(relation, path);
        if (expression == null) return null;
        if (expression.type === 'side') {
            path = paths.nary(path, 0);
            expression = paths.resolve(relation, path);
        }
        if (expression == null || expression instanceof Relation) return null;
        return new ExpressionEditState(path, _end(expression), true);
    }

    function left(relation, state) {
        typecheck(relation, 'Relation');
        typecheck(state, 'ExpressionEditState');
        const expression = _resolve(relation, state);
        if (expression == null) return state;
        if (state.selected) return state.with({ offset:0, selected:false });

        const text = _atom_text(expression);
        if (text != null) {
            return state.offset > 0?
                state.with({ offset:state.offset - 1 }) :
                _parent_position(relation, state, false);
        }

        const child_indexes = _child_indexes(expression);
        if (state.offset > 0) {
            return _last(
                relation,
                paths.nary(state.path, child_indexes[state.offset - 1])
            ) || state;
        }
        return _parent_position(relation, state, false);
    }

    function right(relation, state) {
        typecheck(relation, 'Relation');
        typecheck(state, 'ExpressionEditState');
        const expression = _resolve(relation, state);
        if (expression == null) return state;
        if (state.selected) return state.with({ offset:_end(expression), selected:false });

        const text = _atom_text(expression);
        if (text != null) {
            return state.offset < text.length?
                state.with({ offset:state.offset + 1 }) :
                _parent_position(relation, state, true);
        }

        const child_indexes = _child_indexes(expression);
        if (state.offset < child_indexes.length) {
            return _first(
                relation,
                paths.nary(state.path, child_indexes[state.offset])
            ) || state;
        }
        return _parent_position(relation, state, true);
    }

    function _function(relation, state, expression) {
        const text = _atom_text(expression);
        if (text === 'sqrt') {
            const replacement = new Expression('root', Object.freeze([
                grouplikes.constant(2),
                slot(),
            ]));
            return _replace(
                relation,
                state,
                replacement,
                paths.nary(state.path, 1),
                0,
                false
            );
        }
        if (text === 'log') {
            const replacement = new Expression('log', Object.freeze([
                grouplikes.constant(10),
                slot(),
            ]));
            return _replace(
                relation,
                state,
                replacement,
                paths.nary(state.path, 1),
                0,
                false
            );
        }
        return null;
    }

    function _text_input(relation, state, character) {
        let expression = _resolve(relation, state);
        if (expression == null) return new ExpressionEditResult(relation, state);

        if (state.selected) {
            const cleared = paths.replace(relation, state.path, slot());
            relation = cleared;
            state = new ExpressionEditState(state.path, 0, false);
            expression = _resolve(relation, state);
        }

        const text = _atom_text(expression);
        if (text == null) return new ExpressionEditResult(relation, state);
        const offset = Math.max(0, Math.min(text.length, state.offset));
        const replacement = _atom(text.slice(0, offset) + character + text.slice(offset));
        const result = _replace(relation, state, replacement, state.path, offset + 1, false);
        return _function(result.expression, result.state, replacement) || result;
    }

    function _operand_parts(expression, state) {
        const text = _atom_text(expression);
        if (text == null) {
            if (state.selected || state.offset === expression.contents.length) {
                return { left:expression, right:slot(), right_text:false };
            }
            return null;
        }

        if (state.selected) return { left:expression, right:slot(), right_text:false };
        const offset = Math.max(0, Math.min(text.length, state.offset));
        const left_text = text.slice(0, offset);
        const right_text = text.slice(offset);
        return {
            left: left_text === ''? null : _atom(left_text),
            right: _atom(right_text),
            right_text: right_text !== '',
        };
    }

    function _operator(relation, state, operator) {
        const expression = _resolve(relation, state);
        if (expression == null) return new ExpressionEditResult(relation, state);
        const parts = _operand_parts(expression, state);
        if (parts == null) return new ExpressionEditResult(relation, state);

        const left = parts.left;
        const right = parts.right;
        let replacement;
        let target_path;

        switch (operator) {
            case '+':
                if (left == null) return new ExpressionEditResult(relation, state);
                replacement = new Expression('add', Object.freeze([left, right]));
                target_path = paths.nary(state.path, 1);
                break;

            case '*':
                if (left == null) return new ExpressionEditResult(relation, state);
                replacement = new Expression('mul', Object.freeze([left, right]));
                target_path = paths.nary(state.path, 1);
                break;

            case '-': {
                const negative = new Expression('mul', Object.freeze([
                    grouplikes.constant(-1),
                    right,
                ]));
                if (left == null) {
                    replacement = negative;
                    target_path = paths.nary(state.path, 1);
                } else {
                    replacement = new Expression('add', Object.freeze([left, negative]));
                    target_path = paths.nary(paths.nary(state.path, 1), 1);
                }
                break;
            }

            case '/': {
                const denominator = new Expression('pow', Object.freeze([
                    right,
                    grouplikes.constant(-1),
                ]));
                if (left == null) {
                    replacement = denominator;
                    target_path = paths.nary(state.path, 0);
                } else {
                    replacement = new Expression('mul', Object.freeze([left, denominator]));
                    target_path = paths.nary(paths.nary(state.path, 1), 0);
                }
                break;
            }

            case '^':
                if (left == null) return new ExpressionEditResult(relation, state);
                replacement = new Expression('pow', Object.freeze([left, right]));
                target_path = paths.nary(state.path, 1);
                break;

            default:
                return new ExpressionEditResult(relation, state);
        }

        return _replace(
            relation,
            state,
            replacement,
            target_path,
            parts.right_text? 0 : 0,
            false
        );
    }

    function input(relation, state, character) {
        typecheck(relation, 'Relation');
        typecheck(state, 'ExpressionEditState');
        typecheck(character, 'String');

        if (character === ')') {
            return new ExpressionEditResult(relation, _parent_position(relation, state, true));
        }
        if (character === '(') {
            const unselected = state.selected? state.with({ offset:0, selected:false }) : state;
            return new ExpressionEditResult(relation, right(relation, unselected));
        }
        if (['+', '*', '-', '/', '^'].includes(character)) {
            return _operator(relation, state, character);
        }
        if (character.length !== 1 || !/[A-Za-z0-9._]/.test(character)) {
            return new ExpressionEditResult(relation, state);
        }
        return _text_input(relation, state, character);
    }

    function backspace(relation, state) {
        typecheck(relation, 'Relation');
        typecheck(state, 'ExpressionEditState');
        const expression = _resolve(relation, state);
        if (expression == null) return new ExpressionEditResult(relation, state);

        if (state.selected) {
            return _replace(relation, state, slot(), state.path, 0, false);
        }

        const text = _atom_text(expression);
        if (text == null || state.offset <= 0) {
            return new ExpressionEditResult(relation, left(relation, state));
        }
        const offset = Math.min(text.length, state.offset);
        return _replace(
            relation,
            state,
            _atom(text.slice(0, offset - 1) + text.slice(offset)),
            state.path,
            offset - 1,
            false
        );
    }

    function remove(relation, state) {
        typecheck(relation, 'Relation');
        typecheck(state, 'ExpressionEditState');
        const expression = _resolve(relation, state);
        if (expression == null) return new ExpressionEditResult(relation, state);

        if (state.selected) {
            return _replace(relation, state, slot(), state.path, 0, false);
        }

        const text = _atom_text(expression);
        if (text == null || state.offset >= text.length) {
            return new ExpressionEditResult(relation, right(relation, state));
        }
        const offset = Math.max(0, state.offset);
        return _replace(
            relation,
            state,
            _atom(text.slice(0, offset) + text.slice(offset + 1)),
            state.path,
            offset,
            false
        );
    }

    return Object.freeze({
        select,
        left,
        right,
        input,
        backspace,
        remove,
    });
};
