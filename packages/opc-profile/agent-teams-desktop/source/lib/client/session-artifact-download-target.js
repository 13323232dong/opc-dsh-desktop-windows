function isHTMLElementLike(value) {
    return value !== null
        && typeof value === 'object'
        && typeof value.closest === 'function';
}
function closestCapable(value) {
    if (isHTMLElementLike(value)) {
        return value;
    }
    if (value !== null && typeof value === 'object' && value.nodeType === 3) {
        return value.parentElement ?? null;
    }
    return null;
}
/** Resolve the clickable artifact code wrapper from either its element or text node. */
export function decoratedCode(target) {
    return closestCapable(target)?.closest('code[data-agent-teams-download-url]') ?? null;
}
