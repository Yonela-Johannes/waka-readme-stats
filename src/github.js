export function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const index = Math.min(i, sizes.length - 1);
    const value = bytes / Math.pow(k, index);

    if (index === 0) {
        return `${bytes} B`;
    }

    return `${value.toFixed(1)} ${sizes[index]}`;
}

export async function getGitHubLanguages(octokit, owner) {
    const query = `
        query getLanguages($owner: String!, $cursor: String) {
            repositoryOwner(login: $owner) {
                repositories(
                    first: 100
                    after: $cursor
                    ownerAffiliations: [OWNER]
                    orderBy: { field: UPDATED_AT, direction: DESC }
                ) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    nodes {
                        name
                        isFork
                        isArchived
                        languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
                            edges {
                                size
                                node {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const languageStats = {};
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
        const response = await octokit.graphql(query, {
            owner,
            cursor,
        });

        const ownerData = response?.repositoryOwner;
        if (!ownerData || !ownerData.repositories) {
            break;
        }

        const { nodes, pageInfo } = ownerData.repositories;

        for (const repo of nodes || []) {
            if (repo.isFork || repo.isArchived) {
                continue;
            }

            const edges = repo.languages?.edges || [];
            for (const edge of edges) {
                const langName = edge.node?.name;
                const size = edge.size || 0;

                if (!langName || size <= 0) {
                    continue;
                }

                if (!languageStats[langName]) {
                    languageStats[langName] = {
                        name: langName,
                        bytes: 0,
                        repos: 0,
                    };
                }

                languageStats[langName].bytes += size;
                languageStats[langName].repos += 1;
            }
        }

        hasNextPage = Boolean(pageInfo?.hasNextPage);
        cursor = pageInfo?.endCursor || null;
    }

    const totalBytes = Object.values(languageStats).reduce(
        (sum, item) => sum + item.bytes,
        0,
    );

    if (totalBytes === 0) {
        return [];
    }

    return Object.values(languageStats)
        .map((item) => {
            const percent = (item.bytes / totalBytes) * 100;
            const repoText =
                item.repos === 1 ? "1 repo" : `${item.repos} repos`;

            return {
                name: item.name,
                bytes: item.bytes,
                repos: item.repos,
                percent,
                text: `${formatBytes(item.bytes)} (${repoText})`,
            };
        })
        .sort((a, b) => b.bytes - a.bytes);
}
