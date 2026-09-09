/** Browser plugin for the AgentTeams activity floater and conversation card. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * The activity panel only needs slots and session navigation. Newer DSH web
 * clients additionally expose `conversationEvents`, which lets us render the
 * in-conversation team card. Older desktop runtimes do not provide that
 * service, so treating it as optional keeps the full Teams workbench usable.
 */
export declare const inject: string[];
/**
 * Mount the floater through a body portal (the web shell has no top-right
 * slot) and register the in-conversation team card, whose "activity panel"
 * button re-activates the floater via a window event — the recovery path
 * for a closed floater or a re-opened session.
 */
export declare function apply(ctx: ClientContext): void;
