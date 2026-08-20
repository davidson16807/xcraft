'use strict';

/*
Programmatic resolver for user-facing expression operations. Mathematical
implementations may overlap. Within one operation, interpretations are
deduplicated structurally and resolve as none, one result, or ambiguous.
Top-level drag priority (combine -> distribute -> commute) remains outside this
object, but an ambiguous higher-priority operation blocks fallback.
*/
const ExpressionOperations = (dependencies) => {
    const grouplikes = dependencies.grouplikes;
    const ringlikes = dependencies.ringlikes;
    const shape = dependencies.expression_shape;

    function resolve(expressions) {
        const results = new Map();
        expressions.filter(expression => expression != null).forEach(expression =>
            results.set(shape.encode(expression), expression)
        );
        if (results.size === 0) return Object.freeze({ status:'none', expression:null });
        if (results.size > 1) return Object.freeze({ status:'ambiguous', expression:null });
        return Object.freeze({ status:'resolved', expression:[...results.values()][0] });
    }

    function combine(parent, left, right) {
        const local = grouplikes.combine(parent.type, left, right);
        if (local != null) return Object.freeze({ status:'resolved', expression:local });

        return resolve([
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

        return resolve([
            legacy,
            ...ringlikes.laws.map(law => law.distribute == null? null : law.distribute(parent, source, target)),
        ]);
    }

    return Object.freeze({
        combine,
        distribute,
    });
};
