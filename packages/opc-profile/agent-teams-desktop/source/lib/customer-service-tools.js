/** Prefer the native Mac adapter; preserve the existing mobile route elsewhere. */
export function customerServiceTools(platform = process.platform) {
    return platform === 'darwin'
        ? ['status', 'find_contact', 'read_chat', 'send', 'watch', 'pause', 'tasks'].map(name => `wechat_customer_service_${name}`)
        : ['wechat_contact_status', 'wechat_message_draft', 'wechat_message_send'];
}
