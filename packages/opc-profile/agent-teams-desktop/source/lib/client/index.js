import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { ActivityPanel } from "./ActivityPanel.js";
import { AgentTeamsCard } from "./AgentTeamsCard.js";
import { openMemberSubagent } from "./member-navigation.js";
import { createToolLibraryClient } from "./tool-library-client.js";
import { SessionArtifactDownloads } from "./session-artifact-downloads.js";
/**
 * DSH 0.1.2-rc.1 exposes slots and session navigation but not the newer
 * conversation-events card registry. The activity panel remains the primary
 * desktop surface, so this host does not access that unavailable service.
 */
export const inject = ['slots', 'sessions'];
/**
 * Mount the floater through a body portal (the web shell has no top-right
 * slot) and register the in-conversation team card, whose "activity panel"
 * button re-activates the floater via a window event — the recovery path
 * for a closed floater or a re-opened session.
 */
export function apply(ctx) {
    const host = document.createElement('div');
    host.dataset.agentTeamsHost = '';
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(_jsxs(Fragment, { children: [_jsx(ActivityPanel, { sessionsList: ctx.sessions.list, openMemberSession: (captainSessionId, memberSessionId) => openMemberSubagent(ctx.sessions, captainSessionId, memberSessionId), createToolClient: createToolLibraryClient }), _jsx(SessionArtifactDownloads, { sessionsList: ctx.sessions.list })] }));
    ctx.effect(() => () => {
        root.unmount();
        host.remove();
    }, 'agent-teams: activity panel');
    ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
        name: 'conversation.chat.node',
        key: 'agent-teams',
        inject: () => ({
            openMemberSession: (captainSessionId, memberSessionId) => openMemberSubagent(ctx.sessions, captainSessionId, memberSessionId),
        }),
    }, AgentTeamsCard));
}
