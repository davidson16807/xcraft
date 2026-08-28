'use strict';
// HUMAN VETTED

/*
`Orderlike` describes a relational structure. Its operations embody the
properties of that structure; callers request an operation rather than inspect
those properties to determine applicability.
*/
const Orderlike = (label, properties, evaluatable) => {
    typecheck(label, 'String');
    typecheck(properties, 'Object');
    typecheck(evaluatable, 'Function');
    const is_reflexive = !!properties.is_reflexive;
    const is_symmetric = !!properties.is_symmetric;
    const is_transitive = !!properties.is_transitive;
    const is_antisymmetric = !!properties.is_antisymmetric;
    const is_asymmetric = !!properties.is_asymmetric;
    const converse = properties.converse;

    const evaluator = evaluate => relation => {
        const left = evaluate(relation.left);
        const right = evaluate(relation.right);
        return Number.isFinite(left) && Number.isFinite(right)? evaluatable(left, right) : undefined;
    };

    function swap(relation) {
        typecheck(relation, 'Relation');
        if (relation.type !== label || converse == null) return relation;
        return relation.with({
            type: converse,
            left: relation.right,
            right: relation.left,
        });
    }

    return Object.freeze({
        label,
        converse,
        is_reflexive,
        is_symmetric,
        is_transitive,
        is_antisymmetric,
        is_asymmetric,
        swap,
        evaluator,
    });
};
