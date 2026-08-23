'use strict';

/*
Programmatic resolver for user-facing expression operations. Mathematical
implementations may overlap. Within one operation, interpretations are
deduplicated structurally and resolve as none, one result, or ambiguous.
Top-level drag priority (combine -> distribute -> commute) remains outside this
object, but an ambiguous higher-priority operation blocks fallback.
*/
const Expressions = (dependencies) => {
    const grouplikes = dependencies.grouplikes;
    const ringlikes = dependencies.ringlikes;
    const shape = dependencies.expression_shape;
    const laws = Object.freeze([
        ...ringlikes.laws,
        ...(dependencies.laws || []),
    ]);

    function resolve(expressions) {
        const results = new Map();
        expressions.flatMap(expression =>
            Array.isArray(expression)? expression : [expression]
        ).filter(expression => expression != null).forEach(expression =>
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
            ...laws.map(law =>
                law.combine == null? null : law.combine(parent.type, left, right)
            ),
        ]);
    }

    function distribute(parent, source, target, source_index, target_index) {
        const legacy = source_index < target_index?
            ringlikes.left_distribute(target.type, parent, source, target)
          : ringlikes.right_distribute(target.type, parent, target, source);

        return resolve([
            legacy,
            ...laws.map(law => law.distribute == null? null : law.distribute(parent, source, target)),
        ]);
    }

    function cancel(outer, inner, outer_fixed, inner_fixed) {
        return resolve(laws.map(law =>
            law.strip == null? null :
                law.strip(outer, inner, outer_fixed, inner_fixed)
        ));
    }

    function balance(parent, source, target) {
        const results = new Map();
        laws.forEach(law => {
            if (law.cancel == null || law.append == null) return;
            const new_source = law.cancel(parent, source);
            if (new_source == null) return;
            const new_target = law.append(parent, source, target);
            if (new_target == null) return;
            const key = `${shape.encode(new_source)}=${shape.encode(new_target)}`;
            results.set(key, Object.freeze({ source:new_source, target:new_target }));
        });
        if (results.size === 0) return Object.freeze({ status:'none', source:null, target:null });
        if (results.size > 1) return Object.freeze({ status:'ambiguous', source:null, target:null });
        const result = [...results.values()][0];
        return Object.freeze({ status:'resolved', source:result.source, target:result.target });
    }

    return Object.freeze({
        combine,
        distribute,
        cancel,
        balance,
    });
};
