/** Build an unambiguous filename-to-download map for one captain Session. */
export function buildSessionArtifactDownloadIndex(teams, captainSessionId) {
    if (captainSessionId === undefined)
        return new Map();
    const indexed = new Map();
    const ambiguous = new Set();
    for (const team of teams) {
        if (team.captainSessionId !== captainSessionId)
            continue;
        const artifactGroups = [team.artifacts ?? [], ...team.tasks.map(task => task.artifacts)];
        for (const artifacts of artifactGroups) {
            for (const artifact of artifacts) {
                const name = artifact.name.trim();
                const url = artifact.url.trim();
                if (name === '' || url === '' || ambiguous.has(name))
                    continue;
                const existing = indexed.get(name);
                if (existing === undefined || existing === url)
                    indexed.set(name, url);
                else {
                    indexed.delete(name);
                    ambiguous.add(name);
                }
            }
        }
    }
    return indexed;
}
