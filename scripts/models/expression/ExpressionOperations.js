'use strict';

/*
Programmatic resolver for user-facing expression operations.  Mathematical
implementations may overlap; a drag succeeds only when enabled interpretations
within the requested operation resolve to one distinct changed Expression.
Top-level drag priority (combine -> distribute -> commute) remains outside this
object.
*/
const ExpressionOperations = (dependencies) => {
    const grouplikes = dependencies.grouplikes;
    const ringlikes = dependencies.ringlikes;
    const shape = dependencies.expression_shape;

    function unique(expressions) {
        const results = new Map();
        expressions.filter(expression => expression != null).forEach(expression =>
            results.set(shape.encode(expression), expression)
        );
        return results.size === 1? [...results.values()][0] : null;
    }

    function combine(parent, left, right) {
        const local = grouplikes.combine(parent.type, left, right);
        if (local != null) return local;

        return unique([
            ringlikes.combine(parent.type, left, right),
            ...ringlikes.laws.map(law =>
                law.combine == null || law.computed_operation !== parent.type? null : law.combine(left, right)
            ),
        ]);
    }

    function distribute(parent, source, target, source_index, target_index) {
        const legacy = source_index < target_index?
            ringlikes.left_distribute(target.type, parent, source, target)
          : ringlikes.right_distribute(target.type, parent, target, source);

        return unique([
            legacy,
            ...ringlikes.laws.map(law => law.distribute == null? null : law.distribute(parent, source, target)),
        ]);
    }

    return Object.freeze({
        combine,
        distribute,
    });
};
