/**
 * Profile records are created by the Harness with UUIDs. Department SOUL ids
 * (for example `comment-ops`) are deliberately not profile ids: treating one
 * as the other prevents legacy teams from appearing in "我的 Agent".
 */
const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export function isPersistentMemberProfileId(value) {
    return typeof value === 'string' && PROFILE_ID.test(value);
}
