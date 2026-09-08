const DEFAULT_GROUP_ACTIONS = {
    'seedance-video': 'seedance.create',
    'minimax-h3-video': 'h3.create',
    'ai-design-image': 'design.create',
    'voice-clone': 'voice-clone.create',
    'publish-precheck': 'publish-precheck.scan',
    'mobile-control': 'mobile_device_status',
};
/** Opens the family at its primary creation action instead of an incidental query action. */
export function defaultToolForGroup(group) {
    const preferredId = DEFAULT_GROUP_ACTIONS[group.id];
    return group.tools.find(tool => tool.id === preferredId)
        ?? group.tools.find(tool => tool.effect === 'paid' && tool.capabilityTags.includes('generation'))
        ?? group.tools[0];
}
export function hasActiveToolFilters(filters) {
    return filters.query.trim().length > 0
        || filters.provider.length > 0
        || filters.category.length > 0
        || filters.health.length > 0
        || filters.effect.length > 0
        || filters.capability.length > 0;
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function schema(value) {
    return record(value) && (value.type === undefined || typeof value.type === 'string' || Array.isArray(value.type));
}
function health(value) {
    return record(value) && ['healthy', 'degraded', 'unavailable', 'unknown'].includes(String(value.status));
}
function toolGroup(value) {
    return record(value)
        && typeof value.id === 'string' && value.id.trim().length > 0
        && typeof value.displayName === 'string' && value.displayName.trim().length > 0
        && (value.description === undefined || typeof value.description === 'string')
        && (value.order === undefined || (typeof value.order === 'number' && Number.isFinite(value.order)))
        && (value.iconKey === undefined || typeof value.iconKey === 'string');
}
function toolConfiguration(value) {
    if (!record(value)
        || typeof value.providerId !== 'string' || value.providerId.trim().length === 0
        || !['api_key', 'oauth_app', 'account_connection', 'composite'].includes(String(value.authType))
        || typeof value.required !== 'boolean' || !Array.isArray(value.fields))
        return false;
    return value.fields.every(field => record(field)
        && typeof field.key === 'string' && field.key.trim().length > 0
        && typeof field.label === 'string' && field.label.trim().length > 0
        && ['text', 'secret'].includes(String(field.type))
        && typeof field.required === 'boolean'
        && (field.description === undefined || typeof field.description === 'string')
        && (field.placeholder === undefined || typeof field.placeholder === 'string'))
        && (value.docsUrl === undefined || typeof value.docsUrl === 'string')
        && (value.status === undefined || ['not_configured', 'configured', 'connection_required', 'connected', 'invalid', 'unavailable'].includes(String(value.status)))
        && (value.canTest === undefined || typeof value.canTest === 'boolean')
        && (value.ownerRole === undefined || value.ownerRole === 'tenant_owner' || value.ownerRole === 'tenant_owner_or_platform_admin');
}
function manifest(value) {
    return record(value)
        && typeof value.id === 'string' && typeof value.version === 'string'
        && typeof value.displayName === 'string' && typeof value.description === 'string'
        && Array.isArray(value.capabilityTags) && value.capabilityTags.every(item => typeof item === 'string')
        && typeof value.category === 'string' && typeof value.provider === 'string'
        && ['read', 'write', 'paid', 'destructive'].includes(String(value.effect))
        && schema(value.inputSchema) && schema(value.outputSchema)
        && record(value.costPolicy) && typeof value.costPolicy.currency === 'string'
        && typeof value.costPolicy.estimated === 'number' && typeof value.costPolicy.maximum === 'number'
        && ['sync', 'async'].includes(String(value.executionMode)) && health(value.health)
        && typeof value.enabled === 'boolean'
        && (value.group === undefined || toolGroup(value.group))
        && (value.configuration === undefined || toolConfiguration(value.configuration));
}
export function parseToolCatalogEnvelope(value) {
    if (!record(value) || value.success !== true || !Array.isArray(value.data) || !value.data.every(manifest)) {
        throw new Error('Invalid tool catalog response');
    }
    return value.data;
}
export function filterTools(tools, filters) {
    const query = filters.query.trim().toLocaleLowerCase();
    return tools.filter(tool => {
        const searchable = [tool.displayName, tool.id, tool.description, tool.provider, tool.category, ...tool.capabilityTags].join(' ').toLocaleLowerCase();
        return (!query || searchable.includes(query))
            && (!filters.provider || tool.provider === filters.provider)
            && (!filters.category || tool.category === filters.category)
            && (!filters.health || tool.health.status === filters.health)
            && (!filters.effect || tool.effect === filters.effect)
            && (!filters.capability || tool.capabilityTags.includes(filters.capability));
    });
}
function singletonGroup(tool) {
    return {
        id: `tool:${tool.id}:${tool.version}`,
        displayName: tool.displayName,
        tools: [tool],
    };
}
function sameGroupMetadata(left, right) {
    return left.displayName === right.displayName
        && left.description === right.description
        && left.order === right.order
        && left.iconKey === right.iconKey;
}
export function groupTools(tools) {
    const groups = new Map();
    for (const tool of tools) {
        if (tool.group === undefined) {
            const singleton = singletonGroup(tool);
            groups.set(singleton.id, singleton);
            continue;
        }
        const existing = groups.get(tool.group.id);
        if (existing !== undefined && !sameGroupMetadata(existing, tool.group)) {
            throw new Error(`Invalid tool group metadata: ${tool.group.id}`);
        }
        groups.set(tool.group.id, existing === undefined
            ? { ...tool.group, tools: [tool] }
            : { ...existing, tools: [...existing.tools, tool] });
    }
    return [...groups.values()].sort((left, right) => {
        if (left.order === undefined && right.order === undefined)
            return 0;
        return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
    });
}
export function reconcileSelectedTool(groups, selected) {
    const visibleTools = groups.flatMap(group => group.tools);
    if (selected === undefined)
        return visibleTools[0];
    return visibleTools.find(tool => tool.id === selected.id && tool.version === selected.version) ?? visibleTools[0];
}
function matchesToolQuery(tool, query) {
    const searchable = [tool.displayName, tool.id, tool.description, tool.provider, tool.category, ...tool.capabilityTags]
        .join(' ').toLocaleLowerCase();
    return searchable.includes(query);
}
export function filterToolGroups(tools, filters) {
    const query = filters.query.trim().toLocaleLowerCase();
    const filteredByFacet = filterTools(tools, { ...filters, query: '' });
    return groupTools(filteredByFacet).flatMap(group => {
        if (!query)
            return [group];
        const groupSearchable = [group.displayName, group.id].join(' ').toLocaleLowerCase();
        if (groupSearchable.includes(query))
            return [group];
        const matchingTools = group.tools.filter(tool => matchesToolQuery(tool, query));
        return matchingTools.length === 0 ? [] : [{ ...group, tools: matchingTools }];
    });
}
export function schemaFields(input) {
    if (input.type !== 'object' || input.properties === undefined)
        return [];
    const required = new Set(input.required ?? []);
    return Object.entries(input.properties).map(([name, property]) => {
        const options = (property.enum ?? []).filter((value) => typeof value === 'string');
        const type = Array.isArray(property.type) ? property.type.find(item => item !== 'null') : property.type;
        const kind = options.length > 0 ? 'select'
            : type === 'boolean' ? 'boolean'
                : type === 'number' || type === 'integer' ? 'number'
                    : type === 'string' ? 'text' : 'json';
        return {
            name, label: property.title ?? name, kind, required: required.has(name), options,
            ...(property.description === undefined ? {} : { description: property.description }),
            ...(property.default === undefined ? {} : { defaultValue: property.default }),
            ...(property.minimum === undefined ? {} : { minimum: property.minimum }),
            ...(property.maximum === undefined ? {} : { maximum: property.maximum }),
        };
    });
}
export function formInput(fields, values) {
    return Object.fromEntries(fields.flatMap(field => {
        const value = values[field.name];
        if (value === undefined || value === '')
            return [];
        if (field.kind === 'number')
            return [[field.name, Number(value)]];
        if (field.kind === 'boolean')
            return [[field.name, Boolean(value)]];
        if (field.kind === 'json') {
            if (typeof value !== 'string')
                return [[field.name, value]];
            return [[field.name, JSON.parse(value)]];
        }
        return [[field.name, value]];
    }));
}
