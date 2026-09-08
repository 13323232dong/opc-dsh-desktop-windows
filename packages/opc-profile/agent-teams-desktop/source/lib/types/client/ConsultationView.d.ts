import type { ActivityMember, ActivityTeam } from './activity-monitor.ts';
/** Private manager consultation history for one selected department Agent. */
export declare function ConsultationView({ team, member }: {
    readonly team: ActivityTeam;
    readonly member: ActivityMember;
}): import("react").JSX.Element;
