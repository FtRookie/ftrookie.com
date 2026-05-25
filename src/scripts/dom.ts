export function queryById<T extends Record<string, Element>>(
    root: ParentNode,
    ids: (keyof T & string)[]
): T {
    return Object.fromEntries(
        ids.map((id) => [id, root.querySelector(`#${id}`)!])
    ) as T;
}

export function queryElements<T extends Record<string, Element>>(
    root: ParentNode,
    selectors: { [K in keyof T]: string }
): T {
    return Object.fromEntries(
        Object.entries(selectors).map(([key, selector]) => [key, root.querySelector(selector)!])
    ) as T;
}
