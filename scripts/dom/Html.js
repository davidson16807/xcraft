'use strict';

function Html(dom) {
    const document_io = dom || document;

    function element(tag, attributes, children) {
        const node = document_io.createElement(tag);
        Object.entries(attributes || {}).forEach(([key, value]) => {
            if (value == null) return;
            if (key === 'class') node.className = value;
            else if (key === 'text') node.textContent = value;
            else node.setAttribute(key, value);
        });
        (children || []).forEach(child => node.appendChild(child));
        return node;
    }

    return Object.freeze({
        span: (attributes, children) => element('span', attributes, children),
        div: (attributes, children) => element('div', attributes, children),
        button: (attributes, children) => element('button', attributes, children),
    });
}
