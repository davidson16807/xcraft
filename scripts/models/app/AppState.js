'use strict';

/*
`AppState` contains all application state. Model values are immutable so the
undo/redo stacks can store references to old states cheaply and safely.
*/
class AppState {
    constructor(
        levels,
        level_index,
        equation,
        drag_type,
        drag_state,
        drag_choices,
        undo_history,
        redo_history,
        theme,
        drag_options,
        history_visible,
        editing,
        edit_state
    ) {
        typecheck(levels, 'Array+1');
        typecheck(level_index, 'Number');
        typecheck(equation, 'Relation');
        typecheck(drag_type, 'Object');
        typecheck(drag_state, 'Object');
        typecheck(drag_choices, 'Array+1');
        typecheck(undo_history, 'Array+1');
        typecheck(redo_history, 'Array+1');
        typecheck(theme, 'String+1');
        typecheck(drag_options, 'Object+1');
        typecheck(history_visible, 'Boolean+1');
        typecheck(editing, 'Boolean+1');
        typecheck(edit_state, 'ExpressionEditState+1');
        this.levels = Object.freeze([...(levels || [])]);
        this.level_index = level_index;
        this.equation = equation;
        this.drag_type = drag_type;
        this.drag_state = drag_state;
        this.drag_choices = Object.freeze([...(drag_choices || [])]);
        this.undo_history = Object.freeze([...(undo_history || [])]);
        this.redo_history = Object.freeze([...(redo_history || [])]);
        this.theme = theme || 'day';
        this.drag_options = Object.freeze(
            drag_options || { auto_simplify:false }
        );
        this.history_visible = !!history_visible;
        this.editing = !!editing;
        this.edit_state = edit_state || null;
        Object.freeze(this);
    }

    with(attributes) {
        return new AppState(
            attributes.levels        != null? attributes.levels           : this.levels,
            attributes.level_index   != null? attributes.level_index      : this.level_index,
            attributes.equation      != null? attributes.equation         : this.equation,
            attributes.drag_type     != null? attributes.drag_type        : this.drag_type,
            attributes.drag_state    != null? attributes.drag_state       : this.drag_state,
            attributes.drag_choices  != null? attributes.drag_choices     : this.drag_choices,
            attributes.undo_history  != null? attributes.undo_history     : this.undo_history,
            attributes.redo_history  != null? attributes.redo_history     : this.redo_history,
            attributes.theme         != null? attributes.theme            : this.theme,
            attributes.drag_options  != null? attributes.drag_options     : this.drag_options,
            attributes.history_visible != null? attributes.history_visible : this.history_visible,
            attributes.editing        != null? attributes.editing        : this.editing,
            attributes.edit_state     !== undefined? attributes.edit_state : this.edit_state,
        );
    }
}
