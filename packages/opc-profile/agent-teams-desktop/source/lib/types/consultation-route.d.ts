import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TeamConsultation } from './types.ts';
export declare const CONSULTATION_PATH = "/plugins/dsh-agent-teams/consultations";
export interface ConsultationRouteDependencies {
    readonly stateDir: string;
    readonly workspaceRegistry: {
        list(): readonly {
            readonly title: string;
            readonly path: string;
        }[];
    };
    readonly launch: (workspacePath: string, consultation: TeamConsultation) => void;
    readonly requestPause: (workspacePath: string, consultation: TeamConsultation) => void;
}
/** Read and create private consultations; team membership is the authority. */
export declare function handleConsultationRequest(req: IncomingMessage, res: ServerResponse, deps: ConsultationRouteDependencies): Promise<void>;
