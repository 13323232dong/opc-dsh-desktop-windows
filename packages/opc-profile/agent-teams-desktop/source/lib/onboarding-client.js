import { createHmac, randomUUID } from 'node:crypto';
const ONBOARDING_PATH = '/api/v1/onboarding/interview';
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
export async function fetchOnboardingInterview(config, fetcher = fetch) {
    return requestInterview(config, ONBOARDING_PATH, 'GET', undefined, fetcher);
}
export async function startOnboardingInterview(config, fetcher = fetch) {
    return requestInterview(config, `${ONBOARDING_PATH}/start`, 'POST', {}, fetcher);
}
export async function submitOnboardingAnswer(config, input, fetcher = fetch) {
    return requestInterview(config, `${ONBOARDING_PATH}/answers`, 'POST', input, fetcher);
}
export async function skipOnboardingQuestion(config, input, fetcher = fetch) {
    return requestInterview(config, `${ONBOARDING_PATH}/skip`, 'POST', input, fetcher);
}
export async function finishOnboardingInterview(config, fetcher = fetch) {
    return requestInterview(config, `${ONBOARDING_PATH}/finish`, 'POST', {}, fetcher);
}
export async function completeOnboardingInterview(config, fetcher = fetch) {
    return requestInterview(config, `${ONBOARDING_PATH}/complete`, 'POST', {}, fetcher);
}
export function buildOnboardingDirective(interview) {
    if (interview?.status !== 'active' || interview.nextQuestion === null)
        return undefined;
    return `当前商户正在进行首次“访谈引导”。使用 opc-merchant-onboarding-interview Skill 的对话方法；不要展示题库。当前唯一问题是：${interview.nextQuestion.prompt}\n如果用户刚刚的回答能回答这一题，先调用 opc_onboarding_record_answer，field 必须是 ${interview.nextQuestion.key}，value 必须保留用户的原意；然后根据工具返回的 nextQuestion 自然问下一题。若用户明确表示跳过，调用 opc_onboarding_skip_question。若用户输入与该题无关，先简短回应其当下需要，再自然回到这一个问题；不要猜测或写入答案。`;
}
async function requestInterview(config, path, method, body, fetcher) {
    const baseUrl = config.harnessBaseUrl?.trim().replace(/\/$/u, '') ?? '';
    const secret = config.identityHmacSecret ?? '';
    if (baseUrl === '' || secret.length < 32 || ![config.tenantId, config.userId].every(value => SAFE_ID.test(value)))
        return undefined;
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const canonical = `${timestamp}.${nonce}.${method}.${path}.${config.tenantId}.${config.userId}`;
    try {
        const response = await fetcher(`${baseUrl}${path}`, {
            method,
            headers: {
                Accept: 'application/json',
                ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
                'x-tenant-id': config.tenantId,
                'x-user-id': config.userId,
                'x-auth-timestamp': timestamp,
                'x-auth-nonce': nonce,
                'x-auth-signature': createHmac('sha256', secret).update(canonical).digest('hex'),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        if (!response.ok)
            return undefined;
        const payload = await response.json().catch(() => undefined);
        return parseInterview(payload?.success === true ? payload.data : payload);
    }
    catch {
        return undefined;
    }
}
function parseInterview(value) {
    if (typeof value !== 'object' || value === null)
        return undefined;
    const status = Reflect.get(value, 'status');
    const conversationId = Reflect.get(value, 'conversationId');
    const currentField = Reflect.get(value, 'currentField');
    const nextQuestion = Reflect.get(value, 'nextQuestion');
    if (!['active', 'completed', 'skipped'].includes(String(status)) || typeof conversationId !== 'string' || !SAFE_ID.test(conversationId))
        return undefined;
    if (currentField !== null && (typeof currentField !== 'string' || currentField.length > 80))
        return undefined;
    if (nextQuestion === null)
        return { status: status, conversationId, currentField, nextQuestion: null };
    if (typeof nextQuestion !== 'object' || nextQuestion === null)
        return undefined;
    const key = Reflect.get(nextQuestion, 'key');
    const label = Reflect.get(nextQuestion, 'label');
    const prompt = Reflect.get(nextQuestion, 'prompt');
    if (![key, label, prompt].every(item => typeof item === 'string') || String(key).length > 80 || String(label).length > 120 || String(prompt).length > 1_000)
        return undefined;
    return { status: status, conversationId, currentField, nextQuestion: { key: String(key), label: String(label), prompt: String(prompt) } };
}
