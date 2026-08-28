'use strict';

/* Adds selection and caret presentation to an already-rendered Expression. */
function ExpressionEditView(dependencies) {
    const html = dependencies.html;
    const render = dependencies.render;
    const paths = dependencies.expression_paths;

    function math(latex) {
        const node = html.span({ class:'math-atom' }, []);
        if (latex !== '') render(latex, node, { throwOnError:false, output:'html' });
        return node;
    }

    function caret() {
        return html.span({ class:'expression-caret', 'aria-hidden':'true' }, []);
    }

    function nodes(root) {
        return [root, ...root.querySelectorAll('[data-path]')]
            .filter(node => node.hasAttribute && node.hasAttribute('data-path'));
    }

    function node_for(root, path) {
        return nodes(root).find(node => node.getAttribute('data-path') === path) || null;
    }

    function relative_path(root_path, absolute_path) {
        if (absolute_path === root_path) return '';
        const prefix = root_path === ''? '' : root_path + '/';
        return absolute_path.startsWith(prefix)? absolute_path.slice(prefix.length) : null;
    }

    function decorate(expression, root_path, root_node, state, editing) {
        if (!editing) return root_node;

        nodes(root_node).forEach(node => {
            if (!node.classList.contains('equation-side')) {
                node.classList.add('edit-selectable');
                node.setAttribute('data-edit-path', node.getAttribute('data-path'));
            }
        });

        if (state == null) return root_node;
        const relative = relative_path(root_path, state.path);
        if (relative == null) return root_node;
        const current = paths.resolve(expression, relative);
        const current_node = node_for(root_node, state.path);
        if (current == null || current_node == null) return root_node;

        if (state.selected) {
            current_node.classList.add('edit-selected');
            return root_node;
        }

        const atomic = ['slot', 'constant', 'variable'].includes(current.type);
        if (atomic) {
            const text = current.type === 'slot'? '' : String(current.contents);
            const offset = Math.max(0, Math.min(text.length, state.offset));
            const prefix = [...current_node.children].filter(child =>
                child.classList.contains('math-operator')
            );
            current_node.replaceChildren(
                ...prefix,
                math(text.slice(0, offset)),
                caret(),
                math(text.slice(offset))
            );
            current_node.classList.add('edit-current');
            return root_node;
        }

        const position = Math.max(0, Math.min(current.contents.length, state.offset));
        if (position === 0) {
            current_node.insertBefore(caret(), current_node.firstChild);
        } else if (position === current.contents.length) {
            current_node.appendChild(caret());
        } else {
            const child_path = paths.nary(state.path, position - 1);
            const child_node = node_for(root_node, child_path);
            (child_node || current_node).appendChild(caret());
        }
        current_node.classList.add('edit-current');
        return root_node;
    }

    return Object.freeze({ decorate });
}
