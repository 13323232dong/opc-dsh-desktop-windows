import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const FILE = 'consultations.json';
const MAX_QUESTION = 4_000;
function file(root, teamId) { return join(root, teamId, FILE); }
export function validConsultationQuestion(value) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= MAX_QUESTION;
}
export async function readConsultations(root, teamId) {
    try {
        const parsed = JSON.parse(await readFile(file(root, teamId), 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return [];
        throw error;
    }
}
export async function writeConsultations(root, teamId, values) {
    await writeFile(file(root, teamId), JSON.stringify(values), 'utf8');
}
export function createConsultation(input) {
    const now = Date.now();
    return {
        consultationId: randomUUID(), teamId: input.teamId, memberId: input.memberId,
        memberName: input.memberName, question: input.question.trim(),
        ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
        ...(input.kind === undefined ? {} : { kind: input.kind }),
        status: 'queued', createdAt: now, updatedAt: now,
    };
}
export function replaceConsultation(consultations, consultationId, update) {
    return consultations.map(item => item.consultationId === consultationId
        ? { ...item, ...update, updatedAt: Date.now() }
        : item);
}
