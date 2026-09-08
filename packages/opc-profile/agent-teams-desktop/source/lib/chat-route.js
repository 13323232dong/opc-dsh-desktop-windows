import { join } from 'node:path';
import { readTeam, readTeamChatPage, sanitizeKey, TEAM_CHAT_MAX_PAGE_LIMIT } from "./state.js";
import { isActiveTeamMember } from "./types.js";
export const TEAM_CHAT_PATH = '/plugins/dsh-agent-teams/chat';
const DEFAULT_CHAT_PAGE_LIMIT = 50;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/u;
function sendJson(res, status, payload) {
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
    });
    res.end(JSON.stringify(payload));
}
function fail(res, status, code, message) {
    sendJson(res, status, { success: false, error: { code, message } });
}
function boundedText(value, maximum) {
    if (value === null || value === '' || value.length > maximum || CONTROL_CHARACTERS.test(value))
        return undefined;
    return value;
}
function naturalNumber(value, fallback, maximum) {
    if (value === null)
        return fallback;
    if (!/^(?:0|[1-9]\d*)$/u.test(value))
        return undefined;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || (maximum !== undefined && parsed > maximum))
        return undefined;
    return parsed;
}
/** Serve authenticated, read-only team chat pages from one registered workspace. */
export async function handleTeamChatRequest(req, res, dependencies) {
    if ((req.method ?? 'GET') !== 'GET') {
        res.setHeader?.('allow', 'GET');
        fail(res, 405, 'METHOD_NOT_ALLOWED', 'team chat is read-only');
        return;
    }
    let url;
    try {
        url = new URL(req.url ?? '/', 'http://localhost');
    }
    catch {
        fail(res, 400, 'INVALID_QUERY', 'invalid chat query');
        return;
    }
    const workspaceName = boundedText(url.searchParams.get('workspace'), 256);
    const teamId = boundedText(url.searchParams.get('teamId'), 128);
    const sessionId = boundedText(url.searchParams.get('sessionId'), 256);
    const cursor = naturalNumber(url.searchParams.get('cursor'), 0);
    const limit = naturalNumber(url.searchParams.get('limit'), DEFAULT_CHAT_PAGE_LIMIT, TEAM_CHAT_MAX_PAGE_LIMIT);
    if (workspaceName === undefined || teamId === undefined || sessionId === undefined
        || cursor === undefined || limit === undefined || limit < 1 || sanitizeKey(teamId) !== teamId) {
        fail(res, 400, 'INVALID_QUERY', 'workspace, teamId, sessionId, cursor, or limit is invalid');
        return;
    }
    const workspaces = dependencies.workspaceRegistry.list()
        .filter(workspace => workspace.title === workspaceName);
    if (workspaces.length !== 1) {
        fail(res, 404, 'TEAM_CHAT_NOT_FOUND', 'team chat was not found');
        return;
    }
    try {
        const stateRoot = join(workspaces[0].path, dependencies.stateDir);
        const team = await readTeam(stateRoot, teamId);
        const authorized = team !== undefined && (team.captainSessionId === sessionId
            || team.members.some(member => member.id === sessionId && isActiveTeamMember(member)));
        if (!authorized) {
            fail(res, 404, 'TEAM_CHAT_NOT_FOUND', 'team chat was not found');
            return;
        }
        const page = await readTeamChatPage(stateRoot, teamId, { cursor, limit });
        sendJson(res, 200, { teamId, ...page });
    }
    catch {
        fail(res, 500, 'TEAM_CHAT_UNAVAILABLE', 'team chat is temporarily unavailable');
    }
}
