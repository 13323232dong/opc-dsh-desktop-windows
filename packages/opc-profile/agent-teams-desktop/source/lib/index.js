/**
 * AgentTeams for DeepSeek Harness.
 *
 * A host-plane plugin that registers the `agent_teams_*` tools and one usage
 * section into the global system prompt. After installation any session can
 * run multi-agent teamwork through natural language (e.g. "use AgentTeams to research X"):
 * the model creates a team (it becomes the captain), spawns members as
 * durable continuable subagents, breaks the goal into tasks with
 * dependencies, wakes members with messages, relays reports, and collects
 * results.
 *
 * Installation (bundle): `dsh plugin --profile <name> add @nanmicoder/dsh-agent-teams`
 * (or a local path). The bundle patch mounts this plugin row into the host
 * composition; the tools register into the shared `tools` registry and the
 * usage section into the global system prompt, so the plugin needs no realm.
 *
 * @module dsh-agent-teams
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import z from '@deepseek-ai/schemastery';
// Declaration merge only: makes ctx.llm, ctx.subagents and ctx.systemPrompt visible.
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { registerAgentTeamsTools } from "./tools.js";
import { buildLeadFollowupExecutionDirective, buildLeadFollowupProposalDirective, detectLeadFollowupGoal, installAgentTeamsGestureBoundary, isLeadFollowupConfirmation, LEAD_FOLLOWUP_CAPTAIN_TOOLS, LEAD_FOLLOWUP_PROPOSAL_TOOLS, registerAgentTeamsCommand, } from "./command.js";
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectArchivedTeamsActivity, collectTeamsActivity } from "./snapshot.js";
import { readArchivedTeam, readTeam } from "./state.js";
import { createLlmConcurrencyGate, createLlmRateLimitGate } from "./llm-concurrency.js";
import { handleToolGatewayRequest, TOOL_GATEWAY_PATH } from "./tool-gateway.js";
import { handleTeamChatRequest, TEAM_CHAT_PATH } from "./chat-route.js";
import { captainPromptSection, isTopLevelCaptainSession, loadCaptainMemoryBundleSync } from "./soul.js";
import { fetchCaptainSharedMemory } from "./shared-memory-client.js";
import { buildOnboardingDirective, fetchOnboardingInterview, skipOnboardingQuestion, submitOnboardingAnswer } from "./onboarding-client.js";
/** Web-server service key candidates, newest first. */
const WEB_SERVER_KEYS = ['webServer', 'httpServer'];
/** Workspace registry service key candidates, newest first. */
const WORKSPACE_KEYS = ['workspaceRegistry', 'workspace'];
export const name = 'agent-teams';
export const inject = ['tools', 'llm', 'subagents', 'sessionTitle', 'systemPrompt', 'agents'];
const INSPIRATION_TOOLS = [
    ['opc_inspiration_categories', 'categories', '读取 OPC TikHub 运营灵感分类。'],
    ['opc_inspiration_ranking_videos', 'rankingVideos', '读取 OPC TikHub 抖音热门视频榜单。'],
    ['opc_inspiration_ranking_topics', 'rankingTopics', '读取 OPC TikHub 抖音热门话题榜单。'],
    ['opc_inspiration_ranking_searches', 'rankingSearches', '读取 OPC TikHub 抖音热门搜索榜单。'],
    ['opc_inspiration_search_videos', 'searchVideos', '按关键词搜索 OPC TikHub 抖音运营灵感视频。'],
];
const inspirationParameters = (action) => {
    if (action === 'categories')
        return {};
    if (action === 'rankingVideos')
        return {
            type: { type: 'string', enum: ['overall', 'low_fan', 'high_completion', 'high_follower_growth', 'high_like_rate'], description: '榜单类型，默认 overall。' },
            windowHours: { type: 'number', enum: [24, 72, 168], description: '时间窗口，单位小时，默认 24。' },
            categoryId: { type: 'string', description: '可选分类 ID。' },
            keyword: { type: 'string', description: '可选关键词。' },
            cursor: { type: 'string', description: '可选分页游标。' },
            limit: { type: 'number', description: '返回条数，1-50，默认 20。' },
        };
    if (action === 'rankingTopics')
        return {
            type: { type: 'string', enum: ['overall', 'rising'], description: '榜单类型，默认 overall。' },
            windowHours: { type: 'number', enum: [24, 72, 168], description: '时间窗口，单位小时，默认 24。' },
            categoryId: { type: 'string', description: '可选分类 ID。' },
            cursor: { type: 'string', description: '可选分页游标。' },
            limit: { type: 'number', description: '返回条数，1-50，默认 20。' },
        };
    if (action === 'rankingSearches')
        return {
            type: { type: 'string', enum: ['overall', 'rising'], description: '榜单类型，默认 overall。' },
            windowHours: { type: 'number', enum: [24, 72, 168], description: '时间窗口，单位小时，默认 24。' },
            cursor: { type: 'string', description: '可选分页游标。' },
            limit: { type: 'number', description: '返回条数，1-50，默认 20。' },
        };
    return {
        q: { type: 'string', required: true, description: '搜索关键词，例如：猪肉店、生鲜店。' },
        sort: { type: 'string', enum: ['relevance', 'most_liked', 'newest'], description: '排序方式，默认 relevance。' },
        publishedWithin: { type: 'string', enum: ['any', '1d', '7d', '180d'], description: '发布时间范围，默认 any。' },
        cursor: { type: 'string', description: '可选分页游标。' },
        limit: { type: 'number', description: '返回条数，1-50，默认 20。' },
    };
};
function advisorPersona(memberName, role, soul) {
    return `你是 ${memberName} 的只读顾问副本，岗位是 ${role || '部门专家'}。\n你只回答老板的咨询，绝不调用工具、绝不创建或修改任务、绝不承诺执行。\n请给出建议、理由、对当前任务的影响及成本或风险。最终是否执行由组长决定。${soul === undefined ? '' : `\n表达风格：${soul.slice(0, 1_200)}`}`;
}
function registerOpcInspirationTools(ctx) {
    for (const [name, action, description] of INSPIRATION_TOOLS) {
        ctx.tools.register(defineTool({
            name,
            description: `${description} 这是只读工具，必须优先用于猪肉店、生鲜店、短视频热点和选题请求；不要改用 web_search。`,
            parameters: inspirationParameters(action),
            output: {
                schema: { type: 'object', additionalProperties: true },
                render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
            },
            async execute(args, exec) {
                if (exec.agent === undefined)
                    throw new Error(`${name} requires a calling agent`);
                const identityService = ctx.get('opcDshIdentity');
                const principal = await identityService?.resolve(exec.agent.id, undefined, exec.agent.session.header.parentSession);
                if (principal === undefined)
                    throw new Error(`${name} requires an authenticated DSH session`);
                const configured = (process.env.OPC_API_BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/$/u, '');
                const baseUrl = configured.endsWith('/api/v1') ? configured : `${configured}/api/v1`;
                const response = await fetch(`${baseUrl}/internal/tools/inspiration/execute`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-opc-agent-key': process.env.OPC_AGENT_API_KEY ?? '',
                        'x-tenant-id': principal.tenantId,
                        'x-user-id': principal.userId,
                        'x-agent-id': principal.agentId,
                        'x-session-id': exec.agent.id,
                        'idempotency-key': `dsh-inspiration:${exec.agent.id}:${action}:${Date.now()}`,
                    },
                    body: JSON.stringify({ action, input: args ?? {} }),
                });
                const payload = await response.json().catch(() => undefined);
                if (!response.ok)
                    throw new Error(payload?.error?.message ?? `OPC 运营灵感工具请求失败（HTTP ${response.status}）`);
                return (payload?.data?.result && typeof payload.data.result === 'object') ? payload.data.result : { result: payload?.data?.result };
            },
        }));
    }
}
function registerOnboardingTools(ctx, config) {
    const resolveConfig = async (exec) => {
        if (exec.agent === undefined)
            throw new Error('访谈引导需要由 CEO 对话发起');
        const identityService = ctx.get('opcDshIdentity');
        const principal = await identityService?.resolve(exec.agent.id, undefined, exec.agent.session.header.parentSession);
        if (principal === undefined)
            throw new Error('无法确认当前商户身份');
        return {
            harnessBaseUrl: config.controlPlaneRegistryBaseUrl,
            identityHmacSecret: config.controlPlaneIdentityHmacSecret,
            tenantId: principal.tenantId,
            userId: principal.userId,
            agentId: principal.agentId,
            sessionId: exec.agent.id,
        };
    };
    const render = (_args, value) => [{ type: 'text', text: JSON.stringify(value) }];
    ctx.tools.register(defineTool({
        name: 'opc_onboarding_record_answer',
        description: '记录商户对当前访谈问题的原话，并返回下一道需要问的问题。仅在首次访谈中使用。',
        parameters: {
            field: { type: 'string', required: true, description: '当前访谈问题的字段名。' },
            value: { type: 'string', required: true, description: '商户回答的原意，不要添加推断。' },
        },
        output: { schema: { type: 'object', additionalProperties: true }, render },
        async execute(args, exec) {
            const field = typeof args.field === 'string' ? args.field.trim() : '';
            const value = typeof args.value === 'string' ? args.value.trim() : '';
            if (field === '' || value === '')
                throw new Error('访谈回答不能为空');
            const result = await submitOnboardingAnswer(await resolveConfig(exec), { field, value });
            if (result === undefined)
                throw new Error('访谈服务暂时不可用，请稍后重试');
            return result;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'opc_onboarding_skip_question',
        description: '按商户明确要求跳过当前访谈问题，并返回下一道需要问的问题。',
        parameters: { field: { type: 'string', required: true, description: '要跳过的当前访谈字段名。' } },
        output: { schema: { type: 'object', additionalProperties: true }, render },
        async execute(args, exec) {
            const field = typeof args.field === 'string' ? args.field.trim() : '';
            if (field === '')
                throw new Error('访谈字段不能为空');
            const result = await skipOnboardingQuestion(await resolveConfig(exec), { field });
            if (result === undefined)
                throw new Error('访谈服务暂时不可用，请稍后重试');
            return result;
        },
    }));
}
export const Config = z.object({
    stateDir: z.string().default('.agent-teams'),
    soulDirectory: z.string().default('.agent-teams/agents'),
    ceoSoulId: z.string().default('captain'),
    memberProvider: z.string().default('spawn'),
    memberModel: z.string(),
    memberMaxDepth: z.natural().default(1),
    maxMembers: z.natural().min(1).default(8),
    maxTeamMessages: z.natural().min(2).default(1_000),
    maxConsecutiveMemberMessages: z.natural().min(1).default(8),
    promptSectionOrder: z.natural().default(117),
    maxConcurrentLlmRequests: z.natural().min(1),
    minLlmRequestIntervalMs: z.natural(),
    llmRateLimitCooldownMs: z.natural(),
    slashCommand: z.boolean().default(true),
    controlPlaneEnabled: z.boolean().default(false),
    controlPlaneApiBaseUrl: z.string().default(''),
    controlPlaneRegistryBaseUrl: z.string().default(''),
    controlPlaneGatewayTimeoutMs: z.number().min(500).max(30_000).default(8_000),
    controlPlaneIdentityHmacSecret: z.string().default(''),
    controlPlaneTenantId: z.string().default(''),
    controlPlaneUserId: z.string().default(''),
    controlPlaneAgentId: z.string().default(''),
});
/** The model-facing usage policy: when and how to drive AgentTeams. */
function usageSectionText(toolNames) {
    return `When the user asks to run something with AgentTeams (e.g. "use AgentTeams to do X") or an activation message from the /agent-teams slash command arrives, you are the captain of a multi-agent team. Follow this protocol:
1. Call agent_teams_create with a team name and the goal as description. You become the captain and may lead one team at a time.
2. Call agent_teams_add_member once per role the goal needs (researcher, engineer, reviewer, ...). Members are durable subagents: they wait for your messages, then work a full turn. By default a member on your current provider/model snapshots your current reasoning effort; a member routed to a different provider or model automatically uses that target model's default effort. Never ask the user to choose these per member; only pass provider/model when the user explicitly requests a different route for that role, and reasoning_effort only when the user explicitly requests a particular effort ("default" explicitly selects the target model's default).
3. Break the goal into tasks with agent_teams_create_task and wire dependencies. Assign role-specific work when useful; unassigned ready work belongs to the shared pool. The scheduler automatically claims one ready task for each truly idle member and wakes it, including across later rounds.
4. Lead by delegation: monitor with agent_teams_status, send guidance with agent_teams_send_message, and let idle teammates execute ready work. Keep complete instructions in content, and add display_content as one natural Chinese office-chat sentence (at most 56 characters) in your SOUL voice for the read-only workbench. Do not put task protocol, paths, JSON, or tool parameters in display_content. Do not duplicate a teammate's work merely because its turn is slow.
5. If work is blocked, stale, or needs takeover, always call agent_teams_reassign_task first. Reassign to another idle member, or use assignee=captain before doing it yourself. Reassignment revokes the old attempt and waits for that member to quiesce, preventing late results from overwriting the new attempt.
6. Tasks carry attempt_id capabilities. Members must use the current attempt_id for updates; stale-attempt errors mean ownership changed. Poll status until every required task is terminal and every member is idle/ready.
7. Present the team's results to the user, then agent_teams_delete the team unless the user wants to keep working with it.

Lead follow-up workflow: an ordinary request to acquire a numbered set of意向客户 is proposal-only on its first turn. Do not call tools or create a team until the dedicated lead-followup execution activation states that the user explicitly confirmed the proposal. After confirmation create exactly two members: “截流专家” (soul_id=comment-ops) and “AI 客服” (soul_id=ai-customer-service). The first owns competitor_chase_create/competitor_chase_analyze and hands off only real public identities. The second owns follow-up drafts and the WeChat path. An unbound WeChat contact is a visible pending state, not a blocker to drafting. Never send Douyin or WeChat messages without the matching explicit confirmation phrase.

Tools: ${toolNames}`;
}
export function apply(ctx, config) {
    // OPC trend research must use the authenticated TikHub-backed tools. The
    // host's separately billed web search is deliberately unavailable here.
    ctx.tools.guard((execution) => execution.name === 'web_search'
        ? '通用联网搜索已在 OPC 工作台禁用，请使用 opc_inspiration_* TikHub 工具。'
        : undefined);
    const resolved = {
        stateDir: config.stateDir ?? '.agent-teams',
        soulDirectory: config.soulDirectory ?? '.agent-teams/agents',
        memberProvider: config.memberProvider ?? 'spawn',
        memberModel: config.memberModel,
        memberMaxDepth: config.memberMaxDepth ?? 1,
        maxMembers: config.maxMembers ?? 8,
        maxTeamMessages: config.maxTeamMessages ?? 1_000,
        maxConsecutiveMemberMessages: config.maxConsecutiveMemberMessages ?? 8,
        controlPlaneEnabled: config.controlPlaneEnabled === true,
        controlPlaneRegistryBaseUrl: config.controlPlaneRegistryBaseUrl,
        controlPlaneGatewayTimeoutMs: config.controlPlaneGatewayTimeoutMs,
        controlPlaneIdentityHmacSecret: config.controlPlaneIdentityHmacSecret,
    };
    registerOpcInspirationTools(ctx);
    if (config.controlPlaneEnabled === true)
        registerOnboardingTools(ctx, config);
    // Provider registration is a sibling plugin's effect (`subagent-spawn` /
    // `subagent-fork` rows), which can land after this mount under the Loader's
    // concurrent activation — so capability validation happens at the first
    // member spawn (`spawnMember`), the earliest point the provider list is
    // settled, rather than here.
    const toolNames = [
        'agent_teams_create',
        'agent_teams_add_member',
        'agent_teams_remove_member',
        'agent_teams_create_task',
        'agent_teams_reassign_task',
        'agent_teams_claim_task',
        'agent_teams_update_task',
        'agent_teams_send_message',
        'agent_teams_status',
        'agent_teams_delete',
    ].join(', ');
    ctx.systemPrompt.section({
        name: 'agent-teams:usage',
        order: config.promptSectionOrder ?? 117,
        text: usageSectionText(toolNames),
    });
    // A top-level DSH conversation is the captain. Keep this contribution
    // Agent-scoped so continuable children retain their own member persona.
    // The provider is evaluated on every model request, allowing recent plans
    // and memory files to change without restarting or rewriting the session.
    const ceoSections = new Map();
    const leadCaptainToolRestrictions = new WeakMap();
    const sharedCeoContext = new Map();
    const installCeoSection = (agent) => {
        if (!isTopLevelCaptainSession(agent.session.header.parentSession) || ceoSections.has(agent))
            return;
        const workspace = agent.session.header.cwd ?? process.cwd();
        ceoSections.set(agent, agent.ctx.systemPrompt.section({
            name: 'agent-teams:captain-context',
            order: 20,
            text: () => captainPromptSection(loadCaptainMemoryBundleSync(workspace, config.soulDirectory ?? '.agent-teams/agents', config.ceoSoulId ?? 'captain'), sharedCeoContext.get(agent.id)?.text ?? ''),
        }));
    };
    for (const agent of ctx.agents.list())
        installCeoSection(agent);
    ctx.on('agent/created', ({ agent }) => { installCeoSection(agent); });
    ctx.on('agent/disposed', ({ agent }) => {
        leadCaptainToolRestrictions.get(agent)?.dispose();
        leadCaptainToolRestrictions.delete(agent);
        ceoSections.get(agent)?.();
        ceoSections.delete(agent);
    });
    ctx.effect(() => () => {
        for (const dispose of ceoSections.values())
            dispose();
        ceoSections.clear();
        sharedCeoContext.clear();
    }, 'agent-teams: captain persona');
    ctx.on('agent/pre-step', async ({ agent, signal, turn }, next) => {
        let onboardingDirective;
        if (config.controlPlaneEnabled === true && isTopLevelCaptainSession(agent.session.header.parentSession)) {
            const cached = sharedCeoContext.get(agent.id);
            if (cached === undefined || Date.now() - cached.fetchedAt >= 30_000) {
                const identityService = ctx.get('opcDshIdentity');
                const principal = await identityService?.resolve(agent.id, undefined, agent.session.header.parentSession);
                const context = principal === undefined ? undefined : await fetchCaptainSharedMemory({
                    harnessBaseUrl: config.controlPlaneRegistryBaseUrl,
                    identityHmacSecret: config.controlPlaneIdentityHmacSecret,
                    tenantId: principal.tenantId,
                    userId: principal.userId,
                    agentId: principal.agentId,
                    sessionId: agent.id,
                    signal,
                });
                if (context !== undefined)
                    sharedCeoContext.set(agent.id, { text: context.text, fetchedAt: Date.now() });
            }
            const identityService = ctx.get('opcDshIdentity');
            const principal = await identityService?.resolve(agent.id, undefined, agent.session.header.parentSession);
            const interview = principal === undefined ? undefined : await fetchOnboardingInterview({
                harnessBaseUrl: config.controlPlaneRegistryBaseUrl,
                identityHmacSecret: config.controlPlaneIdentityHmacSecret,
                tenantId: principal.tenantId,
                userId: principal.userId,
                agentId: principal.agentId,
                sessionId: agent.id,
            });
            onboardingDirective = buildOnboardingDirective(interview);
        }
        const decision = await next();
        if (decision.kind === 'reject')
            return decision;
        const latestUserText = decision.messages
            .slice()
            .reverse()
            .find(message => message.source.kind === 'user')
            ?.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n') ?? '';
        const leadGoal = detectLeadFollowupGoal(latestUserText);
        const latestProposal = decision.messages
            .slice()
            .reverse()
            .find(message => message.source.kind === 'agent-teams-lead-followup' && message.source.stage === 'proposal');
        const proposalSource = latestProposal?.source.kind === 'agent-teams-lead-followup'
            ? latestProposal.source
            : undefined;
        const alreadyExecuted = proposalSource === undefined
            ? false
            : decision.messages.some(message => message.source.kind === 'agent-teams-lead-followup'
                && message.source.stage === 'execution'
                && message.source.goal === proposalSource.goal);
        const confirmedGoal = proposalSource !== undefined
            && !alreadyExecuted
            && isLeadFollowupConfirmation(latestUserText)
            ? { goal: proposalSource.goal, count: proposalSource.count }
            : undefined;
        const activationGoal = confirmedGoal ?? leadGoal;
        if (activationGoal === undefined && onboardingDirective === undefined)
            return decision;
        const onboardingMessage = onboardingDirective === undefined ? [] : [createUserMessage({
                content: [{ type: 'text', text: onboardingDirective }],
                source: { kind: 'agent-teams-command', goal: 'onboarding' },
            })];
        if (activationGoal === undefined)
            return { kind: 'enter', messages: [...decision.messages, ...onboardingMessage] };
        const stage = confirmedGoal === undefined ? 'proposal' : 'execution';
        const existing = leadCaptainToolRestrictions.get(agent);
        if (existing?.turn !== turn) {
            existing?.dispose();
            const allowedTools = stage === 'execution'
                ? LEAD_FOLLOWUP_CAPTAIN_TOOLS
                : LEAD_FOLLOWUP_PROPOSAL_TOOLS;
            leadCaptainToolRestrictions.set(agent, {
                turn,
                dispose: agent.ctx.tools.restrict({ allow: [...allowedTools] }),
            });
        }
        return {
            kind: 'enter',
            messages: [...decision.messages, ...onboardingMessage, {
                    id: `agent-teams-lead-followup-${stage}-${agent.id}-${Date.now()}`,
                    role: 'user',
                    content: [{ type: 'text', text: confirmedGoal === undefined
                                ? buildLeadFollowupProposalDirective(activationGoal)
                                : buildLeadFollowupExecutionDirective(activationGoal) }],
                    source: {
                        kind: 'agent-teams-lead-followup',
                        goal: activationGoal.goal,
                        count: activationGoal.count,
                        stage,
                    },
                }],
        };
    });
    ctx.on('agent/turn-stopping', ({ agent, turn }) => {
        const restriction = leadCaptainToolRestrictions.get(agent);
        if (restriction?.turn !== turn)
            return;
        restriction.dispose();
        leadCaptainToolRestrictions.delete(agent);
    });
    registerAgentTeamsTools(ctx, resolved);
    // Some providers, including the current Kimi organisation route, permit a
    // single active request. Gate streams rather than retrying concurrent 429s:
    // this covers member creation, task delivery, and captain continuation.
    if (config.maxConcurrentLlmRequests !== undefined) {
        const gates = new Map();
        const resolveGate = (provider) => {
            const key = typeof provider === 'string' && provider.length > 0 ? provider : '__default__';
            const existing = gates.get(key);
            if (existing)
                return existing;
            // The configured provider identifier differs by adapter (for example
            // `kimi` versus `moonshotai-cn`). Apply the profile's configured pacing
            // to each provider-specific queue instead of relying on one alias.
            const gate = (config.minLlmRequestIntervalMs ?? 0) > 0
                ? createLlmRateLimitGate({
                    maxConcurrent: config.maxConcurrentLlmRequests,
                    minIntervalMs: config.minLlmRequestIntervalMs,
                    rateLimitCooldownMs: config.llmRateLimitCooldownMs ?? 60_000,
                })
                : createLlmConcurrencyGate(config.maxConcurrentLlmRequests);
            gates.set(key, gate);
            return gate;
        };
        ctx.on('llm/stream', (options, next) => resolveGate(options.provider).stream(next, options.signal), { global: true });
    }
    // Deterministic activation surfaces: the closed-namespace `/agent-teams`
    // host command (surfaces in the Web GUI slash menu via the Harness
    // ui-commands client) and the plain-text gesture boundary for surfaces
    // without command adjudication (headless CLI). Both default on; a profile
    // can disable them to keep the natural-language trigger exclusive.
    //
    // `commands` is registered lazily (not a required inject): it ships in the
    // base bundle of every standard profile, but a minimal composition that
    // omits the command registry keeps the plugin fully functional — the fiber
    // never pends on it and simply never gains the slash command.
    if (config.slashCommand ?? true) {
        ctx.inject(['commands'], (commandCtx) => {
            registerAgentTeamsCommand(commandCtx);
        });
        installAgentTeamsGestureBoundary(ctx);
    }
    // The activity panel data/artwork routes need the Web server and the
    // workspace registry, which headless profiles do not mount; under
    // concurrent activation they may also bind after this plugin. Register the
    // routes lazily: try now, then on each service binding event. In a webless
    // profile the plugin stays tool-only and never blocks boot.
    let webRegistered = false;
    const registerWebSurface = () => {
        if (webRegistered)
            return;
        const webServer = (ctx.get(WEB_SERVER_KEYS[0]) ?? ctx.get(WEB_SERVER_KEYS[1]));
        const workspaceRegistry = (ctx.get(WORKSPACE_KEYS[0]) ?? ctx.get(WORKSPACE_KEYS[1]));
        if (webServer === undefined || workspaceRegistry === undefined)
            return;
        webRegistered = true;
        // Activity panel data route: the browser floater polls this for team
        // snapshots (disk truth + live subagent activity). Mirrors the Claude
        // Code desktop watcher's server-side snapshot pattern.
        ctx.effect(() => webServer.register({
            kind: 'exact',
            path: '/plugins/dsh-agent-teams/state',
            handler: async (req, res) => {
                const url = new URL(req.url ?? '/', 'http://x');
                const roots = workspaceRegistry.list().map((workspace) => ({
                    workspace: workspace.title,
                    stateRoot: join(workspace.path, resolved.stateDir),
                }));
                // ?archived=1 serves teams moved to archive/ (post-delete review).
                const snapshots = url.searchParams.get('archived') === '1'
                    ? await collectArchivedTeamsActivity(ctx, roots)
                    : await collectTeamsActivity(ctx, roots);
                const body = JSON.stringify({
                    teams: snapshots,
                    controlPlaneEnabled: config.controlPlaneEnabled === true,
                });
                res.writeHead(200, {
                    'content-type': 'application/json; charset=utf-8',
                    'cache-control': 'no-store',
                });
                res.end(body);
            },
        }), 'agent-teams: activity route');
        // Generated files are served only from registered local workspaces. The
        // route accepts a basename, never an arbitrary path, so a completion card
        // can open a file without exposing the rest of the host filesystem.
        ctx.effect(() => webServer.register({
            kind: 'exact',
            path: '/plugins/dsh-agent-teams/files',
            handler: async (req, res) => {
                const url = new URL(req.url ?? '/', 'http://x');
                const workspaceName = url.searchParams.get('workspace')?.trim() ?? '';
                const requestedPath = url.searchParams.get('path')?.trim() ?? url.searchParams.get('name')?.trim() ?? '';
                const workspace = workspaceRegistry.list().find((entry) => entry.title === workspaceName);
                const normalizedPath = requestedPath === '' ? '' : relative(workspace?.path ?? '', resolve(workspace?.path ?? '', requestedPath));
                if (workspace === undefined || normalizedPath === '' || normalizedPath.startsWith('..') || resolve(workspace.path, normalizedPath) !== resolve(workspace.path, requestedPath)) {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                const filePath = resolve(workspace.path, normalizedPath);
                const workspacePath = resolve(workspace.path);
                const outsideWorkspace = relative(workspacePath, filePath).startsWith('..');
                if (outsideWorkspace) {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                try {
                    const info = await stat(filePath);
                    if (!info.isFile())
                        throw new Error('not a file');
                    const extension = filePath.toLowerCase().split('.').pop() ?? '';
                    const contentType = {
                        md: 'text/markdown; charset=utf-8', txt: 'text/plain; charset=utf-8', json: 'application/json; charset=utf-8',
                        pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv; charset=utf-8',
                        mp4: 'video/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                        webp: 'image/webp', mov: 'video/quicktime', m4v: 'video/mp4', webm: 'video/webm',
                    };
                    res.writeHead(200, {
                        'content-type': contentType[extension] ?? 'application/octet-stream',
                        'content-length': String(info.size),
                        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(basename(normalizedPath))}`,
                        'cache-control': 'no-store',
                    });
                    createReadStream(filePath).pipe(res);
                }
                catch {
                    res.writeHead(404);
                    res.end();
                }
            },
        }), 'agent-teams: generated file route');
        // Text-only task results are still user-facing deliverables. Keep them
        // virtual rather than writing new files while serving a read-only snapshot.
        ctx.effect(() => webServer.register({
            kind: 'exact',
            path: '/plugins/dsh-agent-teams/task-output',
            handler: async (req, res) => {
                const url = new URL(req.url ?? '/', 'http://x');
                const workspaceName = url.searchParams.get('workspace')?.trim() ?? '';
                const teamId = url.searchParams.get('teamId')?.trim() ?? '';
                const taskId = url.searchParams.get('taskId')?.trim() ?? '';
                const workspace = workspaceRegistry.list().find((entry) => entry.title === workspaceName);
                if (workspace === undefined || teamId === '' || basename(teamId) !== teamId || taskId === '') {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                const stateRoot = join(workspace.path, resolved.stateDir);
                const team = await readTeam(stateRoot, teamId) ?? await readArchivedTeam(stateRoot, teamId);
                const task = team?.tasks.find((item) => item.id === taskId);
                if (team === undefined || task === undefined || task.output?.trim() === undefined || task.output.trim() === '') {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                const fileName = `${task.id}-任务报告.md`;
                const body = `# ${team.name} / ${task.subject}\n\n${task.output}\n`;
                res.writeHead(200, {
                    'content-type': 'text/markdown; charset=utf-8',
                    'content-length': String(Buffer.byteLength(body)),
                    'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                    'cache-control': 'no-store',
                });
                res.end(body);
            },
        }), 'agent-teams: task report route');
        if (config.controlPlaneEnabled === true) {
            // This adapter is deliberately opt-in. The Agent Teams core never
            // assumes a tenant, billing system, or remote control plane exists.
            const controlPlaneConfig = {
                opcApiBaseUrl: config.controlPlaneApiBaseUrl,
                harnessBaseUrl: config.controlPlaneRegistryBaseUrl,
                gatewayTimeoutMs: config.controlPlaneGatewayTimeoutMs,
                identityHmacSecret: config.controlPlaneIdentityHmacSecret,
                harnessIdentityHmacSecret: config.controlPlaneIdentityHmacSecret,
            };
            const identityService = {
                resolve: (sessionId, request, parentSessionId) => {
                    const service = ctx.get('opcDshIdentity');
                    return service?.resolve(sessionId, request, parentSessionId) ?? Promise.resolve(undefined);
                },
            };
            ctx.effect(() => webServer.register({
                kind: 'prefix',
                path: TOOL_GATEWAY_PATH,
                handler: (req, res) => { void handleToolGatewayRequest(req, res, controlPlaneConfig, fetch, identityService); },
            }), 'agent-teams: optional control-plane gateway');
        }
        ctx.effect(() => webServer.register({
            kind: 'exact',
            path: TEAM_CHAT_PATH,
            handler: (req, res) => handleTeamChatRequest(req, res, {
                stateDir: resolved.stateDir,
                workspaceRegistry,
            }),
        }), 'agent-teams: read-only chat route');
        // Packaged role/action artwork: serve a fixed allowlist rather than an
        // activity panel. An explicit allowlist guards the route (no path
        // traversal); the images ship with the bundle (files: assets/).
        const artDir = fileURLToPath(new URL('../assets/agent-teams/', import.meta.url));
        const ART_ALLOWLIST = new Set([
            'team-lead.png', 'researcher.png', 'engineer.png', 'designer.png',
            'qa-engineer.png', 'security-reviewer.png', 'data-analyst.png',
            'docs-coordinator.png', 'action-working.png', 'action-thinking.png',
            'action-reporting.png', 'action-celebrating.png', 'action-sleeping.png',
            'action-sending.png',
        ]);
        const AVATAR_ALLOWLIST = new Set([
            'captain.png', 'scriptwriter.png', 'researcher.png', 'creative-planner.png',
            'video-producer.png', 'reviewer.png', 'designer.png', 'operations.png',
            'growth-analyst.png', 'data-analyst.png', 'topic-editor.png', 'competitor-radar.png',
            'publisher.png', 'comment-ops.png', 'customer-service.png', 'asset-manager.png',
            'voice-tts.png', 'compliance-reviewer.png', 'tech-checker.png', 'digital-human-producer.png',
        ]);
        ctx.effect(() => webServer.register({
            kind: 'prefix',
            path: '/plugins/dsh-agent-teams/assets',
            handler: async (req, res) => {
                let assetPath;
                try {
                    const pathname = new URL(req.url ?? '/', 'http://x').pathname;
                    assetPath = decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '');
                }
                catch {
                    // Malformed percent-encoding: treat as an unknown asset, not a 400.
                    res.writeHead(404);
                    res.end();
                    return;
                }
                if (!ART_ALLOWLIST.has(assetPath)) {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                try {
                    const data = await readFile(join(artDir, assetPath));
                    res.writeHead(200, {
                        'content-type': 'image/png',
                        'cache-control': 'public, max-age=86400',
                    });
                    res.end(data);
                }
                catch (error) {
                    ctx.logger.warn(`agent-teams: artwork read failed for ${assetPath}: ${String(error)}`);
                    res.writeHead(404);
                    res.end();
                }
            },
        }), 'agent-teams: artwork route');
        ctx.effect(() => webServer.register({
            kind: 'prefix',
            path: '/plugins/dsh-agent-teams/avatars',
            handler: async (req, res) => {
                let name;
                try {
                    // Some DSH versions preserve the registered prefix in req.url and
                    // others strip it. This dedicated route has no nested filenames,
                    // so the basename is stable for both shapes.
                    name = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname.split('/').filter(Boolean).pop() ?? '');
                }
                catch {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                if (!AVATAR_ALLOWLIST.has(name)) {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                try {
                    const data = await readFile(join(artDir, 'avatars', name));
                    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' });
                    res.end(data);
                }
                catch (error) {
                    ctx.logger.warn(`agent-teams: avatar read failed for ${name}: ${String(error)}`);
                    res.writeHead(404);
                    res.end();
                }
            },
        }), 'agent-teams: avatar artwork route');
    };
    registerWebSurface();
    ctx.on('internal/service', (name) => {
        if (WEB_SERVER_KEYS.includes(name)
            || WORKSPACE_KEYS.includes(name)) {
            registerWebSurface();
        }
    });
}
