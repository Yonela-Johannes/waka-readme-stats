const START_MARKER = "<!--START_SECTION:waka-->";
const END_MARKER = "<!--END_SECTION:waka-->";

function formatPercentage(value) {
    return Number(value || 0).toFixed(2);
}

function progressBar(percent, length = 24) {
    const numericPercent = Number(percent || 0);

    const filled = Math.round(
        (numericPercent / 100) * length,
    );

    return (
        "█".repeat(Math.max(0, filled)) +
        "░".repeat(
            Math.max(0, length - filled),
        )
    );
}

function formatRows(items = [], limit = 8) {
    const parsedLimit =
        limit === "all" ||
        limit === 0 ||
        limit === "0" ||
        limit === null ||
        limit === undefined
            ? 0
            : Number(limit);

    const list =
        parsedLimit && parsedLimit > 0
            ? items.slice(0, parsedLimit)
            : items;

    if (list.length === 0) {
        return "";
    }

    const maxNameLen = Math.max(
        22,
        ...list.map(
            (item) => String(item?.name || "Unknown").length,
        ),
    );

    const maxTextLen = Math.max(
        18,
        ...list.map(
            (item) => String(item?.text || "0 secs").length,
        ),
    );

    return list
        .map((item) => {
            const name = String(
                item?.name || "Unknown",
            );

            const text = String(
                item?.text || "0 secs",
            );

            const percent = Number(
                item?.percent || 0,
            );

            return [
                name.padEnd(maxNameLen),
                text.padEnd(maxTextLen),
                progressBar(percent),
                `${formatPercentage(percent)}%`,
            ].join(" ");
        })
        .join("\n");
}

function statBadge(label, value) {
    const safeLabel = encodeURIComponent(
        String(label),
    );

    const safeValue = encodeURIComponent(
        String(value),
    );

    return `![${label}](https://img.shields.io/badge/${safeLabel}-${safeValue}-blue?style=flat)`;
}

function renderListSection(
    title,
    items,
    limit = 8,
) {
    if (!Array.isArray(items) || items.length === 0) {
        return "";
    }

    return [
        `### ${title}`,
        "",
        "```text",
        formatRows(items, limit),
        "```",
    ].join("\n");
}

function renderBadgeSection(
    title,
    items,
    limit = 6,
) {
    if (!Array.isArray(items) || items.length === 0) {
        return "";
    }

    const badges = items
        .slice(0, limit)
        .map((item) => {
            const name = item?.name || "Unknown";
            const percent = formatPercentage(
                item?.percent || 0,
            );

            return statBadge(
                name,
                `${percent}%`,
            );
        })
        .join(" ");

    return [
        `### ${title}`,
        "",
        badges,
    ].join("\n");
}

export function generateWakaSection({
    allTime,
    stats,
    githubLanguages,
    options = {},
}) {
    const sections = [];

    /*
     * Code Time
     */
    if (
        options.showCodeTime &&
        allTime?.text
    ) {
        sections.push(
            statBadge(
                "Code Time",
                allTime.text,
            ),
        );
    }

    /*
     * AI Coding Time
     */
    if (
        options.showAiTime &&
        stats?.ai_coding?.text
    ) {
        sections.push(
            statBadge(
                "AI Code Time",
                stats.ai_coding.text,
            ),
        );
    }

    /*
     * Languages
     */
    if (options.showLanguages) {
        const source = (options.languagesSource || "both").toLowerCase();
        const limit = options.languagesLimit ?? "all";

        const hasWakaLangs =
            Array.isArray(stats?.languages) &&
            stats.languages.length > 0;

        const hasGithubLangs =
            Array.isArray(githubLanguages) &&
            githubLanguages.length > 0;

        if (source === "both" && hasWakaLangs && hasGithubLangs) {
            const wakaSection = renderListSection(
                "💻 Languages (Time Coded)",
                stats.languages,
                limit,
            );
            const githubSection = renderListSection(
                "💻 Languages (Code on GitHub)",
                githubLanguages,
                limit,
            );

            if (wakaSection) {
                sections.push(wakaSection);
            }
            if (githubSection) {
                sections.push(githubSection);
            }
        } else if (
            source === "github" ||
            (source === "both" && !hasWakaLangs && hasGithubLangs)
        ) {
            const langsToRender = hasGithubLangs
                ? githubLanguages
                : stats?.languages;

            const section = renderListSection(
                "💻 Languages",
                langsToRender,
                limit,
            );

            if (section) {
                sections.push(section);
            }
        } else {
            const langsToRender = hasWakaLangs
                ? stats?.languages
                : githubLanguages;

            const section = renderListSection(
                "💻 Languages",
                langsToRender,
                limit,
            );

            if (section) {
                sections.push(section);
            }
        }
    }

    /*
     * Editors
     */
    if (options.showEditors) {
        const section = renderListSection(
            "🔥 Editors",
            stats?.editors,
            6,
        );

        if (section) {
            sections.push(section);
        }
    }

    /*
     * Operating Systems
     */
    if (options.showOs) {
        const section = renderListSection(
            "🖥️ Operating Systems",
            stats?.operating_systems,
            6,
        );

        if (section) {
            sections.push(section);
        }
    }

    /*
     * Projects
     */
    if (options.showProjects) {
        const section = renderListSection(
            "📦 Projects",
            stats?.projects,
            8,
        );

        if (section) {
            sections.push(section);
        }
    }

    return sections.join("\n\n");
}

export function replaceWakaSection(
    readme,
    content,
) {
    const startIndex =
        readme.indexOf(START_MARKER);

    const endIndex =
        readme.indexOf(END_MARKER);

    if (
        startIndex === -1 ||
        endIndex === -1
    ) {
        throw new Error(
            `README must contain ${START_MARKER} and ${END_MARKER}`,
        );
    }

    if (endIndex < startIndex) {
        throw new Error(
            "README WakaTime markers are in the wrong order.",
        );
    }

    const before = readme.slice(
        0,
        startIndex + START_MARKER.length,
    );

    const after = readme.slice(endIndex);

    return [
        before,
        "",
        content,
        "",
        after,
    ].join("\n");
}