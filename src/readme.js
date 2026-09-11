const START_MARKER = "<!--START_SECTION:waka-->";
const END_MARKER = "<!--END_SECTION:waka-->";

function formatPercentage(value) {
    return Number(value || 0).toFixed(2);
}

function progressBar(percent, length = 24) {
    const filled = Math.round((Number(percent) / 100) * length);

    return (
        "█".repeat(Math.max(0, filled)) +
        "░".repeat(Math.max(0, length - filled))
    );
}

function formatRows(items = [], limit = 8) {
    return items
        .slice(0, limit)
        .map((item) => {
            const name = String(item.name || "Unknown");
            const text = String(item.text || "0 secs");
            const percent = Number(item.percent || 0);

            return `${name.padEnd(22)} ${text.padEnd(18)} ${progressBar(
                percent,
            )} ${formatPercentage(percent)}%`;
        })
        .join("\n");
}

function statBadge(label, value) {
    return `![${label}](https://img.shields.io/badge/${encodeURIComponent(
        label,
    )}-${encodeURIComponent(value)}-blue?style=flat)`;
}

function renderListSection(title, items, limit) {
    if (!items?.length) {
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

export function generateWakaSection({
    allTime,
    stats,
    options,
}) {
    const sections = [];

    if (options.showCodeTime && allTime?.text) {
        sections.push(
            statBadge("Code Time", allTime.text),
        );
    }

    if (
        options.showAiTime &&
        stats?.ai_coding?.text
    ) {
        sections.push(
            statBadge("AI Code Time", stats.ai_coding.text),
        );
    }

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

export function replaceWakaSection(readme, content) {
    const startIndex = readme.indexOf(START_MARKER);
    const endIndex = readme.indexOf(END_MARKER);

    if (startIndex === -1 || endIndex === -1) {
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

    return `${before}\n\n${content}\n\n${after}`;
}