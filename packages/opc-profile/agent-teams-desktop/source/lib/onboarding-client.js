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
    const stage = onboardingStage(interview.nextQuestion.key);
    const choices = stageChoices(interview.nextQuestion.key);
    const choiceText = choices.length === 0 ? '' : `\n可直接回复选项编号或自己的话：${choices.map((choice, index) => `${index + 1}. ${choice}`).join('  ')}`;
    const brainAction = stage === 'second_brain'
        ? '\n当用户同意建立第二大脑时，先说明会在本机 Documents/Evan第二大脑 中幂等创建，不上传对话；然后调用 second_brain_create。创建失败时如实提示并继续访谈，不要伪造已创建。'
        : '';
    return `当前是“访谈”工作区的首次引导，请把它当作一段轻量的新手对话，而不是问卷。当前阶段：${stageLabel(stage)}。先用一两句话介绍这一阶段能带来的帮助，再只问下面这一个问题：${interview.nextQuestion.prompt}${choiceText}\n用户可以回复“跳过”或“稍后继续”，必须尊重并调用 opc_onboarding_skip_question；不要展示完整题库，也不要一次问多个问题。若用户刚刚的回答能回答当前问题，先调用 opc_onboarding_record_answer，field 必须是 ${interview.nextQuestion.key}，value 必须保留用户原意；根据工具返回的 nextQuestion 自然衔接下一阶段。回答后用一句话说明这些资料会怎样帮助他，再继续。${brainAction}\n若用户输入与当前问题无关，先简短接住当下内容，再回到这一个问题；不要猜测、补写或把推断写入档案。`;
}
function onboardingStage(field) {
    if (field === 'owner_name' || field === 'business_type')
        return 'welcome';
    if (field === 'city' || field === 'products')
        return 'about_user';
    if (field === 'customer_goal')
        return 'second_brain';
    return 'company_profile';
}
function stageLabel(stage) {
    return ({ welcome: '1/4 认识 Evan', about_user: '2/4 认识你和你的生意', second_brain: '3/4 建立你的第二大脑', company_profile: '4/4 完善公司资料' })[stage];
}
function stageChoices(field) {
    return ({
        owner_name: ['告诉我你希望我怎么称呼你', '先跳过'],
        business_type: ['餐饮/零售', '服务/专业门店', '电商/内容', '其他'],
        city: ['本地到店', '同城配送', '全国服务', '先跳过'],
        products: ['主打商品或服务', '最常被顾客咨询的内容', '先跳过'],
        customer_goal: ['获客和宣传', '内容和短视频', '客户回复和复购', '先看看系统能做什么'],
        platforms: ['抖音', '小红书', '微信/社群', '暂时不确定'],
    })[field] ?? [];
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
