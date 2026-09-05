export interface OnboardingIdentity {
    readonly tenantId: string;
    readonly userId: string;
    readonly agentId: string;
    readonly sessionId: string;
}
export interface OnboardingQuestion {
    readonly key: string;
    readonly label: string;
    readonly prompt: string;
}
export interface OnboardingInterview {
    readonly status: 'active' | 'completed' | 'skipped';
    readonly conversationId: string;
    readonly currentField: string | null;
    readonly nextQuestion: OnboardingQuestion | null;
}
export interface OnboardingClientConfig extends OnboardingIdentity {
    readonly harnessBaseUrl?: string;
    readonly identityHmacSecret?: string;
}
export declare function fetchOnboardingInterview(config: OnboardingClientConfig, fetcher?: typeof fetch): Promise<OnboardingInterview | undefined>;
export declare function startOnboardingInterview(config: OnboardingClientConfig, fetcher?: typeof fetch): Promise<OnboardingInterview | undefined>;
export declare function submitOnboardingAnswer(config: OnboardingClientConfig, input: {
    readonly field: string;
    readonly value: string;
}, fetcher?: typeof fetch): Promise<OnboardingInterview | undefined>;
export declare function skipOnboardingQuestion(config: OnboardingClientConfig, input: {
    readonly field: string;
}, fetcher?: typeof fetch): Promise<OnboardingInterview | undefined>;
export declare function finishOnboardingInterview(config: OnboardingClientConfig, fetcher?: typeof fetch): Promise<OnboardingInterview | undefined>;
export declare function completeOnboardingInterview(config: OnboardingClientConfig, fetcher?: typeof fetch): Promise<OnboardingInterview | undefined>;
export declare function buildOnboardingDirective(interview: OnboardingInterview | undefined): string | undefined;
