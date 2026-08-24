'use strict';

/*
`Expressions` aggregates user-facing operations that result from 
mathematical laws and structures. 

User-facing operations can be ambiguous, so each operation returns 
lists of valid interpretations. 
Invalid operations are represented by an empty list
*/
const Expressions = (dependencies) => {
    const shape = dependencies.expression_shape;

    const grouplikes = dependencies.grouplikes;
    const ringlikes = dependencies.ringlikes;
    const laws = Object.freeze(dependencies.laws || []);

    function _distinct(expressions) {
        const results = new Map();
        expressions.flatMap(expression =>
            Array.isArray(expression)? expression : [expression]
        ).filter(expression => expression != null).forEach(expression =>
            results.set(shape.encode(expression), expression)
        );
        return Object.freeze([...results.values()]);
    }

    function combine(parent, left, right) {
        return _distinct([
            grouplikes.combine(parent.type, left, right),
            ringlikes.combine(parent.type, left, right),
            ...laws.map(law =>
                law.combine && law.combine(parent.type, left, right)
            ),
        ]);
    }

    function distribute(parent, source, target, source_index, target_index) {
        const left = source_index < target_index? source : target;
        const right = source_index < target_index? target : source;
        const operation = source_index < target_index?
            'left_distribute' : 'right_distribute';

        return _distinct([
            ringlikes[operation](target.type, parent, left, right),
            ...laws.map(law =>
                law[operation] && law[operation](parent, left, right)
            ),
        ]);
    }

    function strip(outer, inner, outer_fixed, inner_fixed) {
        return _distinct(laws.map(law =>
            law.strip && law.strip(outer, inner, outer_fixed, inner_fixed)
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
        strip,
        balance,
    });
};
