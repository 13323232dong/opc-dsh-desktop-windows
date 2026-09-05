import type { JsonSchema, ToolGroup, ToolManifest } from '../tool-library-contracts.ts';
export interface ToolFilters {
    readonly query: string;
    readonly provider: string;
    readonly category: string;
    readonly health: string;
    readonly effect: string;
    readonly capability: string;
}
export interface SchemaField {
    readonly name: string;
    readonly label: string;
    readonly description?: string;
    readonly kind: 'text' | 'number' | 'boolean' | 'select' | 'json';
    readonly required: boolean;
    readonly options: readonly string[];
    readonly defaultValue?: unknown;
    readonly minimum?: number;
    readonly maximum?: number;
}
export interface ToolGroupView extends ToolGroup {
    readonly tools: readonly ToolManifest[];
}
/** Opens the family at its primary creation action instead of an incidental query action. */
export declare function defaultToolForGroup(group: ToolGroupView): ToolManifest | undefined;
export declare function hasActiveToolFilters(filters: ToolFilters): boolean;
export declare function parseToolCatalogEnvelope(value: unknown): readonly ToolManifest[];
export declare function filterTools(tools: readonly ToolManifest[], filters: ToolFilters): readonly ToolManifest[];
export declare function groupTools(tools: readonly ToolManifest[]): readonly ToolGroupView[];
export declare function reconcileSelectedTool(groups: readonly ToolGroupView[], selected?: ToolManifest): ToolManifest | undefined;
export declare function filterToolGroups(tools: readonly ToolManifest[], filters: ToolFilters): readonly ToolGroupView[];
export declare function schemaFields(input: JsonSchema): readonly SchemaField[];
export declare function formInput(fields: readonly SchemaField[], values: Readonly<Record<string, unknown>>): unknown;
