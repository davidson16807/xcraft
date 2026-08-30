'use strict';
// HUMAN VETTED

/*
`Relations` manages user-facing operation at the scale of expressions and equations.
It aggregates mathematical structures and laws.
Expression addressing and navigation belong elsewhere.

User-facing operations can be ambiguous, so operations return lists of valid
interpretations. Unsupported operations return an empty list.
*/
function Relations(dependencies) {
    const shape = dependencies.expression_shape;

    const grouplikes = dependencies.grouplikes;
    const ringlikes = dependencies.ringlikes;
    const orderlikes = dependencies.orderlikes;
    const caveats = dependencies.expression_caveats;
    const invertibles = dependencies.invertibles || [];
    const equivalences = dependencies.equivalences || [];

    const freeze = Object.freeze;
    const noop = freeze([]);

    function _distinct(expressions) {
        return freeze([
            ...new Map(
                expressions.flatMap(
                    expression => Array.isArray(expression)? expression : [expression]
                ).filter(
                    expression => expression != null
                ).map(
                    expression => [shape.encode(expression), expression]
                )
            ).values()
        ]);
    }

    function _side(equation, side) {
        const side_expression = Array.isArray(equation.contents)? equation.contents[Number(side)] : null;
        return side_expression != null && side_expression.type === 'side'?
            side_expression.contents[0] : null;
    }

    function _balance_choice(equation, target_side, new_source, new_target, expression, operator) {
        const left_right = Number(target_side) === 0?
            [new_target, new_source] : [new_source, new_target];
        const gathered = caveats.gather(equation, new_source, new_target, expression);
        if (gathered == null) return null;
        const replacement = equation
            .with({ left:left_right[0], right:left_right[1] })
            .caveat(...gathered);

        return new RelationDragChoice(
            expression,
            operator,
            replacement,
            target_side,
            'balance'
        );
    }

    /*
    Balancing applies one division operation to both sides. Embedded sources
    discover division from their parent Grouplike and other division-capable
    structures. Lone sources have no parent, so they try each Grouplike.
    */
    function balance(equation, source_side, source_index, target_side) {
        typecheck(equation, 'Relation');
        typecheck(source_side, 'String+Number');
        typecheck(source_index, 'Number+1');
        typecheck(target_side, 'String+Number');
        if (source_side === target_side) return noop;

        const source_root = _side(equation, source_side);
        const target_root = _side(equation, target_side);
        if (source_root == null || target_root == null) return noop;

        const is_alone = source_index == null;
        const source = is_alone? source_root :
            Array.isArray(source_root.contents)? source_root.contents[source_index] : null;
        if (source == null) return noop;

        let divisions = [];
        if (!is_alone) {
            divisions = [grouplikes, ...invertibles].flatMap(structure => {
                return [structure.left_divide, structure.right_divide].map(operation => {
                    return operation(source_root, source);
                });
            });
        } else {
            divisions = grouplikes.structures.flatMap(structure => {
                return [structure.left_divide, structure.right_divide].map(operation => {
                    return operation(null, source_root);
                });
            });
        }

        const choices = new Map(divisions
            .map(divide => {
                if(divide==null) return;
                const new_source = divide(source_root);
                const new_target = divide(target_root);
                const preview = divide(new Expression('slot'));
                if (new_source == null || new_target == null || preview == null) return;
                const choice = _balance_choice(
                    equation,
                    target_side,
                    new_source,
                    new_target,
                    preview,
                    ''
                );
                if (choice == null) return;
                const key = shape.encode(choice.equation);
                return [key, choice];
            }).filter(pair => pair!=null)
        );

        return freeze([...choices.values()]);
    }

    /*Strips an outer expression that has been wrapped in its inverse.
    This function no-ops if the expression is non-invertible.*/
    function strip(outer, inner, outer_fixed, inner_fixed) {
        typecheck(outer, 'Expression');
        typecheck(inner, 'Expression');
        typecheck(outer_fixed, 'Expression');
        typecheck(inner_fixed, 'Expression');
        return _distinct([grouplikes, ...invertibles].map(invertible => {
            const replacement = invertible.strip(
                outer,
                inner,
                outer_fixed,
                inner_fixed
            );
            if (replacement == null) return null;
            const gathered = caveats.gather(outer, replacement);
            return gathered && replacement.caveat(...gathered);
        }));
    }

    /*Combines the expressions at index1 and index2 of parent.contents.
    This may either represent combining expressions like constants, terms, or factors,
    or a applying the inverse operation of distribute(…) where
    an equivalence law dictates that several expressions can be combined into one.*/
    function combine(parent, index1, index2) {
        typecheck(parent, 'Expression');
        typecheck(index1, 'Integer');
        typecheck(index2, 'Integer');
        if (!Array.isArray(parent.contents) || index1 === index2) return noop;
        // indexes match or parent is singleton? no-op

        const source = parent.contents[index1];
        const target = parent.contents[index2];
        if (source == null || target == null) return noop;
        // non-existance source and target? no-op

        const left = index1 < index2? source : target;
        const right = index1 < index2? target : source;
        const replacements = _distinct([
            grouplikes.combine(parent.type, left, right),
            ringlikes.combine(parent.type, left, right),
            ...equivalences.map(equivalence =>
                equivalence.combine(parent.type, left, right)
            ),
        ]);

        return _distinct(replacements.map(replacement => {
            const gathered = caveats.gather(parent, replacement);
            if (gathered == null) return null;
            const collapsed = grouplikes.collapse(parent, index1, index2, replacement);
            return collapsed == null? null : collapsed.caveat(...gathered);
        }));
    }

    /*Distributes the expression at source_index across the contents of the expression at target_index.
    This may either represent distributivity in a ringlike structure,
    or a applying the inverse operation of combine(…) where
    an equivalence law dictates that one expression can become several.*/
    function distribute(parent, source_index, target_index) {
        typecheck(parent, 'Expression');
        typecheck(source_index, 'Integer');
        typecheck(target_index, 'Integer');
        if (!Array.isArray(parent.contents) || source_index === target_index) return noop;
        // indexes match or parent is singleton? no-op

        const source = parent.contents[source_index];
        const target = parent.contents[target_index];
        if (source == null || target == null || target.type === 'constant') return noop;
        // non-existance source and target? no-op

        const left = source_index < target_index? source : target;
        const right = source_index < target_index? target : source;
        const operation = source_index < target_index?
            'left_distribute' : 'right_distribute';

        const replacements = _distinct([
            ringlikes[operation](target.type, parent, left, right),
            ...equivalences.map(equivalence =>
                equivalence[operation](parent, left, right)
            ),
        ]);

        return _distinct(replacements.map(replacement => {
            const gathered = caveats.gather(parent, replacement);
            if (gathered == null) return null;
            const collapsed = grouplikes.collapse(parent, source_index, target_index, replacement);
            return collapsed == null? null : collapsed.caveat(...gathered);
        }));
    }

    /*Swaps the two sides of a relation through its converse relation.*/
    function swap(relation) {
        typecheck(relation, 'Relation');
        const swapped = orderlikes.swap(relation);
        return swapped === relation? noop : freeze([swapped]);
    }

    /*Swaps expressions at index1 and index2 of parent.contents.
    This function no-ops if the parent operation is neither commutative nor anti-commutative.*/
    function commute(parent, index1, index2) {
        typecheck(parent, 'Expression');
        typecheck(index1, 'Integer');
        typecheck(index2, 'Integer');
        if (!Array.isArray(parent.contents) || index1 === index2) return noop;
        // indexes match or parent is singleton? no-op

        const left = parent.contents[index1];
        const right = parent.contents[index2];
        if (left == null || right == null || left === right) return noop;
        // non-existant or matching expressions? no-op

        const commuted = grouplikes.commute(parent, index1, index2);
        if (commuted === parent) return noop;
        const gathered = caveats.gather(parent, commuted);
        return gathered == null? noop : freeze([commuted.caveat(...gathered)]);
    }

    function _simplify_inverse(expression) {
        if (!Array.isArray(expression.contents)) return null;

        for (let inner_index = 0; inner_index < expression.contents.length; ++inner_index) {
            const inner = expression.contents[inner_index];
            if (!(inner instanceof Expression) || !Array.isArray(inner.contents)) continue;

            for (let outer_index = 0; outer_index < expression.contents.length; ++outer_index) {
                if (outer_index === inner_index) continue;
                const outer_fixed = expression.contents[outer_index];

                for (const inner_fixed of inner.contents) {
                    for (const invertible of [grouplikes, ...invertibles]) {
                        const replacement = invertible.strip(expression, inner, outer_fixed, inner_fixed );
                        if (replacement == null) continue;
                        const gathered = caveats.gather(expression, replacement);
                        if (gathered == null) continue;
                        return replacement.caveat(...gathered);
                    }
                }
            }
        }

        return null;
    }

    function _simplify_expression(expression) {
        typecheck(expression, 'Expression');

        let current = expression;
        if (Array.isArray(current.contents)) {
            const contents = current.contents.map(_simplify_expression);
            if (contents.some((item, index) => item !== current.contents[index])) {
                current = grouplikes.rebuild(current, contents);
            }
        }

        current = grouplikes.simplify(current);

        const stripped = _simplify_inverse(current);
        if (stripped != null) return _simplify_expression(stripped);

        if (!Array.isArray(current.contents) || current.contents.length < 2) return current;

        for (let index = 0; index < current.contents.length - 1; ++index) {
            const left = current.contents[index];
            const right = current.contents[index + 1];
            let replacement = grouplikes.combine(current.type, left, right);

            if (
                replacement == null &&
                (ringlikes.is_inverse(current.type, left) || ringlikes.is_inverse(current.type, right))
            ) {
                replacement = ringlikes.combine(current.type, left, right);
            }
            if (replacement == null) continue;

            const gathered = caveats.gather(current, replacement);
            if (gathered == null) continue;
            const collapsed = grouplikes.collapse(current, index, index + 1, replacement);
            if (collapsed == null) continue;
            return _simplify_expression(collapsed.caveat(...gathered));
        }

        return current;
    }

    function simplify(equation) {
        typecheck(equation, 'Relation');
        const left = _simplify_expression(equation.left);
        const right = _simplify_expression(equation.right);
        return left === equation.left && right === equation.right? equation :
            equation.with({ left:left, right:right });
    }

    return freeze({
        balance,
        strip,
        combine,
        distribute,
        swap,
        commute,
        simplify,
    });
}
