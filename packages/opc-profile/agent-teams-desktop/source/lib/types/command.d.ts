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
import type { Context } from '@deepseek-ai/cordis';
import { type UserMessage } from '@deepseek-ai/dsh-llm';
/** The slash command name (without the leading slash). */
export declare const AGENT_TEAMS_COMMAND = "agent-teams";
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        /**
         * A deterministic `/agent-teams` activation: the goal the user supplied,
         * delivered as an ordinary follow-up turn instead of the raw slash line.
         */
        'agent-teams-command': {
            readonly kind: 'agent-teams-command';
            /** The user-supplied goal text (absent when the gesture was bare). */
            readonly goal?: string;
        };
        'agent-teams-lead-followup': {
            readonly kind: 'agent-teams-lead-followup';
            readonly goal: string;
            readonly count: number;
            readonly stage: 'proposal' | 'execution';
        };
    }
}
export interface LeadFollowupGoal {
    readonly count: number;
    readonly goal: string;
}
/** Tools visible to the top-level captain during the confirmed execution turn. */
export declare const LEAD_FOLLOWUP_PROPOSAL_TOOLS: readonly string[];
/** Tools visible to the top-level captain during the confirmed execution turn. */
export declare const LEAD_FOLLOWUP_CAPTAIN_TOOLS: readonly ["todo_write", "agent_teams_create", "agent_teams_add_member", "agent_teams_remove_member", "agent_teams_create_task", "agent_teams_reassign_task", "agent_teams_claim_task", "agent_teams_update_task", "agent_teams_send_message", "agent_teams_status", "agent_teams_delete"];
/** Keep provider tool selection on the captain's orchestration responsibility. */
export declare function isLeadFollowupCaptainTool(name: string): boolean;
/** Recognize the business request that needs the interception + support handoff. */
export declare function detectLeadFollowupGoal(text: string): LeadFollowupGoal | undefined;
/** First-turn proposal for Douyin lead capture and WeChat follow-up. */
export declare function buildLeadFollowupProposalDirective(goal: LeadFollowupGoal): string;
/** Recognize the explicit approval that advances a pending lead proposal. */
export declare function isLeadFollowupConfirmation(text: string): boolean;
/** Confirmed captain handoff for Douyin lead capture and WeChat follow-up. */
export declare function buildLeadFollowupExecutionDirective(goal: LeadFollowupGoal): string;
/**
 * The deterministic activation text. The system-prompt usage section owns
 * the full protocol; this message only switches it on for one concrete goal.
 * @param goal - the user-supplied goal, or `''` for a bare invocation.
 */
export declare function buildActivationDirective(goal: string): string;
/**
 * The goal of the latest start-anchored `/agent-teams` gesture in genuine
 * user messages, or `undefined` when no message carries one. `''` means a
 * bare `/agent-teams` token with no goal.
 * @param messages - the step's claimed batch (user messages only scanned).
 */
export declare function invokedAgentTeamsGoal(messages: readonly UserMessage[]): string | undefined;
/**
 * Register the closed-namespace `/agent-teams` host command. The handler
 * runs against the receiving agent without sending the slash line to the
 * model: it queues the activation message as an ordinary follow-up turn and
 * wakes the driver. The registration rides the calling context's fiber, so
 * a disposed scope (HMR, plugin removal) unregisters the command.
 * @param ctx - host context providing the `commands` registry.
 */
export declare function registerAgentTeamsCommand(ctx: Context): void;
/**
 * Install the `agent/pre-step` gesture boundary: a claimed user message
 * starting with `/agent-teams` gains the deterministic activation message
 * appended after every other injection, closest to the model's answer.
 * @param ctx - host context providing the `agent/pre-step` waterfall.
 */
export declare function installAgentTeamsGestureBoundary(ctx: Context): void;
