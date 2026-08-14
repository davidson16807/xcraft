'use strict';
// HUMAN WRITTEN

/*
`Html` is a simple convenience wrapper that is namely meant to create html elements.
It is a namespace whose functions map one-to-one with HTML elements.
Function names always match names of their corresponding HTML elements.
Functions construct their HTML element given only attributes and children as parameters.
*/

function Html(dom){
    const document_io = dom || document;

    function node(tag, attributes, children, textContent){
        attributes = attributes ?? {};
        children = children ?? [];
        const result = dom.createElement(tag);
        for (let name in attributes){
            if (name.startsWith('on')) {
                result.addEventListener(name.substring(2), attributes[name]);
            } else {
                result.setAttribute(name, attributes[name])
            }
        }
        if (textContent != null) {
            result.textContent = textContent;
        }
        for (let child of children){
            result.appendChild(child);
        }
        return result;
    };

    const tags = ['body','div','span','button','input','img','h1','h2','h3','h4','h5',];
    const namespace = {node:node};
    for(let tag of tags){
        namespace[tag] = (attributes, children, textContent) => node(tag, attributes, children, textContent)
    }

    return namespace;
}
