/**
 * The `/agent-teams` slash command and its plain-text gesture boundary.
 *
 * Two deterministic activation paths, mirroring the Harness skill pipeline
 * (`dsh-tool-skill` + the `ui-skill` client source):
 *
 * 1. **Host command** — `ctx.commands.register` publishes the closed-namespace
 *    `/agent-teams` command. The web GUI's slash menu (the Harness
 *    `ui-commands` client) lists it from the host catalog with the input
 *    hint; the argued line is claimed client-side and executed through
 *    `command.execute` WITHOUT ever reaching the model. The handler queues
 *    one explicit activation message as an ordinary follow-up turn
 *    (`agent.followup`), so the captain protocol starts deterministically —
 *    no "use AgentTeams" phrasing required.
 * 2. **Gesture boundary** — a `agent/pre-step` listener recognizes a leading
 *    `/agent-teams` token in genuine user messages and injects the same
 *    activation message. This covers surfaces with no command adjudication
 *    (headless CLI, API, pasted text in plain composers) and is a no-op for
 *    the command path, whose line is consumed before it can become a prompt.
 *    Mid-sentence mentions stay ordinary prose; only `source.kind === 'user'`
 *    messages are scanned, so injected or external text cannot forge the
 *    gesture.
 *
 * @module dsh-agent-teams/command
 */
import { createUserMessage } from '@deepseek-ai/dsh-llm';
/** The slash command name (without the leading slash). */
export const AGENT_TEAMS_COMMAND = 'agent-teams';
/**
 * A leading, whitespace-bounded `/agent-teams` token — the command grammar
 * shape the harness uses (`parseCommand`): `/` inside words, file paths and
 * mid-sentence mentions never match.
 */
const GESTURE = /^\/agent-teams(?=$|[\t\n\r ])/u;
/** Tools visible to the top-level captain during the confirmed execution turn. */
export const LEAD_FOLLOWUP_PROPOSAL_TOOLS = [];
/** Tools visible to the top-level captain during the confirmed execution turn. */
export const LEAD_FOLLOWUP_CAPTAIN_TOOLS = [
    'todo_write',
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
];
/** Keep provider tool selection on the captain's orchestration responsibility. */
export function isLeadFollowupCaptainTool(name) {
    return LEAD_FOLLOWUP_CAPTAIN_TOOLS.includes(name);
}
/** Recognize the business request that needs the interception + support handoff. */
export function detectLeadFollowupGoal(text) {
    const normalized = text.trim().replace(/[\u3000\t\n\r ]+/gu, '');
    const explicitFollowup = /(?:意向客户|意向线索)/u.test(normalized)
        && /(?:跟进|继续跟进)/u.test(normalized);
    const conversationalAcquisition = /(?:我)?想(?:要)?(?:获取|找|筛选|收集)\d{1,2}(?:个|名|位)?客户/u.test(normalized);
    if (!explicitFollowup && !conversationalAcquisition)
        return undefined;
    const match = normalized.match(/(?:获取|找|筛选|收集)(\d{1,2})(?:个|名|位)?(?:意向客户|意向线索|客户)/u);
    if (match === null)
        return undefined;
    const count = Number(match[1]);
    if (!Number.isInteger(count) || count < 1 || count > 50)
        return undefined;
    return { count, goal: text.trim() };
}
/** First-turn proposal for Douyin lead capture and WeChat follow-up. */
export function buildLeadFollowupProposalDirective(goal) {
    return [
        '这是获客与跟进请求的方案确认阶段。只展示执行方案，不得调用任何工具、不得创建团队、不得创建任务、不得操作浏览器或电脑。',
        `用户目标：${goal.goal}（目标 ${goal.count} 个意向客户）`,
        '用简洁中文展示待确认方案：由“截流专家”采集同行视频的公开评论并筛选真实意向线索；由“AI 客服”为入选线索生成跟进话术草稿。',
        '明确告知：本轮仅是方案预览，确认后才开始采集和分析；本次不自动发送抖音私信或微信消息，真实发送仍需单独确认。',
        '最后只请用户回复“确认执行”或提出修改；在收到明确确认前立即结束本轮。',
    ].join('\n');
}
/** Recognize the explicit approval that advances a pending lead proposal. */
export function isLeadFollowupConfirmation(text) {
    const normalized = text.trim().replace(/[\u3000\t\n\r ]+/gu, '');
    return /^(?:确认执行|确认开始)$/u.test(normalized);
}
/** Confirmed captain handoff for Douyin lead capture and WeChat follow-up. */
export function buildLeadFollowupExecutionDirective(goal) {
    return [
        '该用户目标需要 AgentTeams 协作，请立即担任队长并创建一个两人团队。',
        '用户已明确确认执行该方案；此确认只授权采集、意向分析和跟进草稿，不授权发送任何私信。',
        '团队名称使用“意向客户截流跟进”；不得将线索目标数写成团队人数。',
        `业务目标：${goal.goal}（目标 ${goal.count} 个意向客户）`,
        '成员一：命名“截流专家”，role=截流专家，soul_id=comment-ops。',
        '截流专家先创建并执行 competitor_intercept_rule_create / competitor_intercept_rule_run：搜索词只找同行视频，评论匹配词只做初筛。必须阅读每条候选评论后调用 competitor_chase_analyze 回写 assessments（commentId、keep、intentLevel、confidence、reason）；只保留模型判断为意向客户的真实评论用户。只使用工具返回的昵称、头像、用户 ID，不生成匿名占位。若采集中断，必须先调用 competitor_chase_status；没有完成记录时才以相同参数安全重试。不得将中断视为私信已发送，且不得调用 competitor_chase_send。',
        '成员二：命名“AI 客服”，role=AI 客服，soul_id=ai-customer-service。',
        'AI 客服接收截流专家的真实线索，生成逐条跟进话术；若没有手动绑定微信联系人，标记“微信联系人未绑定”，话术和跟进记录仍照常生成，不得阻塞任务。',
        '微信绑定后只能调用 wechat_read_current_chat、wechat_visual_prepare_reply 或 wechat_prepare_reply 进行预检和草稿；实际发送必须等待用户明确说“确认回复私信”，不得自动发送。',
        '抖音私信同样必须等待用户明确说“确认私信意向客户”；先展示收件人、评论摘要、话术和发送提案。',
        '队长必须创建采集、意向分析、话术准备和微信绑定检查任务，使用 agent_teams_send_message 交接结果，并向用户汇报每一步状态。',
        '截流专家只能使用任务指定的 competitor_intercept_* 和 competitor_chase_* 工具；禁止使用 computer_* 、bash 或文件搜索代替采集插件。必需工具失败时，立即将当前任务标记为 failed，向队长报告稳定错误并结束本轮，不得无限重试或改走通用控制工具。',
    ].join('\n');
}
/**
 * The deterministic activation text. The system-prompt usage section owns
 * the full protocol; this message only switches it on for one concrete goal.
 * @param goal - the user-supplied goal, or `''` for a bare invocation.
 */
export function buildActivationDirective(goal) {
    const goalLine = goal === ''
        ? 'The goal was not given — ask the user what the team should accomplish.'
        : `Goal: ${goal}`;
    return [
        'The user invoked the `/agent-teams` command. Activate the AgentTeams protocol from your instructions now: you are the captain of a multi-agent team.',
        goalLine,
    ].join('\n');
}
/**
 * The goal of the latest start-anchored `/agent-teams` gesture in genuine
 * user messages, or `undefined` when no message carries one. `''` means a
 * bare `/agent-teams` token with no goal.
 * @param messages - the step's claimed batch (user messages only scanned).
 */
export function invokedAgentTeamsGoal(messages) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message === undefined || message.source.kind !== 'user')
            continue;
        for (const block of message.content) {
            if (block.type !== 'text')
                continue;
            const text = block.text.trimStart();
            if (!GESTURE.test(text))
                continue;
            return text.slice(AGENT_TEAMS_COMMAND.length + 1).trim();
        }
    }
    return undefined;
}
/**
 * Register the closed-namespace `/agent-teams` host command. The handler
 * runs against the receiving agent without sending the slash line to the
 * model: it queues the activation message as an ordinary follow-up turn and
 * wakes the driver. The registration rides the calling context's fiber, so
 * a disposed scope (HMR, plugin removal) unregisters the command.
 * @param ctx - host context providing the `commands` registry.
 */
export function registerAgentTeamsCommand(ctx) {
    ctx.effect(() => ctx.commands.register({
        name: AGENT_TEAMS_COMMAND,
        description: 'run a goal with a multi-agent team (you become the captain)',
        input: { hint: '<goal — what the team should accomplish>' },
        handler(invocation) {
            const goal = invocation.rawInput.trim();
            if (goal === '') {
                return {
                    kind: 'error',
                    text: `Usage: /${AGENT_TEAMS_COMMAND} <goal — what the team should accomplish>`,
                };
            }
            // The slash command is converted into an internal activation message,
            // so the platform title service cannot see the user's goal as a normal
            // user prompt. Pin the goal on the top-level session before waking the
            // captain; title failures must never prevent the team from starting.
            try {
                invocation.agent.ctx.sessionTitle.rename(invocation.agent.session, goal);
            }
            catch (error) {
                invocation.agent.ctx?.logger?.warn(`agent-teams: failed to set session title: ${String(error)}`);
            }
            invocation.agent.followup(createUserMessage({
                content: [{ type: 'text', text: buildActivationDirective(goal) }],
                source: { kind: 'agent-teams-command', goal },
            }));
            return {
                kind: 'success',
                text: `AgentTeams activated — the captain will assemble a team for: ${goal}`,
            };
        },
    }), 'agent-teams: slash command');
}
/**
 * Install the `agent/pre-step` gesture boundary: a claimed user message
 * starting with `/agent-teams` gains the deterministic activation message
 * appended after every other injection, closest to the model's answer.
 * @param ctx - host context providing the `agent/pre-step` waterfall.
 */
export function installAgentTeamsGestureBoundary(ctx) {
    ctx.on('agent/pre-step', async ({ messages, signal }, next) => {
        const decision = await next();
        if (decision.kind === 'reject')
            return decision;
        const goal = invokedAgentTeamsGoal(messages);
        if (goal === undefined)
            return decision;
        signal.throwIfAborted();
        const activation = createUserMessage({
            content: [{ type: 'text', text: buildActivationDirective(goal) }],
            source: {
                kind: 'agent-teams-command',
                ...goal === '' ? {} : { goal },
            },
        });
        return { kind: 'enter', messages: [...decision.messages, activation] };
    });
}
