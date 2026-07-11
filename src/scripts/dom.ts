export function queryById<T extends Record<string, Element>>(
    root: ParentNode,
    ids: (keyof T & string)[]
): T {
    return Object.fromEntries(
        ids.map((id) => [id, root.querySelector(`#${id}`)!])
    ) as T;
}
