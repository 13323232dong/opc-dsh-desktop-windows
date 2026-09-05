import { join } from 'node:path';
import { createConsultation, readConsultations, validConsultationQuestion, writeConsultations } from "./consultations.js";
import { readTeam, sanitizeKey } from "./state.js";
export const CONSULTATION_PATH = '/plugins/dsh-agent-teams/consultations';
function json(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(JSON.stringify(body));
}
async function body(req) {
    let text = '';
    for await (const part of req) {
        text += String(part);
        if (text.length > 8_192)
            throw new Error('too large');
    }
    return JSON.parse(text);
}
/** Read and create private consultations; team membership is the authority. */
export async function handleConsultationRequest(req, res, deps) {
    let url;
    try {
        url = new URL(req.url ?? '/', 'http://localhost');
    }
    catch {
        json(res, 400, { error: 'invalid request' });
        return;
    }
    const workspaceName = url.searchParams.get('workspace')?.trim() ?? '';
    const teamId = url.searchParams.get('teamId')?.trim() ?? '';
    const sessionId = url.searchParams.get('sessionId')?.trim() ?? '';
    const workspace = deps.workspaceRegistry.list().find(item => item.title === workspaceName);
    if (workspace === undefined || teamId === '' || sessionId === '' || sanitizeKey(teamId) !== teamId) {
        json(res, 404, { error: 'consultations not found' });
        return;
    }
    const root = join(workspace.path, deps.stateDir);
    const team = await readTeam(root, teamId);
    if (team === undefined || !team.members.some(member => member.id === sessionId && member.status !== 'removed')) {
        json(res, 404, { error: 'consultations not found' });
        return;
    }
    if (req.method === 'GET') {
        json(res, 200, { consultations: await readConsultations(root, teamId) });
        return;
    }
    if (req.method !== 'POST') {
        res.setHeader('allow', 'GET, POST');
        json(res, 405, { error: 'method not allowed' });
        return;
    }
    try {
        const input = await body(req);
        const pauseRequested = input.action === 'pause';
        if ((!pauseRequested && !validConsultationQuestion(input.question)) || (input.taskId !== undefined && typeof input.taskId !== 'string')) {
            json(res, 400, { error: 'question is invalid' });
            return;
        }
        const member = team.members.find(item => item.id === sessionId);
        const taskId = typeof input.taskId === 'string' ? input.taskId : undefined;
        const task = taskId === undefined ? undefined : team.tasks.find(item => item.id === taskId && item.assignee === member.name && !['completed', 'failed', 'cancelled'].includes(item.status));
        if (pauseRequested && task === undefined) {
            json(res, 409, { error: '当前成员没有可暂停的执行任务。' });
            return;
        }
        const queued = createConsultation({
            teamId, memberId: member.id, memberName: member.name,
            question: pauseRequested ? '老板请求暂停当前任务并交队长处理。' : input.question,
            ...(taskId === undefined ? {} : { taskId }),
            ...(pauseRequested ? { kind: 'pause_request' } : {}),
        });
        const consultation = pauseRequested ? { ...queued, status: 'awaiting_captain' } : queued;
        const existing = await readConsultations(root, teamId);
        if (existing.some(item => item.memberId === member.id && (item.status === 'queued' || item.status === 'answering'))) {
            json(res, 409, { error: '该部门正在回复上一条沟通，请稍候。' });
            return;
        }
        await writeConsultations(root, teamId, [...existing, consultation]);
        if (pauseRequested)
            deps.requestPause(workspace.path, consultation);
        else
            deps.launch(workspace.path, consultation);
        json(res, 202, { consultation });
    }
    catch {
        json(res, 400, { error: 'request body is invalid' });
    }
}
