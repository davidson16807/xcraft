'use strict';

/*
`ExpressionEditState` identifies one structural editing position.
`path` addresses the current Expression. `offset` is a character offset for
atomic expressions and a child-boundary offset for compound expressions.
When `selected` is true, typing replaces the addressed Expression.
*/
class ExpressionEditState {
    constructor(path, offset, selected) {
        typecheck(path, 'String');
        typecheck(offset, 'Number');
        typecheck(selected, 'Boolean');
        this.path = path;
        this.offset = offset;
        this.selected = selected;
        Object.freeze(this);
    }

    with(attributes) {
        return new ExpressionEditState(
            attributes.path != null? attributes.path : this.path,
            attributes.offset != null? attributes.offset : this.offset,
            attributes.selected != null? attributes.selected : this.selected,
        );
    }
}

class ExpressionEditResult {
    constructor(expression, state) {
        typecheck(expression, 'Relation');
        typecheck(state, 'ExpressionEditState');
        this.expression = expression;
        this.state = state;
        Object.freeze(this);
    }
}
