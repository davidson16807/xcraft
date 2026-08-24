'use strict';

/*
Programmatic resolver for user-facing expression operations. Mathematical
implementations may overlap, so every operation returns all structurally
distinct results instead of suppressing ambiguity.
*/
const Expressions = (dependencies) => {
    const grouplikes = dependencies.grouplikes;
    const ringlikes = dependencies.ringlikes;
    const shape = dependencies.expression_shape;
    const laws = Object.freeze(dependencies.laws || []);

    function distinct(expressions) {
        const results = new Map();
        expressions.flatMap(expression =>
            Array.isArray(expression)? expression : [expression]
        ).filter(expression => expression != null).forEach(expression =>
            results.set(shape.encode(expression), expression)
        );
        return Object.freeze([...results.values()]);
    }

    function combine(parent, left, right) {
        return distinct([
            grouplikes.combine(parent.type, left, right),
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

        return distinct([
            legacy,
            ...laws.map(law => law.distribute == null? null : law.distribute(parent, source, target)),
        ]);
    }

    function cancel(outer, inner, outer_fixed, inner_fixed) {
        return distinct(laws.map(law =>
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
            const preview = law.append(parent, source, new Expression('slot'));
            if (preview == null) return;
            const key = `${shape.encode(new_source)}=${shape.encode(new_target)}`;
            results.set(key, Object.freeze({
                source: new_source,
                target: new_target,
                preview: preview,
            }));
        });
        return Object.freeze([...results.values()]);
    }

    return Object.freeze({
        combine,
        distribute,
        cancel,
        balance,
    });
};
