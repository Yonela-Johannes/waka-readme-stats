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
    return items
        .slice(0, limit)
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
                name.padEnd(22),
                text.padEnd(18),
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
    options,
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
        const section = renderListSection(
            "💻 Languages",
            stats?.languages,
            8,
        );

        if (section) {
            sections.push(section);
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