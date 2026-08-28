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
    Applies the inverse of the source expression to both sides
    This removes the source expression from its side and appends its inverse to the other side.
    This function no-ops if the source expression is non-invertible.
    `source_index == null` means the whole source side is being moved.
    Otherwise it identifies a direct child of the source-side root.
    */
    function balance(equation, source_side, source_index, target_side) {
        typecheck(equation, 'Relation');
        typecheck(source_side, 'String+Number');
        typecheck(source_index, 'Number+1');
        typecheck(target_side, 'String+Number');
        if (source_side === target_side) return noop;
        // nothing to balance? no-op

        const source_root = _side(equation, source_side);
        const target_root = _side(equation, target_side);
        if (source_root == null || target_root == null) return noop;
        // non-existant root? your app is broken - no-op

        const is_alone = source_index == null;
        const source = is_alone? source_root :
            Array.isArray(source_root.contents)? source_root.contents[source_index] : null;
        if (source == null) return noop;
        // non-existant source? no-op

        const choices = [];

        if (!is_alone) {
            const operation = source_root.type;

            const invertible_choices = new Map(
                invertibles.map(invertible => {
                    const new_source = invertible.cancel(source_root, source);
                    if (new_source == null) return null;
                    const new_target = invertible.append(source_root, source, target_root);
                    if (new_target == null) return null;
                    const preview = invertible.append(source_root, source, new Expression('slot'));
                    if (preview == null) return null;
                    const key = `${shape.encode(new_source)}=${shape.encode(new_target)}`;
                    const choice = _balance_choice(
                        equation,
                        target_side,
                        new_source,
                        new_target,
                        preview,
                        ''
                    );
                    return choice == null? null : [key, choice];
                }).filter(choice => choice != null)
            );
            choices.push(...invertible_choices.values());

            const inverse = ringlikes.inverse(operation, source);
            if (inverse != null) {
                const new_source = grouplikes.cancel(source_root, source_index);
                if (new_source != null && new_source !== source_root) {
                    const new_target = grouplikes.append(operation, target_root, inverse);
                    const operator = ringlikes.is_inverse(operation, inverse)? '' : operation;
                    const choice = _balance_choice(
                        equation,
                        target_side,
                        new_source,
                        new_target,
                        inverse,
                        operator
                    );
                    if (choice != null) choices.push(choice);
                }
            }

            return freeze(choices);

        } else {

            grouplikes.types.forEach(operation => {
                const inverse = ringlikes.inverse(operation, source_root);
                if (inverse == null) return;

                const create = grouplikes[operation];
                const identity = create([]);
                if (identity == null) return;

                const new_target = grouplikes.append(operation, target_root, inverse);
                const operator = ringlikes.is_inverse(operation, inverse)? '' : operation;
                const choice = _balance_choice(
                    equation,
                    target_side,
                    identity,
                    new_target,
                    inverse,
                    operator
                );
                if (choice != null) choices.push(choice);
            });

            return freeze(choices);
        }

    }

    /*Strips an outer expression that has been wrapped in its inverse.
    This function no-ops if the expression is non-invertible.*/
    function strip(outer, inner, outer_fixed, inner_fixed) {
        typecheck(outer, 'Expression');
        typecheck(inner, 'Expression');
        typecheck(outer_fixed, 'Expression');
        typecheck(inner_fixed, 'Expression');
        return _distinct(invertibles.map(invertible => {
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
        typecheck(index1, 'Number');
        typecheck(index2, 'Number');
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
            return gathered && grouplikes.collapse(parent, index1, index2, replacement)
                    .caveat(...gathered);
        }));
    }

    /*Distributes the expression at source_index across the contents of the expression at target_index.
    This may either represent distributivity in a ringlike structure,
    or a applying the inverse operation of combine(…) where
    an equivalence law dictates that one expression can become several.*/
    function distribute(parent, source_index, target_index) {
        typecheck(parent, 'Expression');
        typecheck(source_index, 'Number');
        typecheck(target_index, 'Number');
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
            return gathered &&
                grouplikes.collapse(parent, source_index, target_index, replacement)
                    .caveat(...gathered);
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
        typecheck(index1, 'Number');
        typecheck(index2, 'Number');
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

    function simplify(equation) {
        typecheck(equation, 'Relation');
        const left = grouplikes.simplify(equation.left);
        const right = grouplikes.simplify(equation.right);
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
