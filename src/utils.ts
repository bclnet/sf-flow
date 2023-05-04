// eslint-disable-next-line import/prefer-default-export, @typescript-eslint/no-explicit-any, @typescript-eslint/array-type
export function toArray<T = any>(elements): Array<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return elements ? Array.isArray(elements) ? elements : [elements] : [];
}

export function jsonStringify(obj: object, space: string): string {
    const allKeys = new Set();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    JSON.stringify(obj, (key, value) => (allKeys.add(key), value));
    return JSON.stringify(obj, Array.from(allKeys).sort() as undefined, space);
}

export function unescapeHtml(target: unknown): unknown {
    if (typeof target !== 'string') return target;
    const patterns = {
        '&lt;': '<',
        '&gt;': '>',
        '&amp;': '&',
        '&quot;': '"',
        '&#39;': "'",
        '&#x27;': "'",
        '&#x60;': '`',
    };
    return target.replace(/&(lt|gt|amp|quot|#x27|#x60);/g, (match) => patterns[match] as string);
}

export function objectPurge(s: object): object {
    Object.keys(s).forEach(k => s[k] === undefined && delete s[k])
    return s;
}

export function toPascalCase(s: string): string {
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return s.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
}

export function toUpperSnakeCase(camelCaseText: string): string {
    return camelCaseText.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase().replace(/^_/, '');
}
