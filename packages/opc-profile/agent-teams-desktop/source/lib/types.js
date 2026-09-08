/**
 * Durable AgentTeams state types.
 *
 * A team is one directory under the state root holding `team.json` plus an
 * `inbox/` of per-agent JSONL mailboxes. Members are continuable subagents
 * whose durable child session ids are recorded in the team file, so a team
 * survives harness restarts.
 * @module dsh-agent-teams/types
 */
/** Statuses after which a task can no longer be claimed or worked on. */
export const TERMINAL_TASK_STATUSES = ['completed', 'failed', 'cancelled'];
/** Member statuses that have a usable continuable DSH child session. */
export const ACTIVE_MEMBER_STATUSES = ['idle', 'working'];
/** Return a normalized task revision while supporting snapshots created before CAS. */
export function taskRevisionOf(task) {
    return task.revision ?? 1;
}
/** Return the revision assigned to the next accepted task mutation. */
export function nextTaskRevision(task) {
    return taskRevisionOf(task) + 1;
}
/**
 * Validate an optional caller precondition against the durable task snapshot.
 * Omitting the value is a backward-compatible request for the server to bind
 * the operation to the revision it reads under its Team lock.
 */
export function taskRevisionConflict(task, expectedRevision) {
    if (expectedRevision === undefined)
        return undefined;
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
        return 'expected_revision must be a positive safe integer';
    }
    const actual = taskRevisionOf(task);
    return expectedRevision === actual
        ? undefined
        : `task ${task.id} revision conflict: expected ${expectedRevision}, current ${actual}; refresh team status and retry`;
}
/** Whether the member can receive assignments and invoke team tools. */
export function isActiveTeamMember(member) {
    return ACTIVE_MEMBER_STATUSES.includes(member.status);
}
/**
 * Public message kinds stored in the append-only team chat.
 *
 * `message` and `status` remain for old teams. The more specific kinds make
 * the read-only workbench useful without exposing hidden model reasoning.
 */
export const TEAM_CHAT_MESSAGE_KINDS = [
    'message',
    'status',
    'discussion',
    'assignment',
    'objection',
    'help',
    'decision',
    'tool',
    'artifact',
    'approval',
    'system',
    'summary',
];
/** Kinds an Agent may deliberately write through the model-facing tool. */
export const AGENT_TEAM_CHAT_MESSAGE_KINDS = [
    'message',
    'status',
    'discussion',
    'assignment',
    'objection',
    'help',
    'decision',
    'summary',
];
