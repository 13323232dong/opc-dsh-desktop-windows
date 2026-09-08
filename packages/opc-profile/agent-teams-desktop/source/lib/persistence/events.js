/**
 * Immutable disk-event contracts and a pure TeamState reducer.
 *
 * This module deliberately performs no I/O. The file repository introduced in
 * the next phase will append validated events first, then use this reducer to
 * rebuild the compatibility snapshot.
 */
const ROUTE_SOURCES = new Set(['captain', 'role-preference', 'task-router', 'user']);
function fail(message) { throw new Error(`invalid Team event: ${message}`); }
function text(value, field) {
    if (typeof value !== 'string' || value.trim() === '')
        fail(`${field} must be a non-empty string`);
    return value;
}
function timestamp(value, field) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        fail(`${field} must be a non-negative safe integer`);
    return value;
}
function positive(value, field) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
        fail(`${field} must be a positive safe integer`);
    return value;
}
function route(value, field) {
    if (value === null || typeof value !== 'object')
        fail(`${field} must be an object`);
    const candidate = value;
    const source = text(candidate.source, `${field}.source`);
    if (!ROUTE_SOURCES.has(source))
        fail(`${field}.source is unsupported`);
    const reasoningEffort = candidate.reasoningEffort === undefined ? undefined : text(candidate.reasoningEffort, `${field}.reasoningEffort`);
    const fallbackReason = candidate.fallbackReason === undefined ? undefined : text(candidate.fallbackReason, `${field}.fallbackReason`);
    return Object.freeze({
        provider: text(candidate.provider, `${field}.provider`),
        model: text(candidate.model, `${field}.model`),
        ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
        source,
        resolvedAt: timestamp(candidate.resolvedAt, `${field}.resolvedAt`),
        ...(fallbackReason === undefined ? {} : { fallbackReason }),
    });
}
function snapshot(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        fail('payload.snapshot must be an object');
    const candidate = value;
    if (typeof candidate.id !== 'string' || candidate.id === ''
        || typeof candidate.name !== 'string' || candidate.name.trim() === ''
        || typeof candidate.captainSessionId !== 'string' || candidate.captainSessionId === ''
        || !Number.isSafeInteger(candidate.createdAt)
        || !Number.isSafeInteger(candidate.taskSeq)
        || !Array.isArray(candidate.members)
        || !Array.isArray(candidate.tasks)) {
        fail('payload.snapshot has invalid TeamState shape');
    }
    const copied = structuredClone(value);
    return Object.freeze(copied);
}
function payloadFor(type, value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        fail('payload must be an object');
    const payload = value;
    switch (type) {
        case 'team.imported': return Object.freeze({ snapshot: snapshot(payload.snapshot) });
        case 'team.created': return Object.freeze({
            name: text(payload.name, 'payload.name'),
            captainSessionId: text(payload.captainSessionId, 'payload.captainSessionId'),
            createdAt: timestamp(payload.createdAt, 'payload.createdAt'),
            ...(payload.description === undefined ? {} : { description: text(payload.description, 'payload.description') }),
        });
        case 'member.proposed': return Object.freeze({
            memberId: text(payload.memberId, 'payload.memberId'), name: text(payload.name, 'payload.name'),
            ...(payload.role === undefined ? {} : { role: text(payload.role, 'payload.role') }),
            joinedAt: timestamp(payload.joinedAt, 'payload.joinedAt'),
            ...(payload.soulId === undefined ? {} : { soulId: text(payload.soulId, 'payload.soulId') }),
            ...(payload.selectionReason === undefined ? {} : { selectionReason: text(payload.selectionReason, 'payload.selectionReason') }),
            ...(payload.createdFromTaskId === undefined ? {} : { createdFromTaskId: text(payload.createdFromTaskId, 'payload.createdFromTaskId') }),
            ...(payload.soulMarkdown === undefined ? {} : { soulMarkdown: text(payload.soulMarkdown, 'payload.soulMarkdown') }),
            ...(payload.soulSummary === undefined ? {} : { soulSummary: text(payload.soulSummary, 'payload.soulSummary') }),
            requestedRoute: route(payload.requestedRoute, 'payload.requestedRoute'),
        });
        case 'member.activated': return Object.freeze({
            memberId: text(payload.memberId, 'payload.memberId'), resolvedRoute: route(payload.resolvedRoute, 'payload.resolvedRoute'),
            ...(payload.sessionId === undefined ? {} : { sessionId: text(payload.sessionId, 'payload.sessionId') }),
            ...(payload.activatedAt === undefined ? {} : { activatedAt: timestamp(payload.activatedAt, 'payload.activatedAt') }),
            ...(payload.agentId === undefined ? {} : { agentId: text(payload.agentId, 'payload.agentId') }),
            ...(payload.agentVersion === undefined ? {} : { agentVersion: positive(payload.agentVersion, 'payload.agentVersion') }),
        });
        case 'member.failed': return Object.freeze({ memberId: text(payload.memberId, 'payload.memberId'), failedAt: timestamp(payload.failedAt, 'payload.failedAt'), failureReason: text(payload.failureReason, 'payload.failureReason') });
        case 'member.retired': return Object.freeze({ memberId: text(payload.memberId, 'payload.memberId') });
        case 'member.status.changed': {
            const status = text(payload.status, 'payload.status');
            if (status !== 'idle' && status !== 'working')
                fail('payload.status must be idle or working');
            return Object.freeze({ memberId: text(payload.memberId, 'payload.memberId'), status });
        }
        case 'task.created': {
            if (!Array.isArray(payload.dependencies) || payload.dependencies.some(id => typeof id !== 'string' || id === ''))
                fail('payload.dependencies must be string array');
            return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'), subject: text(payload.subject, 'payload.subject'),
                dependencies: Object.freeze([...payload.dependencies]), createdAt: timestamp(payload.createdAt, 'payload.createdAt'),
                ...(payload.description === undefined ? {} : { description: text(payload.description, 'payload.description') }),
                ...(payload.assignee === undefined ? {} : { assignee: text(payload.assignee, 'payload.assignee') }), });
        }
        case 'task.claimed': return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'),
            expectedRevision: positive(payload.expectedRevision, 'payload.expectedRevision'), revision: positive(payload.revision, 'payload.revision'),
            assignee: text(payload.assignee, 'payload.assignee'), attempt: positive(payload.attempt, 'payload.attempt'),
            attemptId: text(payload.attemptId, 'payload.attemptId'), updatedAt: timestamp(payload.updatedAt, 'payload.updatedAt') });
        case 'task.claim.released': return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'),
            expectedRevision: positive(payload.expectedRevision, 'payload.expectedRevision'), revision: positive(payload.revision, 'payload.revision'),
            attemptId: text(payload.attemptId, 'payload.attemptId'), updatedAt: timestamp(payload.updatedAt, 'payload.updatedAt') });
        case 'task.completed': return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'),
            expectedRevision: positive(payload.expectedRevision, 'payload.expectedRevision'), revision: positive(payload.revision, 'payload.revision'),
            attemptId: text(payload.attemptId, 'payload.attemptId'), output: text(payload.output, 'payload.output'),
            completedAt: timestamp(payload.completedAt, 'payload.completedAt'), updatedAt: timestamp(payload.updatedAt, 'payload.updatedAt') });
        case 'task.started': return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'),
            expectedRevision: positive(payload.expectedRevision, 'payload.expectedRevision'), revision: positive(payload.revision, 'payload.revision'),
            attemptId: text(payload.attemptId, 'payload.attemptId'), startedAt: timestamp(payload.startedAt, 'payload.startedAt'), updatedAt: timestamp(payload.updatedAt, 'payload.updatedAt') });
        case 'task.output.updated': return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'),
            expectedRevision: positive(payload.expectedRevision, 'payload.expectedRevision'), revision: positive(payload.revision, 'payload.revision'),
            attemptId: text(payload.attemptId, 'payload.attemptId'), output: text(payload.output, 'payload.output'), updatedAt: timestamp(payload.updatedAt, 'payload.updatedAt') });
        case 'task.reassigned': return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'),
            expectedRevision: positive(payload.expectedRevision, 'payload.expectedRevision'), revision: positive(payload.revision, 'payload.revision'),
            ...(payload.assignee === undefined ? {} : { assignee: text(payload.assignee, 'payload.assignee') }),
            handoffId: text(payload.handoffId, 'payload.handoffId'), updatedAt: timestamp(payload.updatedAt, 'payload.updatedAt') });
        case 'task.reassignment_released': return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'),
            expectedRevision: positive(payload.expectedRevision, 'payload.expectedRevision'), revision: positive(payload.revision, 'payload.revision'),
            handoffId: text(payload.handoffId, 'payload.handoffId'), updatedAt: timestamp(payload.updatedAt, 'payload.updatedAt') });
        case 'task.failed':
        case 'task.cancelled': return Object.freeze({ taskId: text(payload.taskId, 'payload.taskId'),
            expectedRevision: positive(payload.expectedRevision, 'payload.expectedRevision'), revision: positive(payload.revision, 'payload.revision'),
            attemptId: text(payload.attemptId, 'payload.attemptId'), ...(payload.output === undefined ? {} : { output: text(payload.output, 'payload.output') }),
            completedAt: timestamp(payload.completedAt, 'payload.completedAt'), updatedAt: timestamp(payload.updatedAt, 'payload.updatedAt') });
        case 'team.archived': return Object.freeze({});
    }
}
function frozen(value) { return Object.freeze(value); }
/** Construct one validated, deeply immutable event envelope. */
export function createTeamEvent(input) {
    const type = text(input.type, 'type');
    if (!['team.imported', 'team.created', 'team.archived', 'member.proposed', 'member.activated', 'member.failed', 'member.retired', 'member.status.changed', 'task.created', 'task.claimed', 'task.claim.released', 'task.started', 'task.output.updated', 'task.reassigned', 'task.reassignment_released', 'task.completed', 'task.failed', 'task.cancelled'].includes(type)) {
        fail('type is unsupported');
    }
    if (input.actor === null || typeof input.actor !== 'object')
        fail('actor must be an object');
    const actor = input.actor;
    const kind = text(actor.kind, 'actor.kind');
    if (!['captain', 'member', 'scheduler', 'system'].includes(kind))
        fail('actor.kind is unsupported');
    const sessionId = actor.sessionId === undefined ? undefined : text(actor.sessionId, 'actor.sessionId');
    const memberName = actor.memberName === undefined ? undefined : text(actor.memberName, 'actor.memberName');
    return frozen({
        schemaVersion: 1,
        eventId: text(input.eventId, 'eventId'), teamId: text(input.teamId, 'teamId'), sequence: positive(input.sequence, 'sequence'),
        type, timestamp: timestamp(input.timestamp, 'timestamp'),
        actor: frozen({ kind, ...(sessionId === undefined ? {} : { sessionId }), ...(memberName === undefined ? {} : { memberName }) }),
        payload: payloadFor(type, input.payload),
    });
}
function task(team, taskId) {
    const current = team.tasks.find(candidate => candidate.id === taskId);
    if (current === undefined)
        throw new Error(`Team event task "${taskId}" does not exist`);
    return current;
}
function nextTask(team, taskId, update) {
    return { ...team, tasks: team.tasks.map(current => current.id === taskId ? update(current) : current) };
}
function reducedMember(pending, payload) {
    return {
        id: payload.sessionId ?? pending.memberId, name: pending.name, ...(pending.role === undefined ? {} : { role: pending.role }),
        provider: payload.resolvedRoute.provider, model: payload.resolvedRoute.model,
        ...(payload.resolvedRoute.reasoningEffort === undefined ? {} : { reasoningEffort: payload.resolvedRoute.reasoningEffort }),
        ...(payload.agentId === undefined ? {} : { agentId: payload.agentId }),
        ...(payload.agentVersion === undefined ? {} : { agentVersion: payload.agentVersion }),
        ...(pending.soulId === undefined ? {} : { soulId: pending.soulId }),
        ...(pending.selectionReason === undefined ? {} : { selectionReason: pending.selectionReason }),
        ...(pending.createdFromTaskId === undefined ? {} : { createdFromTaskId: pending.createdFromTaskId }),
        ...(pending.soulMarkdown === undefined ? {} : { soulMarkdown: pending.soulMarkdown }),
        ...(pending.soulSummary === undefined ? {} : { soulSummary: pending.soulSummary }),
        joinedAt: pending.joinedAt, ...(payload.activatedAt === undefined ? {} : { activatedAt: payload.activatedAt }), status: 'idle',
    };
}
function apply(state, event) {
    if (event.type === 'team.imported') {
        if (state.team !== undefined)
            throw new Error('Team event team.imported may only occur once');
        const imported = event.payload.snapshot;
        if (imported.id !== event.teamId)
            throw new Error('Team event imported snapshot teamId does not match envelope');
        return { ...state, team: structuredClone(imported) };
    }
    if (event.type === 'team.created') {
        if (state.team !== undefined)
            throw new Error('Team event team.created may only occur once');
        const payload = event.payload;
        return { ...state, team: { name: payload.name, id: event.teamId, captainSessionId: payload.captainSessionId,
                createdAt: payload.createdAt, ...(payload.description === undefined ? {} : { description: payload.description }), members: [], tasks: [], taskSeq: 0 } };
    }
    if (state.team === undefined)
        throw new Error('Team event requires team.created or team.imported first');
    const team = state.team;
    if (event.type === 'member.proposed') {
        const payload = event.payload;
        if (state.pendingMembers.has(payload.memberId) || team.members.some(member => member.id === payload.memberId || member.name === payload.name))
            throw new Error('Team event member already exists');
        const pending = new Map(state.pendingMembers).set(payload.memberId, payload);
        return { ...state, pendingMembers: pending };
    }
    if (event.type === 'member.activated') {
        const payload = event.payload;
        const pending = state.pendingMembers.get(payload.memberId);
        if (pending === undefined)
            throw new Error('Team event member activation requires proposal');
        const remaining = new Map(state.pendingMembers);
        remaining.delete(payload.memberId);
        return { ...state, team: { ...team, members: [...team.members, reducedMember(pending, payload)] }, pendingMembers: remaining };
    }
    if (event.type === 'member.failed') {
        const payload = event.payload;
        const pending = state.pendingMembers.get(payload.memberId);
        if (pending === undefined)
            throw new Error('Team event member failure requires proposal');
        const remaining = new Map(state.pendingMembers);
        remaining.delete(payload.memberId);
        const failed = { id: pending.memberId, name: pending.name, ...(pending.role === undefined ? {} : { role: pending.role }), joinedAt: pending.joinedAt, status: 'failed', failedAt: payload.failedAt, failureReason: payload.failureReason };
        return { ...state, team: { ...team, members: [...team.members, failed] }, pendingMembers: remaining };
    }
    if (event.type === 'member.retired') {
        const payload = event.payload;
        if (!team.members.some(candidate => candidate.id === payload.memberId))
            throw new Error('Team event member retirement requires active member');
        return { ...state, team: { ...team, members: team.members.map(candidate => candidate.id === payload.memberId ? { ...candidate, status: 'removed' } : candidate) } };
    }
    if (event.type === 'member.status.changed') {
        const payload = event.payload;
        const member = team.members.find(candidate => candidate.id === payload.memberId);
        if (member === undefined || (member.status !== 'idle' && member.status !== 'working'))
            throw new Error('Team event member status requires active member');
        return { ...state, team: { ...team, members: team.members.map(candidate => candidate.id === payload.memberId ? { ...candidate, status: payload.status } : candidate) } };
    }
    if (event.type === 'task.created') {
        const payload = event.payload;
        if (team.tasks.some(current => current.id === payload.taskId))
            throw new Error('Team event task already exists');
        const next = { id: payload.taskId, subject: payload.subject, ...(payload.description === undefined ? {} : { description: payload.description }), ...(payload.assignee === undefined ? {} : { assignee: payload.assignee }), status: 'pending', dependencies: [...payload.dependencies], attempt: 0, createdAt: payload.createdAt, updatedAt: payload.createdAt, revision: 1 };
        return { ...state, team: { ...team, tasks: [...team.tasks, next], taskSeq: team.taskSeq + 1 } };
    }
    if (event.type === 'task.claimed') {
        const payload = event.payload;
        const current = task(team, payload.taskId);
        if (current.revision !== payload.expectedRevision || payload.revision !== payload.expectedRevision + 1)
            throw new Error('Team event task revision conflict');
        if (current.status !== 'pending' || current.reassigning === true)
            throw new Error('Team event task is not claimable');
        return { ...state, team: nextTask(team, payload.taskId, value => {
                const { handoffId: _handoffId, reassigning: _reassigning, output: _output, startedAt: _startedAt, completedAt: _completedAt, ...claimed } = value;
                return { ...claimed, status: 'claimed', assignee: payload.assignee, attempt: payload.attempt, attemptId: payload.attemptId, revision: payload.revision, updatedAt: payload.updatedAt };
            }) };
    }
    if (event.type === 'task.claim.released') {
        const payload = event.payload;
        const current = task(team, payload.taskId);
        if (current.revision !== payload.expectedRevision || payload.revision !== payload.expectedRevision + 1)
            throw new Error('Team event task revision conflict');
        if (current.attemptId !== payload.attemptId || (current.status !== 'claimed' && current.status !== 'in_progress'))
            throw new Error('Team event task claim is stale');
        return { ...state, team: nextTask(team, payload.taskId, value => {
                const { attemptId: _attemptId, handoffId: _handoffId, reassigning: _reassigning, output: _output, startedAt: _startedAt, completedAt: _completedAt, assignee: _assignee, ...released } = value;
                return { ...released, status: 'pending', updatedAt: payload.updatedAt, revision: payload.revision };
            }) };
    }
    if (event.type === 'task.completed') {
        const payload = event.payload;
        const current = task(team, payload.taskId);
        if (current.revision !== payload.expectedRevision || payload.revision !== payload.expectedRevision + 1)
            throw new Error('Team event task revision conflict');
        if (current.attemptId !== payload.attemptId)
            throw new Error('Team event task attempt is stale');
        if (current.status !== 'claimed' && current.status !== 'in_progress')
            throw new Error('Team event task is not completable');
        return { ...state, team: nextTask(team, payload.taskId, value => ({ ...value, status: 'completed', output: payload.output, completedAt: payload.completedAt, updatedAt: payload.updatedAt, revision: payload.revision })) };
    }
    if (event.type === 'task.started') {
        const payload = event.payload;
        const current = task(team, payload.taskId);
        if (current.revision !== payload.expectedRevision || payload.revision !== payload.expectedRevision + 1)
            throw new Error('Team event task revision conflict');
        if (current.attemptId !== payload.attemptId || current.status !== 'claimed')
            throw new Error('Team event task is not startable by this attempt');
        return { ...state, team: nextTask(team, payload.taskId, value => ({ ...value, status: 'in_progress', startedAt: payload.startedAt, updatedAt: payload.updatedAt, revision: payload.revision })) };
    }
    if (event.type === 'task.output.updated') {
        const payload = event.payload;
        const current = task(team, payload.taskId);
        if (current.revision !== payload.expectedRevision || payload.revision !== payload.expectedRevision + 1)
            throw new Error('Team event task revision conflict');
        if (current.attemptId !== payload.attemptId || (current.status !== 'claimed' && current.status !== 'in_progress'))
            throw new Error('Team event task output is stale');
        return { ...state, team: nextTask(team, payload.taskId, value => ({ ...value, output: payload.output, updatedAt: payload.updatedAt, revision: payload.revision })) };
    }
    if (event.type === 'task.reassigned') {
        const payload = event.payload;
        const current = task(team, payload.taskId);
        if (current.revision !== payload.expectedRevision || payload.revision !== payload.expectedRevision + 1)
            throw new Error('Team event task revision conflict');
        if (current.status === 'completed')
            throw new Error('Team event completed task cannot be reassigned');
        return { ...state, team: nextTask(team, payload.taskId, value => {
                const { attemptId: _attemptId, output: _output, startedAt: _startedAt, completedAt: _completedAt, ...pending } = value;
                return { ...pending, status: 'pending', ...(payload.assignee === undefined ? {} : { assignee: payload.assignee }), handoffId: payload.handoffId, reassigning: true, updatedAt: payload.updatedAt, revision: payload.revision };
            }) };
    }
    if (event.type === 'task.reassignment_released') {
        const payload = event.payload;
        const current = task(team, payload.taskId);
        if (current.revision !== payload.expectedRevision || payload.revision !== payload.expectedRevision + 1)
            throw new Error('Team event task revision conflict');
        if (current.handoffId !== payload.handoffId || current.reassigning !== true)
            throw new Error('Team event task handoff does not match');
        return { ...state, team: nextTask(team, payload.taskId, value => {
                const { handoffId: _handoffId, reassigning: _reassigning, ...released } = value;
                return { ...released, updatedAt: payload.updatedAt, revision: payload.revision };
            }) };
    }
    if (event.type === 'task.failed' || event.type === 'task.cancelled') {
        const payload = event.payload;
        const current = task(team, payload.taskId);
        if (current.revision !== payload.expectedRevision || payload.revision !== payload.expectedRevision + 1)
            throw new Error('Team event task revision conflict');
        if (current.attemptId !== payload.attemptId || (current.status !== 'claimed' && current.status !== 'in_progress'))
            throw new Error('Team event task is not terminally mutable by this attempt');
        const status = event.type === 'task.failed' ? 'failed' : 'cancelled';
        return { ...state, team: nextTask(team, payload.taskId, value => ({ ...value, status, ...(payload.output === undefined ? {} : { output: payload.output }), completedAt: payload.completedAt, updatedAt: payload.updatedAt, revision: payload.revision })) };
    }
    return { ...state, archived: true };
}
/** Replay a complete, ordered event stream into an immutable Team snapshot. */
export function reduceTeamEvents(events) {
    let state = { teamRevision: 0, archived: false, pendingMembers: new Map() };
    const eventIds = new Set();
    let priorSequence = 0;
    let teamId;
    for (const event of events) {
        const normalized = createTeamEvent(event);
        if (teamId !== undefined && normalized.teamId !== teamId)
            throw new Error('Team event teamId does not match stream');
        teamId ??= normalized.teamId;
        if (eventIds.has(normalized.eventId))
            throw new Error('Team event eventId is duplicated');
        if (normalized.sequence !== priorSequence + 1)
            throw new Error('Team event sequence is not contiguous');
        eventIds.add(normalized.eventId);
        state = { ...apply(state, normalized), teamRevision: normalized.sequence };
        priorSequence = normalized.sequence;
    }
    if (state.team === undefined)
        throw new Error('Team event stream has no team.created or team.imported event');
    return frozen({ team: frozen({ ...state.team, members: frozen([...state.team.members]), tasks: frozen([...state.team.tasks]) }), teamRevision: state.teamRevision, archived: state.archived });
}
