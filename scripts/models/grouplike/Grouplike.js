'use strict';
// HUMAN VETTED

/*
`Grouplike` manages operations for a single algebraic operation.
It is able to represent groups in addition to select structures 
whose properties are subsets or supersets of a group.
Supported properties are chosen based on ease of implementation.
Properties that are not available here must be implemented using dedicated structures.

Properties configure the laws embodied by this structure; 
callers request operations and never inspect those properties themselves.
Properties that are mutually contradictory 
will result in errors at the time of construction. 

Unsupported unary operations return the original Expression.
Unsupported binary/constructive operations return null.
*/
const Grouplike = (label, properties, evaluatable) => {
    typecheck(label, 'String');
    typecheck(properties, 'Object');
    typecheck(evaluatable, 'Function');

    typecheck(properties.is_commutative, 'Boolean+1');
    typecheck(properties.is_associative, 'Boolean+1');
    typecheck(properties.left_divide, 'Function+1');
    typecheck(properties.right_divide, 'Function+1');
    typecheck(properties.is_idempotent, 'Boolean+1');

    const is_commutative = !!properties.is_commutative;
    const is_associative = !!properties.is_associative;
    const left_division = properties.left_divide;
    const right_division = properties.right_divide;

    const left_identity = properties.left_identity;
    const right_identity = properties.right_identity;
    const left_annihilator = properties.left_annihilator;
    const right_annihilator = properties.right_annihilator;

    const is_idempotent = !!properties.is_idempotent;
    const self_combination = properties.self_combination;

    typecheck(left_identity, 'Expression+1');
    typecheck(right_identity, 'Expression+1');
    typecheck(left_annihilator, 'Expression+1');
    typecheck(right_annihilator, 'Expression+1');
    typecheck(self_combination, 'Expression+1');

    const freeze = Object.freeze;

    function same(left, right) {
        if (!(left instanceof Expression) || !(right instanceof Expression)) return false;
        if (left.type !== right.type) return false;
        if (Array.isArray(left.contents) || Array.isArray(right.contents)) {
            return Array.isArray(left.contents) && Array.isArray(right.contents) &&
                left.contents.length === right.contents.length &&
                left.contents.every((item, index) => same(item, right.contents[index]));
        }
        return left.contents === right.contents;
    }

    function require(condition, message){
        if (!condition) { throw new Error(`${label}: ${message}`); }
    }

    function require_different(left, right, message) {
        require(!same(left, right), message);
    }

    function require_same(left, right, message) {
        require(same(left, right), message);
    }

    function require_same_optionals(left, right, message) {
        require(left == null || right == null || same(left, right), message);
    }

    require_same_optionals(left_identity, right_identity, 'left and right identities must match');
    require_same_optionals(left_annihilator, right_annihilator, 'left and right annihilators must match');
    require_different(left_identity, left_annihilator, 'the same Expression cannot be both left identity and left annihilator');
    require_different(right_identity,right_annihilator,'the same Expression cannot be both right identity and right annihilator');

    if (is_commutative) {
        require_same_optionals(left_identity, right_identity, `commutative left and right identity must match`);
        require_same_optionals(left_annihilator, right_annihilator, `commutative left and right annihilator must match`);
        require((left_division != null) == (right_division != null), `left and right division must exist together`);
    }

    if (self_combination != null) {
        require(!is_idempotent, `idempotence and fixed self-combination are mutually exclusive`);
        [left_identity, right_identity].forEach(identity =>
            require_same_optionals(self_combination, identity, 'self-combination disagrees with identity')
        );
        [left_annihilator, right_annihilator].forEach(annihilator =>
            require_same_optionals(self_combination, annihilator, 'self-combination disagrees with annihilator')
        );
    }

    const evaluator = evaluate => expression =>
        evaluatable(expression.contents.map(item => evaluate(item)));

    function create(contents) {
        typecheck(contents, 'Array');
        let formatted = [];
        if (!is_associative) {
            formatted = contents;
        } else {
            // flatten
            contents.forEach(term => {
                if (term.type === label) {
                    term.contents.forEach(item => formatted.push(item));
                } else {
                    formatted.push(term);
                }
            });
        }
        formatted = formatted.map(item =>
            item instanceof Expression? item : new Expression('constant', item));

        if (formatted.length === 0) {
            return same(left_identity, right_identity)? left_identity : null;
        }
        if (formatted.length === 1) return formatted[0];
        return new Expression(label, freeze(formatted));
    }

    function simplify(expression, simplify, evaluate, constant_result) {
        typecheck(expression, 'Expression');
        typecheck(simplify, 'Function');
        typecheck(evaluate, 'Function');
        typecheck(constant_result, 'Function');
        const simplified_constant = constant_result(expression);
        if (simplified_constant != null) return simplified_constant;
        if (!Array.isArray(expression.contents)) return expression;

        let contents = expression.contents.map(simplify);

        if (is_associative) {
            const constants = contents
                .map((item, index) => ({ item:item, index:index, value:evaluate(item, {}) }))
                .filter(item => Number.isFinite(item.value));

            if (constants.length > 1) {
                const constant_expression = expression.with({
                    contents: freeze(constants.map(item => item.item)),
                });
                const combined = constant_result(constant_expression);
                if (combined != null) {
                    const first = constants[0].index;
                    const constant_indexes = new Set(constants.map(item => item.index));
                    contents = contents.flatMap((item, index) =>
                        index === first? [combined] :
                        constant_indexes.has(index)? [] : [item]
                    );
                }
            }
        }

        if (
            contents.length === expression.contents.length &&
            contents.every((item, index) => item === expression.contents[index])
        ) return expression;
        return expression.with({ contents: freeze(contents) });
    }

    function append(left, right) {
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');
        return left.type === label && is_associative?
            create([...left.contents, right]) : create([left, right]);
    }

    function combine(left, right) {
        typecheck(left, 'Expression');
        typecheck(right, 'Expression');

        if (same(left, left_annihilator)) return left_annihilator;
        if (same(right, right_annihilator)) return right_annihilator;
        if (same(left, left_identity)) return right;
        if (same(right, right_identity)) return left;

        if (same(left, right)) {
            if (is_idempotent) return left;
            if (self_combination != null) return self_combination;
        }
        return null;
    }

    function commute(expression, index1, index2) {
        typecheck(expression, 'Expression');
        typecheck(index1, 'Number');
        typecheck(index2, 'Number');
        if (!is_commutative) return expression;
        const contents = expression.contents.slice();
        [contents[index1], contents[index2]] = [contents[index2], contents[index1]];
        return create(contents);
    }

    /*
    Division-capable structures share the same interface:
        divide(parent, source) -> (Expression -> Expression) | null

    Grouplike only needs `source` to construct its configured division form.
    `parent` identifies the operation when the source is embedded and is null
    for a lone source. Keeping it in the signature lets callers treat Grouplike
    and contextual inverse structures identically.
    */
    function _divide(parent, source, definition) {
        typecheck(parent, 'Expression+1');
        typecheck(source, 'Expression');
        if (parent != null && parent.type !== label) return null;
        if (definition == null) return null;
        const divide = definition(source);
        typecheck(divide, 'Function+1');
        return divide;
    }

    function left_divide(parent, source) {
        return _divide(parent, source, left_division);
    }

    function right_divide(parent, source) {
        return _divide(parent, source, right_division);
    }

    return freeze({
        label,
        create,
        append,
        combine,
        commute,
        left_divide,
        right_divide,
        simplify,
        evaluator,
    });
};
