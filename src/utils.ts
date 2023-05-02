// eslint-disable-next-line import/prefer-default-export
export function toArray<T = any>(elements): Array<T> {
    return elements ? Array.isArray(elements) ? elements : [elements] : [];
}

export function unescapeHtml(target) {
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

    return target.replace(/&(lt|gt|amp|quot|#x27|#x60);/g, function (match) {
        return patterns[match];
    });
}

export function objectPurge(s: object): object {
    Object.keys(s).forEach(k => s[k] === undefined && delete s[k])
    return s;
}

export function toPascalCase(s: string): string {
    return s.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
}

// export function toUpperSnakeCase(camelCaseText) {
//     return camelCaseText
//         .replace(/[A-Z]/g, letter => `_${letter}`)
//         .toUpperCase()
//         .replace(/^_/, '');
// }
