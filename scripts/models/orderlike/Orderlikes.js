'use strict';
// HUMAN VETTED

/* Dispatches operations to the orderlike associated with a relation tag. */
const Orderlikes = orderlike_for_tag => {

    function swap(relation) {
        const structure = orderlike_for_tag[relation.type];
        return structure == null? relation : structure.swap(relation);
    }

    return Object.freeze({ swap });
};
