import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getActivitySnapshotsSnapshot, subscribeActivitySnapshots, } from "./activity-monitor.js";
import { buildSessionArtifactDownloadIndex } from "./session-artifact-download-model.js";
import { decoratedCode } from "./session-artifact-download-target.js";
import css from './ActivityPanel.module.css';
const SESSION_ARTIFACT_DOWNLOAD_CLASS = css.sessionArtifactDownload;
function startDownload(code) {
    const url = code.dataset.agentTeamsDownloadUrl;
    const name = code.textContent?.trim();
    if (url === undefined || name === undefined || name === '')
        return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}
function clearDecoration(code) {
    code.classList.remove(SESSION_ARTIFACT_DOWNLOAD_CLASS);
    delete code.dataset.agentTeamsDownloadUrl;
    code.removeAttribute('role');
    code.removeAttribute('tabindex');
    code.removeAttribute('aria-label');
    code.removeAttribute('title');
}
function decorateSessionArtifacts(index) {
    const codes = document.querySelectorAll('code');
    for (const code of codes) {
        const name = code.textContent?.trim() ?? '';
        const url = code.closest('[data-agent-teams-host], a, button, pre') === null
            ? index.get(name)
            : undefined;
        if (url === undefined) {
            if (code.dataset.agentTeamsDownloadUrl !== undefined)
                clearDecoration(code);
            continue;
        }
        if (code.dataset.agentTeamsDownloadUrl === url)
            continue;
        code.classList.add(SESSION_ARTIFACT_DOWNLOAD_CLASS);
        code.dataset.agentTeamsDownloadUrl = url;
        code.setAttribute('role', 'link');
        code.tabIndex = 0;
        code.setAttribute('aria-label', `下载 ${name}`);
        code.title = `下载 ${name}`;
    }
}
/** Make verified Agent Teams artifacts downloadable inside Session prose. */
export function SessionArtifactDownloads({ sessionsList }) {
    const current = useSyncExternalStore(sessionsList.subscribe, sessionsList.getSnapshot).current;
    const { teams, archivedTeams } = useSyncExternalStore(subscribeActivitySnapshots, getActivitySnapshotsSnapshot);
    const index = useMemo(() => buildSessionArtifactDownloadIndex([...teams, ...archivedTeams], current), [teams, archivedTeams, current]);
    useEffect(() => {
        let queued = false;
        const decorate = () => {
            if (queued)
                return;
            queued = true;
            queueMicrotask(() => {
                queued = false;
                decorateSessionArtifacts(index);
            });
        };
        const onClick = (event) => {
            const code = decoratedCode(event.target);
            if (code === null)
                return;
            event.preventDefault();
            event.stopPropagation();
            startDownload(code);
        };
        const onKeyDown = (event) => {
            if (event.key !== 'Enter' && event.key !== ' ')
                return;
            const code = decoratedCode(event.target);
            if (code === null)
                return;
            event.preventDefault();
            event.stopPropagation();
            startDownload(code);
        };
        const observer = new MutationObserver(decorate);
        observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeyDown, true);
        decorate();
        return () => {
            observer.disconnect();
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('keydown', onKeyDown, true);
            for (const code of document.querySelectorAll('code[data-agent-teams-download-url]'))
                clearDecoration(code);
        };
    }, [index]);
    return null;
}
