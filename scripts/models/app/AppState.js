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
        undo_history,
        redo_history,
        theme,
        drag_options,
        drag_choices
    ) {
        this.levels = Object.freeze([...(levels || [])]);
        this.level_index = level_index;
        this.equation = equation;
        this.drag_type = drag_type;
        this.drag_state = drag_state;
        this.undo_history = Object.freeze([...(undo_history || [])]);
        this.redo_history = Object.freeze([...(redo_history || [])]);
        this.theme = theme || 'day';
        this.drag_options = Object.freeze(drag_options || { auto_simplify:true });
        this.drag_choices = Object.freeze([...(drag_choices || [])]);
        Object.freeze(this);
    }

    with(attributes) {
        return new AppState(
            attributes.levels        != null? attributes.levels           : this.levels,
            attributes.level_index   != null? attributes.level_index      : this.level_index,
            attributes.equation      != null? attributes.equation         : this.equation,
            attributes.drag_type     != null? attributes.drag_type        : this.drag_type,
            attributes.drag_state    != null? attributes.drag_state       : this.drag_state,
            attributes.undo_history  != null? attributes.undo_history     : this.undo_history,
            attributes.redo_history  != null? attributes.redo_history     : this.redo_history,
            attributes.theme         != null? attributes.theme            : this.theme,
            attributes.drag_options  != null? attributes.drag_options     : this.drag_options,
            attributes.drag_choices  != null? attributes.drag_choices     : this.drag_choices,
        );
    }
}
