import type { ActivityTeam } from './activity-monitor.ts';
export declare function TeamChatView({ team, historic }: {
    readonly team: ActivityTeam;
    readonly historic?: boolean;
}): import("react").JSX.Element;
export declare function TeamArtifactsView({ team }: {
    readonly team: ActivityTeam;
}): import("react").JSX.Element;
