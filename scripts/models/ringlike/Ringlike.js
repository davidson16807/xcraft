'use strict';
// HUMAN VETTED

/*
Coordinates unary ring-like inverse behavior and resolves candidate rewrites
from the mathematical relation structures registered in this layer.
*/
const Ringlike = (ringlikes_expressions_for_tag, expression_shape) => {

    const structures = Object.freeze(
        [...new Set(Object.values(ringlikes_expressions_for_tag).filter(x => x != null))]
    );

    function unique(candidates) {
        const by_value = new Map();
        candidates
            .filter(candidate => candidate != null)
            .forEach(candidate => {
                const key = expression_shape == null?
                    JSON.stringify(candidate) : expression_shape.encode(candidate);
                if (!by_value.has(key)) by_value.set(key, candidate);
            });
        return [...by_value.values()];
    }

    function combinations(type, left, right) {
        return Object.freeze(unique(structures.flatMap(structure => {
            if (structure.combine_candidates != null) {
                return structure.combine_candidates(type, left, right);
            }
            if (structure.combine == null) return [];
            const combined = structure.combine(left, right);
            return combined == null? [] : [combined];
        })));
    }

    function combine(type, left, right) {
        const candidates = combinations(type, left, right);
        return candidates.length === 1? candidates[0] : null;
    }

    function inverse(type, expression) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type == null? null :
            group_expression_for_type.inverse(expression);
    }

    function is_inverse(type, expression) {
        const group_expression_for_type = ringlikes_expressions_for_tag[type];
        return group_expression_for_type != null &&
            group_expression_for_type.is_inverse(expression);
    }

    function absolute(type, expression) {
        return is_inverse(type, expression)? inverse(type, expression) : expression;
    }

    function left_distributions(parent, left, right) {
        return Object.freeze(unique(structures.flatMap(structure => {
            if (structure.left_distribute_candidates != null) {
                return structure.left_distribute_candidates(parent, left, right);
            }
            if (structure.left_distribute == null) return [];
            const distributed = structure.left_distribute(parent, left, right);
            return distributed == null? [] : [distributed];
        })));
    }

    function right_distributions(parent, left, right) {
        return Object.freeze(unique(structures.flatMap(structure => {
            if (structure.right_distribute_candidates != null) {
                return structure.right_distribute_candidates(parent, left, right);
            }
            if (structure.right_distribute == null) return [];
            const distributed = structure.right_distribute(parent, left, right);
            return distributed == null? [] : [distributed];
        })));
    }

    // Compatibility API for callers that already selected one ring-like
    // structure.  Equation rewrites use the plural candidate APIs above.
    function left_distribute(type, parent, left, right) {
        const structure = ringlikes_expressions_for_tag[type];
        if (structure == null) return null;
        const candidates = structure.left_distribute_candidates == null?
            [structure.left_distribute(parent, left, right)] :
            structure.left_distribute_candidates(parent, left, right);
        const filtered = unique(candidates);
        return filtered.length === 1? filtered[0] : null;
    }

    function right_distribute(type, parent, left, right) {
        const structure = ringlikes_expressions_for_tag[type];
        if (structure == null) return null;
        const candidates = structure.right_distribute_candidates == null?
            [structure.right_distribute(parent, left, right)] :
            structure.right_distribute_candidates(parent, left, right);
        const filtered = unique(candidates);
        return filtered.length === 1? filtered[0] : null;
    }

    return Object.freeze({
        combine,
        combinations,
        inverse,
        is_inverse,
        absolute,
        left_distribute,
        right_distribute,
        left_distributions,
        right_distributions,
    });
};
