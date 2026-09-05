import type { TeamConsultation } from './types.ts';
export declare function validConsultationQuestion(value: unknown): value is string;
export declare function readConsultations(root: string, teamId: string): Promise<readonly TeamConsultation[]>;
export declare function writeConsultations(root: string, teamId: string, values: readonly TeamConsultation[]): Promise<void>;
export declare function createConsultation(input: {
    teamId: string;
    memberId: string;
    memberName: string;
    question: string;
    taskId?: string;
    kind?: TeamConsultation['kind'];
}): TeamConsultation;
export declare function replaceConsultation(consultations: readonly TeamConsultation[], consultationId: string, update: Partial<Omit<TeamConsultation, 'consultationId' | 'teamId' | 'memberId' | 'memberName' | 'question' | 'createdAt'>>): readonly TeamConsultation[];
