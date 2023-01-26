type ObjStoreDetails = { version: number, parameters?: IDBObjectStoreParameters, indices?: ObjStoreIndex[] };
type ObjStoreIndex = { version: number, name: string, keyPath: string | string[], options?: IDBIndexParameters }


// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace JSX {
    interface ElementClass {
        render: (props: unknown) => HTMLElement;
    }
    type IntrinsicElements = {
        [elemName in keyof HTMLElementTagNameMap]: { [index: string]: unknown };
    };
}

abstract class TerraCompoment {
    abstract render(props: { [index: string]: unknown }): HTMLElement
}

interface propsI {
    'onClick'?: () => void,
    'onChange'?: () => void,
    [index: string]: string |
    boolean |
    (() => void) |
    (HTMLElement | string | false | (HTMLElement | string | false)[])[]
}

declare var TerraUI: {
    createElement: (name: string | ((props: unknown) => HTMLElement),
        props: propsI,
        ...content: (HTMLElement | string)[]) => HTMLElement
};

globalThis.TerraUI = {
    createElement: (name: string | HTMLElement | ((props: unknown) => HTMLElement) | (new () => TerraCompoment),
        props?: propsI,
        ...content: (HTMLElement | string | false | (HTMLElement | string | false)[])[]) => {
        props = props || {};
        const nametype = typeof (name);
        if (nametype === 'function') {
            props.children = content
            if (name.toString().substr(0, 5) === 'class') {
                var instance = new (name as new () => TerraCompoment)()
                return instance.render(props);
            }
            return (name as (props: unknown) => HTMLElement)(props);
        }
        else if (nametype == 'string')
            var elem = document.createElement(name as string);
        else
            var elem = name as HTMLElement;

        for (var key in props) {
            if (key == 'onClick') {
                const prop = props[key];
                if (typeof (name) === 'string' && prop)
                    elem.addEventListener('click', prop)
            } else if (key == 'onChange') {
                const prop = props[key];
                if (typeof (name) === 'string' && prop)
                    elem.addEventListener('change', prop)
            }
            else if (key == 'checked') {
                if (props[key])
                    (elem as HTMLInputElement).checked = true

            } else if (typeof props[key] === 'string') {
                const prop = props[key];
                if (typeof prop === 'string')
                    elem.setAttribute(key, prop);
            }
        }
        content.forEach(function appendContent(content2) {
            if (Array.isArray(content2)) {
                content2.forEach(appendContent)
            } else {
                if (content2 instanceof HTMLElement)
                    elem.appendChild(content2);
                else if (content2 !== null && content2 !== false) {
                    elem.appendChild(document.createTextNode(content2));
                }
            }
        });
        return elem;
    }
}