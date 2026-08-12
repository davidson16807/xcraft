'use strict';

/*
`AppState` contains all application state.  Model values are immutable so the
undo/redo stacks can store references to old states cheaply and safely.
*/
class AppState {
    constructor(
        level_index,
        equation,
        drag_type,
        drag_state,
        undo_history,
        redo_history,
        move_count,
        completed_levels,
        theme
    ) {
        this.level_index = level_index;
        this.equation = equation;
        this.drag_type = drag_type;
        this.drag_state = drag_state;
        this.undo_history = Object.freeze([...(undo_history || [])]);
        this.redo_history = Object.freeze([...(redo_history || [])]);
        this.move_count = move_count || 0;
        this.completed_levels = Object.freeze([...(completed_levels || [])]);
        this.theme = theme || 'day';
        Object.freeze(this);
    }

    with(attributes) {
        return new AppState(
            attributes.level_index      != null? attributes.level_index      : this.level_index,
            attributes.equation         != null? attributes.equation         : this.equation,
            attributes.drag_type        != null? attributes.drag_type        : this.drag_type,
            attributes.drag_state       != null? attributes.drag_state       : this.drag_state,
            attributes.undo_history     != null? attributes.undo_history     : this.undo_history,
            attributes.redo_history     != null? attributes.redo_history     : this.redo_history,
            attributes.move_count       != null? attributes.move_count       : this.move_count,
            attributes.completed_levels != null? attributes.completed_levels : this.completed_levels,
            attributes.theme            != null? attributes.theme            : this.theme,
        );
    }
}
