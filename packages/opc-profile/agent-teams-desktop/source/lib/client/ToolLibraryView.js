import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, ChevronRight, CircleDollarSign, Download, ExternalLink, Eye, EyeOff, HeartPulse, Pencil, Play, RefreshCw, Settings, Trash2, X, } from 'lucide-react';
import { defaultToolForGroup, formInput, groupTools, schemaFields, } from "./tool-library.js";
import { createToolGroupExpansionState, reconcileToolGroupExpansionState, toggleToolGroupExpansion, } from "./tool-group-expansion.js";
import { ToolIcon } from "./tool-icons.js";
import css from './ToolLibraryView.module.css';
const HEALTH_LABEL = { healthy: '健康', degraded: '降级', unavailable: '不可用', unknown: '未知' };
const EFFECT_LABEL = { read: '免费读取', write: '写入', paid: '付费', destructive: '破坏性' };
const EXPERIENCE_LABEL = {
    correction: '纠正', insight: '洞察', knowledge_gap: '知识缺口', best_practice: '最佳实践',
    integration_error: '接入错误', feature_request: '功能建议',
};
function defaultFieldValues(fields) {
    return Object.fromEntries(fields.flatMap(field => field.defaultValue === undefined ? [] : [[field.name, field.defaultValue]]));
}
function option(label, value) {
    return _jsx("option", { value: value, children: label });
}
const PROVIDER_STATUS_LABEL = {
    not_configured: '未配置', configured: '待连接', connection_required: '待连接', connected: '已连接', invalid: '配置失效', unavailable: '暂不可用',
};
function configurationErrorMessage(cause, fallback) {
    return cause instanceof Error && cause.message.length > 0 && cause.message.length <= 160 ? cause.message : fallback;
}
function ProviderConfigurationModal({ metadata, client, onClose }) {
    const [configuration, setConfiguration] = useState(null);
    const [feishuConnection, setFeishuConnection] = useState(null);
    const [values, setValues] = useState({});
    const [visibleSecrets, setVisibleSecrets] = useState({});
    const [folderUrl, setFolderUrl] = useState('');
    const [message, setMessage] = useState(null);
    const [busy, setBusy] = useState(false);
    const load = () => {
        setMessage(null);
        void client.getProviderConfiguration(metadata.providerId).then(setConfiguration).catch(() => setMessage('配置状态暂时无法读取，请稍后重试。'));
        if (metadata.providerId === 'feishu' && client.getFeishuConnection) {
            void client.getFeishuConnection().then(setFeishuConnection).catch(() => setMessage('飞书授权状态暂时无法读取，请稍后重试。'));
        }
        else
            setFeishuConnection(null);
    };
    useEffect(load, [client, metadata.providerId]);
    const save = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const pending = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim().length > 0));
            const missing = metadata.fields.find(field => field.required && !configuration?.fields[field.key]?.configured && pending[field.key] === undefined);
            if (missing !== undefined)
                throw new Error(`请填写${missing.label}`);
            const saved = await client.saveProviderConfiguration(metadata.providerId, pending);
            setConfiguration(saved);
            setValues({});
            setVisibleSecrets({});
            const tested = await client.testProviderConfiguration(metadata.providerId);
            setConfiguration(tested);
            if (metadata.providerId === 'feishu' && client.getFeishuConnection)
                setFeishuConnection(await client.getFeishuConnection());
            setMessage(tested.status === 'invalid'
                ? '配置已保存，但连接测试未通过，请检查凭证。'
                : tested.status === 'unavailable'
                    ? '配置已保存，但连接测试暂不可用，请稍后重试。'
                    : '配置已保存并完成连接测试。');
        }
        catch (cause) {
            setMessage(configurationErrorMessage(cause, '配置保存失败，请检查填写内容。'));
        }
        finally {
            setBusy(false);
        }
    };
    const test = async () => {
        setBusy(true);
        setMessage(null);
        try {
            setConfiguration(await client.testProviderConfiguration(metadata.providerId));
            setMessage('连接测试已完成。');
        }
        catch {
            setMessage('连接测试未通过，请检查配置。');
        }
        finally {
            setBusy(false);
        }
    };
    const connect = async () => {
        // Opening synchronously keeps the OAuth window tied to the user's click gesture.
        const opened = window.open('about:blank', 'opc-provider-oauth', 'popup,width=560,height=720');
        if (opened === null) {
            setMessage('浏览器阻止了授权窗口，请允许弹窗后重试。');
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            const { authorizationUrl } = await client.startProviderOAuth(metadata.providerId);
            opened.location.replace(authorizationUrl);
            setMessage('请在新窗口完成授权，然后刷新配置状态。');
        }
        catch (cause) {
            opened.close();
            setMessage(configurationErrorMessage(cause, '无法发起授权，请先保存并测试配置。'));
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (!window.confirm('删除后该工具将无法使用当前商户配置。是否继续？'))
            return;
        setBusy(true);
        setMessage(null);
        try {
            await client.deleteProviderConfiguration(metadata.providerId);
            setConfiguration(null);
            setValues({});
            setVisibleSecrets({});
            setMessage('配置已删除。');
        }
        catch {
            setMessage('删除配置失败，请稍后重试。');
        }
        finally {
            setBusy(false);
        }
    };
    const saveFolder = async () => {
        if (!client.setFeishuDestination || !folderUrl.trim())
            return;
        setBusy(true);
        setMessage(null);
        try {
            await client.setFeishuDestination(folderUrl.trim());
            setFolderUrl('');
            setMessage('默认飞书文件夹已设置。');
        }
        catch {
            setMessage('默认飞书文件夹链接无效或暂不可访问。');
        }
        finally {
            setBusy(false);
        }
    };
    const configuredStatus = configuration?.status ?? metadata.status ?? 'not_configured';
    const status = metadata.providerId === 'feishu' && configuredStatus === 'connected' && feishuConnection?.status === 'reauthorization_required'
        ? 'connection_required'
        : configuredStatus;
    const needsOAuth = metadata.authType === 'oauth_app' || metadata.authType === 'account_connection' || metadata.authType === 'composite';
    return _jsx("div", { className: css.modalBackdrop, role: "presentation", onClick: onClose, children: _jsxs("section", { className: css.providerModal, role: "dialog", "aria-modal": "true", "aria-label": `配置 ${metadata.providerId}`, onClick: event => event.stopPropagation(), children: [_jsxs("header", { className: css.modalHeader, children: [_jsx("strong", { children: "\u914D\u7F6E\u5DE5\u5177" }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u5173\u95ED\u5DE5\u5177\u914D\u7F6E", onClick: onClose, children: _jsx(X, { size: 15 }) })] }), _jsxs("div", { className: css.providerStatus, "data-status": status, children: [_jsxs("strong", { className: css.providerStatusLabel, children: [_jsx("span", { className: css.providerStatusDot, "aria-hidden": "true" }), PROVIDER_STATUS_LABEL[status]] }), _jsx("span", { children: metadata.providerId === 'feishu' && feishuConnection?.status === 'reauthorization_required' ? '当前授权缺少飞书文档权限，请在飞书开放平台添加文档权限后重新授权。' : configuration?.accountName ?? '配置只归当前商户所有，密钥不会展示给 AI 或浏览器历史。' })] }), _jsx("div", { className: css.formGrid, children: metadata.fields.map(field => {
                        const fieldState = configuration?.fields[field.key];
                        const visible = visibleSecrets[field.key] === true;
                        return _jsxs("label", { className: css.field, children: [_jsxs("span", { children: [field.label, field.required ? ' *' : ''] }), _jsxs("div", { className: css.secretField, children: [_jsx("input", { "aria-label": field.label, type: field.type === 'secret' ? (visible ? 'text' : 'password') : 'text', value: values[field.key] ?? '', placeholder: fieldState?.configured ? `${fieldState.mask ?? '已配置'}（留空则不变）` : field.placeholder, onChange: event => setValues({ ...values, [field.key]: event.target.value }), autoComplete: "off" }), field.type === 'secret' && _jsx("button", { type: "button", className: css.iconButton, "aria-label": visible ? `隐藏${field.label}` : `显示${field.label}`, onClick: () => setVisibleSecrets({ ...visibleSecrets, [field.key]: !visible }), children: visible ? _jsx(EyeOff, { size: 14 }) : _jsx(Eye, { size: 14 }) })] }), field.description && _jsx("small", { children: field.description })] }, field.key);
                    }) }), metadata.providerId === 'feishu' && status === 'connected' && _jsxs("div", { className: css.providerDestination, children: [_jsx("input", { "aria-label": "\u9ED8\u8BA4\u98DE\u4E66\u6587\u4EF6\u5939\u94FE\u63A5", value: folderUrl, placeholder: "\u7C98\u8D34\u98DE\u4E66\u6587\u4EF6\u5939\u94FE\u63A5", onChange: event => setFolderUrl(event.target.value) }), _jsx("button", { type: "button", className: css.textButton, onClick: () => { void saveFolder(); }, disabled: busy || !folderUrl.trim(), children: "\u8BBE\u4E3A\u9ED8\u8BA4" })] }), feishuConnection?.scopes && _jsx("div", { className: css.tags, children: feishuConnection.scopes.map(scope => _jsx("span", { children: scope }, scope)) }), _jsxs("div", { className: css.providerActions, children: [_jsx("button", { type: "button", className: css.primaryButton, onClick: () => { void save(); }, disabled: busy, children: "\u4FDD\u5B58\u914D\u7F6E" }), metadata.canTest && _jsx("button", { type: "button", className: css.textButton, onClick: () => { void test(); }, disabled: busy, children: "\u6D4B\u8BD5\u8FDE\u63A5" }), needsOAuth && _jsx("button", { type: "button", className: css.textButton, onClick: () => { void connect(); }, disabled: busy || status === 'not_configured' || status === 'invalid', children: status === 'connected' ? '重新授权' : '连接账号' }), _jsx("button", { type: "button", className: css.textButton, onClick: load, disabled: busy, children: "\u5237\u65B0\u72B6\u6001" }), configuration !== null && status !== 'not_configured' && _jsx("button", { type: "button", className: css.dangerButton, onClick: () => { void remove(); }, disabled: busy, children: "\u5220\u9664\u914D\u7F6E" })] }), metadata.docsUrl && _jsxs("a", { className: css.docsLink, href: metadata.docsUrl, target: "_blank", rel: "noreferrer", children: ["\u67E5\u770B\u4F9B\u5E94\u5546\u914D\u7F6E\u6587\u6863 ", _jsx(ExternalLink, { size: 12 })] }), message && _jsx("div", { className: css.inlineStatus, role: "status", children: message })] }) });
}
function DouyinAccountButton({ client }) {
    const [account, setAccount] = useState(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const show = async () => {
        if (!client.getDouyinAccount)
            return;
        setBusy(true);
        setMessage(null);
        try {
            try {
                setAccount(await client.getDouyinAccount());
            }
            catch {
                if (!client.openEgoLite)
                    throw new Error('open_ego_lite_unavailable');
                await client.openEgoLite();
                await new Promise(resolve => window.setTimeout(resolve, 1_500));
                setAccount(await client.getDouyinAccount());
            }
            setOpen(true);
        }
        catch {
            setMessage('已尝试打开 Ego Lite，但当前账号仍无法读取。请在 Ego Lite 中完成登录后重试。');
        }
        finally {
            setBusy(false);
        }
    };
    return _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: css.accountButton, onClick: () => { void show(); }, disabled: busy, children: "\u67E5\u770B\u5F53\u524D\u8D26\u53F7" }), message && _jsx("div", { className: css.inlineError, role: "status", children: message }), open && account && _jsx("div", { className: css.modalBackdrop, role: "presentation", onClick: () => setOpen(false), children: _jsxs("section", { className: css.accountModal, role: "dialog", "aria-modal": "true", "aria-label": "\u5F53\u524D\u6296\u97F3\u8D26\u53F7", onClick: event => event.stopPropagation(), children: [_jsxs("div", { className: css.modalHeader, children: [_jsx("strong", { children: "\u5F53\u524D\u6296\u97F3\u8D26\u53F7" }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u5173\u95ED\u8D26\u53F7\u4FE1\u606F", onClick: () => setOpen(false), children: "\u00D7" })] }), _jsx("div", { className: css.accountState, "data-health": account.loggedIn ? 'healthy' : 'unavailable', children: account.loggedIn ? '已登录' : '未登录' }), _jsxs("dl", { className: css.accountFacts, children: [_jsxs("div", { children: [_jsx("dt", { children: "\u8D26\u53F7\u540D\u79F0" }), _jsx("dd", { children: account.displayName ?? '未识别' })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u8D26\u53F7\u6807\u8BC6" }), _jsx("dd", { children: account.accountId ?? '未识别' })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u6D4F\u89C8\u5668\u9875\u9762" }), _jsx("dd", { children: account.profileUrl ?? '当前任务空间' })] })] }), _jsx("p", { className: css.modalHint, children: "\u4FE1\u606F\u6765\u81EA\u5F53\u524D Ego Lite \u6D4F\u89C8\u5668\u767B\u5F55\u6001\uFF0C\u4E0D\u4FDD\u5B58\u6216\u5C55\u793A Cookie\u3001\u5BC6\u7801\u548C\u9A8C\u8BC1\u7801\u3002" })] }) })] });
}
function ToolResources({ tool, client }) {
    const [items, setItems] = useState([]);
    const [state, setState] = useState('loading');
    const [account, setAccount] = useState(null);
    const isDouyin = tool.id.startsWith('douyin.');
    useEffect(() => {
        let active = true;
        setState('loading');
        setItems([]);
        setAccount(null);
        const request = isDouyin && client.getDouyinAccount !== undefined
            ? client.getDouyinAccount().then(value => { if (active)
                setAccount(value); })
            : client.listResources(tool.id).then(value => { if (active)
                setItems(value); });
        void request.then(() => { if (active)
            setState('ready'); }).catch(() => { if (active)
            setState('error'); });
        return () => { active = false; };
    }, [client, isDouyin, tool.id]);
    if (state === 'loading')
        return _jsx("div", { className: css.empty, children: "\u6B63\u5728\u8BFB\u53D6\u53EF\u7528\u8D44\u6E90..." });
    if (state === 'error')
        return _jsx("div", { className: css.empty, children: "\u8BE5\u5DE5\u5177\u6682\u65F6\u6CA1\u6709\u53EF\u67E5\u770B\u7684\u8D44\u6E90" });
    if (account !== null)
        return _jsx("div", { className: css.resourceList, children: _jsxs("article", { className: css.resourceItem, children: [_jsxs("div", { className: css.resourceText, children: [_jsx("strong", { children: account.loggedIn ? account.displayName ?? '已绑定抖音账号' : '当前未登录抖音账号' }), _jsx("span", { children: account.loggedIn ? `账号标识：${account.accountId ?? '未识别'}` : '请先在 Ego Lite 中完成登录' })] }), _jsx("span", { className: css.resourceBadge, "data-active": account.loggedIn ? 'true' : 'false', children: account.loggedIn ? '已绑定' : '未登录' })] }) });
    if (items.length === 0)
        return _jsx("div", { className: css.empty, children: "\u8BE5\u5DE5\u5177\u5F53\u524D\u6CA1\u6709\u53EF\u4E0B\u8F7D\u7684\u6587\u4EF6\u6216\u53EF\u67E5\u770B\u7684\u8D26\u53F7" });
    return _jsx("div", { className: css.resourceList, children: items.map(item => _jsxs("article", { className: css.resourceItem, children: [_jsxs("div", { className: css.resourceText, children: [_jsx("strong", { children: item.title }), _jsxs("span", { children: [item.description ?? item.mimeType ?? '受控资源', item.sourceDurationSeconds === undefined ? '' : ` · 原始样音 ${item.sourceDurationSeconds} 秒`] })] }), item.downloadable && _jsx("a", { className: css.resourceDownload, href: client.resourceDownloadUrl(tool.id, item.id), download: true, "aria-label": `下载 ${item.title}`, title: `下载 ${item.title}`, children: _jsx(Download, { size: 14 }) })] }, item.id)) });
}
function ToolDetailModal({ tool, client, onClose }) {
    const [tab, setTab] = useState('overview');
    const [current, setCurrent] = useState(tool);
    const [refreshing, setRefreshing] = useState(false);
    const refresh = async () => {
        setRefreshing(true);
        try {
            const health = await client.getHealth(tool.id, tool.version);
            setCurrent({ ...tool, health });
        }
        finally {
            setRefreshing(false);
        }
    };
    return _jsx("div", { className: css.modalBackdrop, role: "presentation", onClick: onClose, children: _jsxs("section", { className: css.toolModal, role: "dialog", "aria-modal": "true", "aria-label": `${tool.displayName}详情`, onClick: event => event.stopPropagation(), children: [_jsxs("header", { className: css.modalHeader, children: [_jsxs("span", { className: css.modalTitle, children: [_jsx(ToolIcon, { toolId: tool.id, groupIconKey: tool.group?.iconKey, size: 16 }), _jsx("strong", { children: tool.displayName })] }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u5173\u95ED\u5DE5\u5177\u8BE6\u60C5", onClick: onClose, children: _jsx(X, { size: 15 }) })] }), _jsxs("div", { className: css.tabs, role: "tablist", "aria-label": "\u5DE5\u5177\u8BE6\u60C5\u9875\u7B7E", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": tab === 'overview', onClick: () => setTab('overview'), children: "\u6982\u89C8" }), _jsx("button", { type: "button", role: "tab", "aria-selected": tab === 'resources', onClick: () => setTab('resources'), children: "\u8D44\u6E90" })] }), tab === 'overview' ? _jsx(Overview, { tool: current, onRefresh: () => { void refresh(); }, refreshing: refreshing }) : _jsx(ToolResources, { tool: tool, client: client })] }) });
}
function ToolList({ groups, expansion, onToggle, client }) {
    const [detail, setDetail] = useState(null);
    const [configuration, setConfiguration] = useState(null);
    if (groups.length === 0)
        return _jsx("div", { className: css.empty, children: "\u6CA1\u6709\u53EF\u7528\u7684\u5DE5\u5177\u80FD\u529B" });
    return _jsxs("div", { className: css.toolList, children: [groups.map(group => {
                const defaultTool = defaultToolForGroup(group);
                if (defaultTool === undefined)
                    return null;
                const isExpanded = expansion.expandedGroupIds.includes(group.id);
                const groupConfiguration = group.tools.find(tool => tool.configuration?.required)?.configuration;
                return _jsxs("section", { className: css.toolGroup, "aria-label": group.displayName, children: [_jsxs("div", { className: css.groupHeader, children: [_jsxs("button", { type: "button", className: css.groupToggle, "aria-label": `${isExpanded ? '收起' : '展开'}能力组：${group.displayName}`, "aria-expanded": isExpanded, onClick: () => onToggle(group.id), children: [_jsx("span", { className: css.groupIcon, children: _jsx(ToolIcon, { toolId: defaultTool.id, groupIconKey: group.iconKey, size: 15 }) }), _jsxs("span", { className: css.groupIdentity, children: [_jsx("strong", { children: group.displayName }), _jsx("span", { children: group.description ?? 'AI 团队会按任务需要自行使用' })] }), _jsx(ChevronRight, { className: css.groupChevron, "data-expanded": isExpanded ? 'true' : 'false', size: 15, "aria-hidden": "true" })] }), groupConfiguration && _jsx("button", { type: "button", className: css.iconButton, "aria-label": `配置 ${group.displayName}`, title: `配置 ${group.displayName}`, onClick: () => setConfiguration(groupConfiguration), children: _jsx(Settings, { size: 14 }) })] }), isExpanded && _jsxs("div", { className: css.groupChildren, children: [group.id === 'douyin-publisher' && _jsx(DouyinAccountButton, { client: client }), group.tools.map(tool => _jsxs("button", { type: "button", className: css.toolItem, "data-nested": "true", onClick: () => setDetail(tool), "aria-label": `查看 ${tool.displayName} 详情`, children: [_jsxs("span", { className: css.toolIdentity, children: [_jsx("strong", { children: tool.displayName }), _jsx("span", { children: tool.effect === 'paid' ? '需要老板确认后使用' : '由 AI 团队自动安排' })] }), _jsx("span", { className: css.healthDot, "data-health": tool.health.status, "aria-label": `健康状态：${HEALTH_LABEL[tool.health.status]}` })] }, `${tool.id}:${tool.version}`))] })] }, group.id);
            }), detail && _jsx(ToolDetailModal, { tool: detail, client: client, onClose: () => setDetail(null) }), configuration && _jsx(ProviderConfigurationModal, { metadata: configuration, client: client, onClose: () => setConfiguration(null) })] });
}
function Overview({ tool, onRefresh, refreshing }) {
    return _jsxs("div", { className: css.tabBody, children: [_jsx("p", { className: css.description, children: tool.description }), _jsxs("dl", { className: css.factGrid, children: [_jsxs("div", { children: [_jsx("dt", { children: "\u5065\u5EB7" }), _jsxs("dd", { "data-health": tool.health.status, children: [_jsx(HeartPulse, { size: 13 }), HEALTH_LABEL[tool.health.status]] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u6267\u884C" }), _jsx("dd", { children: tool.executionMode === 'async' ? '异步任务' : '同步返回' })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u8D39\u7528" }), _jsxs("dd", { children: [_jsx(CircleDollarSign, { size: 13 }), EFFECT_LABEL[tool.effect]] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u6210\u529F\u7387" }), _jsx("dd", { children: "\u5C1A\u65E0\u6837\u672C" })] })] }), _jsxs("section", { className: css.detailSection, children: [_jsxs("div", { className: css.sectionTitle, children: [_jsx("h4", { children: "\u80FD\u529B" }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u5237\u65B0\u5065\u5EB7\u72B6\u6001", title: "\u5237\u65B0\u5065\u5EB7\u72B6\u6001", onClick: onRefresh, disabled: refreshing, children: _jsx(RefreshCw, { size: 14 }) })] }), _jsx("div", { className: css.tags, children: tool.capabilityTags.map(tag => _jsx("span", { children: tag }, tag)) })] }), _jsxs("section", { className: css.detailSection, children: [_jsx("h4", { children: "\u9650\u5236\u4E0E\u8D39\u7528" }), _jsxs("p", { children: [tool.costPolicy.currency, " ", tool.costPolicy.estimated.toFixed(2), " \u9884\u4F30\uFF0C\u4E0A\u9650 ", tool.costPolicy.maximum.toFixed(2), tool.costPolicy.unit ? ` / ${tool.costPolicy.unit}` : ''] })] }), _jsxs("section", { className: css.detailSection, children: [_jsx("h4", { children: "\u8F93\u5165 Schema" }), _jsx("pre", { children: JSON.stringify(tool.inputSchema, null, 2) })] }), _jsxs("section", { className: css.detailSection, children: [_jsx("h4", { children: "\u8F93\u51FA Schema" }), _jsx("pre", { children: JSON.stringify(tool.outputSchema, null, 2) })] })] });
}
function Trial({ tool, client, conversationId, runId }) {
    const fields = useMemo(() => schemaFields(tool.inputSchema), [tool]);
    const [values, setValues] = useState(() => defaultFieldValues(fields));
    const [preflight, setPreflight] = useState(null);
    const [proposal, setProposal] = useState(null);
    const [call, setCall] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [context, setContext] = useState(null);
    useEffect(() => { setValues(defaultFieldValues(fields)); setPreflight(null); setProposal(null); setCall(null); setMessage(null); }, [fields, tool.id, tool.version]);
    useEffect(() => {
        if (conversationId !== undefined && runId !== undefined)
            return;
        if (client.getTrialContext === undefined)
            return;
        let active = true;
        void client.getTrialContext().then(value => { if (active)
            setContext(value); }).catch(() => { if (active)
            setMessage('当前会话身份不可用，已禁止试用'); });
        return () => { active = false; };
    }, [client, conversationId, runId]);
    const effectiveContext = conversationId !== undefined && runId !== undefined
        ? { conversationId, runId }
        : context ?? undefined;
    const prepare = async () => {
        setBusy(true);
        setMessage(null);
        setProposal(null);
        setCall(null);
        try {
            const input = formInput(fields, values);
            for (const field of fields)
                if (field.required && Reflect.get(input, field.name) === undefined)
                    throw new Error(`请填写${field.label}`);
            const next = await client.preflight(tool.id, tool.version, input);
            setPreflight(next);
            if (next.requiresApproval && client.createProposal !== undefined)
                setProposal(await client.createProposal(tool.id, tool.version, input));
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : '无法获取报价');
        }
        finally {
            setBusy(false);
        }
    };
    const execute = async () => {
        if (preflight === null || effectiveContext === undefined)
            return;
        setBusy(true);
        setMessage(null);
        try {
            let approved = proposal;
            if (preflight.requiresApproval) {
                if (proposal === null || client.decideApproval === undefined)
                    return;
                approved = await client.decideApproval(proposal.approvalId, 'approved');
                setProposal(approved);
            }
            const result = await client.trial(tool.id, {
                version: tool.version, input: preflight.normalizedInput, conversationId: effectiveContext.conversationId, runId: effectiveContext.runId,
                ...(approved?.approvalId ? { approvalId: approved.approvalId } : {}),
            });
            const status = result && typeof result === 'object' && typeof Reflect.get(result, 'status') === 'string'
                ? result : { status: 'succeeded', output: result };
            setCall(status);
        }
        catch {
            setMessage('试用失败，请检查参数或稍后重试');
        }
        finally {
            setBusy(false);
        }
    };
    useEffect(() => {
        const id = call?.toolCallId ?? call?.id;
        if (!id || ['succeeded', 'failed', 'cancelled'].includes(call?.status ?? ''))
            return;
        const timer = window.setTimeout(() => { void client.getCallStatus(id).then(setCall).catch(() => setMessage('状态更新暂时中断')); }, 2_000);
        return () => window.clearTimeout(timer);
    }, [call, client]);
    const approvalReady = !preflight?.requiresApproval || (proposal?.status === 'pending' && client.decideApproval !== undefined);
    const contextReady = effectiveContext !== undefined;
    return _jsxs("div", { className: css.tabBody, children: [_jsx("div", { className: css.formGrid, children: fields.map(field => _jsxs("label", { className: field.kind === 'boolean' ? css.checkboxField : css.field, children: [_jsxs("span", { children: [field.label, field.required ? ' *' : ''] }), field.kind === 'select' ? _jsxs("select", { "aria-label": field.label, value: String(values[field.name] ?? ''), onChange: event => setValues({ ...values, [field.name]: event.target.value }), children: [option('请选择', ''), field.options.map(item => _jsx("option", { children: item }, item))] })
                            : field.kind === 'boolean' ? _jsx("input", { "aria-label": field.label, type: "checkbox", checked: Boolean(values[field.name]), onChange: event => setValues({ ...values, [field.name]: event.target.checked }) })
                                : field.kind === 'json' ? _jsx("textarea", { "aria-label": field.label, rows: 4, value: String(values[field.name] ?? ''), placeholder: "JSON", onChange: event => setValues({ ...values, [field.name]: event.target.value }) })
                                    : _jsx("input", { "aria-label": field.label, type: field.kind === 'number' ? 'number' : 'text', min: field.minimum, max: field.maximum, value: String(values[field.name] ?? ''), onChange: event => setValues({ ...values, [field.name]: event.target.value }) }), field.description && _jsx("small", { children: field.description })] }, field.name)) }), fields.length === 0 && _jsx("div", { className: css.empty, children: "\u8BE5\u5DE5\u5177\u65E0\u9700\u8F93\u5165\u53C2\u6570" }), _jsxs("button", { type: "button", className: css.primaryButton, onClick: () => { void prepare(); }, disabled: busy, children: [_jsx(CircleDollarSign, { size: 14 }), "\u83B7\u53D6\u62A5\u4EF7"] }), preflight && _jsxs("div", { className: css.approvalCard, "data-protected": preflight.requiresApproval ? 'true' : 'false', children: [_jsxs("div", { children: [_jsx("strong", { children: preflight.requiresApproval ? '执行前确认' : '参数预检通过' }), _jsxs("span", { children: ["\u9884\u8BA1 ", preflight.quote.currency, " ", preflight.quote.estimated.toFixed(2), " \u00B7 \u4E0A\u9650 ", preflight.quote.maximum.toFixed(2)] })] }), preflight.requiresApproval && _jsx("p", { children: "\u9700\u8981\u7528\u6237\u9010\u6B21\u786E\u8BA4" }), !contextReady && _jsx("p", { children: "\u5F53\u524D\u4EFB\u52A1\u7F3A\u5C11\u53EF\u9A8C\u8BC1\u7684\u6267\u884C\u8EAB\u4EFD\uFF0C\u5DF2\u7981\u6B62\u8BD5\u7528\u3002" }), _jsxs("button", { type: "button", className: css.primaryButton, disabled: busy || !approvalReady || !contextReady, onClick: () => { void execute(); }, "aria-label": !approvalReady ? '等待系统审批' : '确认并执行', children: [_jsx(Play, { size: 14 }), !approvalReady ? '等待系统审批' : '确认并执行'] })] }), call && _jsxs("div", { className: css.callState, role: "status", children: [_jsx(CheckCircle2, { size: 15 }), _jsxs("div", { children: [_jsxs("strong", { children: ["\u8C03\u7528\u72B6\u6001\uFF1A", call.status] }), call.errorCode && _jsx("span", { children: call.errorCode })] })] }), message && _jsx("div", { className: css.inlineError, role: "alert", children: message })] });
}
function Experiences({ tool, client }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState('');
    const [message, setMessage] = useState(null);
    const load = () => { setLoading(true); void client.listExperiences(tool.id).then(value => setItems(value.filter(item => item.toolId === undefined || item.toolId === tool.id))).catch(() => setMessage('经验暂时无法加载')).finally(() => setLoading(false)); };
    useEffect(load, [client, tool.id]);
    const mutate = async (id, action) => { setMessage(null); try {
        await action();
        load();
    }
    catch {
        setMessage('经验操作失败');
    } };
    if (loading)
        return _jsx("div", { className: css.empty, children: "\u6B63\u5728\u52A0\u8F7D\u7ECF\u9A8C..." });
    return _jsxs("div", { className: css.tabBody, children: [items.length === 0 && _jsx("div", { className: css.empty, children: "\u8BE5\u5DE5\u5177\u8FD8\u6CA1\u6709\u53EF\u7528\u7ECF\u9A8C" }), _jsx("div", { className: css.experienceList, children: items.map(item => _jsxs("article", { className: css.experienceItem, children: [_jsxs("div", { className: css.experienceMeta, children: [_jsx("span", { children: EXPERIENCE_LABEL[item.type] }), _jsx("span", { children: item.scope === 'agent' ? '当前 Agent' : item.scope === 'user' ? '当前用户' : '企业知识' }), _jsxs("span", { children: ["\u5F15\u7528 ", item.usageCount ?? item.occurrenceCount ?? 0] })] }), editing === item.id ? _jsxs(_Fragment, { children: [_jsx("textarea", { "aria-label": "\u7ECF\u9A8C\u5185\u5BB9", value: draft, onChange: event => setDraft(event.target.value) }), _jsx("button", { className: css.textButton, type: "button", "aria-label": "\u4FDD\u5B58\u7ECF\u9A8C", onClick: () => { void mutate(item.id, () => client.updateExperience(item.id, { content: draft })).then(() => setEditing(null)); }, children: "\u4FDD\u5B58" })] }) : _jsx("p", { children: item.content }), item.scope !== 'enterprise' && _jsxs("div", { className: css.experienceActions, children: [_jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u7F16\u8F91\u7ECF\u9A8C", title: "\u7F16\u8F91\u7ECF\u9A8C", onClick: () => { setEditing(item.id); setDraft(item.content); }, children: _jsx(Pencil, { size: 14 }) }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u505C\u7528\u7ECF\u9A8C", title: "\u505C\u7528\u7ECF\u9A8C", onClick: () => { void mutate(item.id, () => client.disableExperience(item.id)); }, children: _jsx(Ban, { size: 14 }) }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u5220\u9664\u7ECF\u9A8C", title: "\u5220\u9664\u7ECF\u9A8C", onClick: () => { void mutate(item.id, () => client.deleteExperience(item.id)); }, children: _jsx(Trash2, { size: 14 }) })] })] }, item.id)) }), message && _jsx("div", { className: css.inlineError, role: "alert", children: message })] });
}
export function ToolLibraryView({ sessionId, client, conversationId, runId }) {
    const [tools, setTools] = useState([]);
    const [expansion, setExpansion] = useState(() => createToolGroupExpansionState(sessionId, []));
    const [state, setState] = useState('loading');
    useEffect(() => {
        const controller = new AbortController();
        setState('loading');
        setTools([]);
        setExpansion(createToolGroupExpansionState(sessionId, []));
        void client.listTools(controller.signal).then(next => {
            if (controller.signal.aborted)
                return;
            const nextGroups = groupTools(next);
            setTools(next);
            setExpansion(createToolGroupExpansionState(sessionId, nextGroups.map(group => group.id)));
            setState('ready');
        }).catch(() => { if (!controller.signal.aborted)
            setState('error'); });
        return () => controller.abort();
    }, [client, sessionId]);
    const groups = useMemo(() => groupTools(tools), [tools]);
    useEffect(() => {
        setExpansion(current => reconcileToolGroupExpansionState(current, sessionId, groups.map(group => group.id)));
    }, [groups, sessionId]);
    if (state === 'loading')
        return _jsx("div", { className: css.loadState, children: "\u6B63\u5728\u52A0\u8F7D\u5DE5\u5177\u5E93..." });
    if (state === 'error')
        return _jsxs("div", { className: css.loadState, role: "alert", children: [_jsx("strong", { children: "\u5DE5\u5177\u5E93\u6682\u65F6\u65E0\u6CD5\u52A0\u8F7D" }), _jsx("span", { children: "\u670D\u52A1\u7AEF\u8EAB\u4EFD\u672A\u914D\u7F6E\u6216\u7F51\u5173\u4E0D\u53EF\u7528\u3002" })] });
    return _jsxs("div", { className: css.root, "aria-label": "Agent \u5DE5\u5177\u5E93", children: [_jsxs("header", { className: css.libraryIntro, children: [_jsx("strong", { children: "\u80FD\u529B\u6E05\u5355" }), _jsx("span", { children: "AI \u56E2\u961F\u4F1A\u6839\u636E\u60A8\u7684\u4EFB\u52A1\u81EA\u52A8\u9009\u62E9\u5408\u9002\u80FD\u529B\uFF0C\u65E0\u9700\u60A8\u624B\u52A8\u64CD\u4F5C\u3002" })] }), _jsx(ToolList, { groups: groups, expansion: expansion, onToggle: groupId => setExpansion(current => toggleToolGroupExpansion(current, groupId)), client: client })] });
}
