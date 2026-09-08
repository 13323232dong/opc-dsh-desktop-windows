import React from 'react';
import type { ToolLibraryClient } from '../tool-library-contracts.ts';
export interface ToolLibraryViewProps {
    readonly sessionId: string;
    readonly client: ToolLibraryClient;
    readonly conversationId?: string;
    readonly runId?: string;
}
export declare function ToolLibraryView({ sessionId, client, conversationId, runId }: ToolLibraryViewProps): React.JSX.Element;
