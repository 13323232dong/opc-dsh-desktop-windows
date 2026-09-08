import type { IncomingMessage, ServerResponse } from 'node:http';
export declare const TEAM_CHAT_PATH = "/plugins/dsh-agent-teams/chat";
export interface TeamChatRouteDependencies {
    readonly stateDir: string;
    readonly workspaceRegistry: {
        list(): readonly {
            readonly title: string;
            readonly path: string;
        }[];
    };
}
/** Serve authenticated, read-only team chat pages from one registered workspace. */
export declare function handleTeamChatRequest(req: IncomingMessage, res: ServerResponse, dependencies: TeamChatRouteDependencies): Promise<void>;
