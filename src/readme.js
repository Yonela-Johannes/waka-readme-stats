const START_MARKER = "<!--START_SECTION:waka-->";
const END_MARKER = "<!--END_SECTION:waka-->";

const FULL_BLOCK = "█";
const EMPTY_BLOCK = "░";

/*
 * Block elements used to draw the fractional tip of a bar.
 * The index is the number of eighths (1/8 ... 7/8) that are filled.
 */
const PARTIAL_BLOCKS = [
    "",
    "▏",
    "▎",
    "▍",
    "▌",
    "▋",
    "▊",
    "▉",
];

function formatPercentage(value) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return "0.00";
    }

    return numeric.toFixed(2);
}

/*
 * Code points that render as double-width glyphs (CJK, emoji, ...).
 */
function isWideCodePoint(codePoint) {
    return (
        (codePoint >= 0x1100 && codePoint <= 0x115f) ||
        (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
        (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
        (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
        (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
        (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
        (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
        (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
        (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
        (codePoint >= 0xff00 && codePoint <= 0xff60) ||
        (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
        (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
        (codePoint >= 0x20000 && codePoint <= 0x3fffd)
    );
}

/*
 * Visual width of a string as rendered in a monospace code block.
 * Double-width glyphs count as two columns and zero-width characters
 * (joiners, variation selectors, combining marks) count as none, so
 * rows stay aligned even when names contain emoji or CJK text.
 */
function displayWidth(text) {
    let width = 0;

    for (const char of String(text ?? "")) {
        const codePoint = char.codePointAt(0);

        if (
            codePoint === 0x200d ||
            codePoint === 0xfe0e ||
            codePoint === 0xfe0f ||
            (codePoint >= 0x0300 && codePoint <= 0x036f)
        ) {
            continue;
        }

        width += isWideCodePoint(codePoint) ? 2 : 1;
    }

    return width;
}

export function padEndWidth(text, targetWidth) {
    const value = String(text ?? "");
    const padding = targetWidth - displayWidth(value);

    return padding > 0
        ? value + " ".repeat(padding)
        : value;
}

/*
 * Draw a fixed-width horizontal bar for a percentage.
 *
 * The filled portion uses eighth-block glyphs so the bar reflects the
 * value with 1/8-cell precision instead of rounding to whole cells.
 * Any non-zero value renders at least a sliver, so tiny entries never
 * look empty beside a real percentage, and the input is clamped to
 * the 0-100 range so outliers cannot overflow the bar.
 */
export function progressBar(percent, length = 24) {
    const numeric = Number(percent);
    const safePercent = Number.isFinite(numeric)
        ? numeric
        : 0;

    const clamped = Math.min(
        100,
        Math.max(0, safePercent),
    );

    const totalEighths = Math.round(
        (clamped / 100) * length * 8,
    );

    const fullBlocks = Math.floor(totalEighths / 8);
    const remainder = totalEighths % 8;

    let bar =
        FULL_BLOCK.repeat(fullBlocks) +
        PARTIAL_BLOCKS[remainder];

    let usedWidth =
        fullBlocks + (remainder > 0 ? 1 : 0);

    // Keep tiny-but-real values visible without growing the bar.
    if (clamped > 0 && usedWidth === 0) {
        bar = PARTIAL_BLOCKS[1];
        usedWidth = 1;
    }

    return (
        bar +
        EMPTY_BLOCK.repeat(
            Math.max(0, length - usedWidth),
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
            (item) =>
                displayWidth(item?.name || "Unknown"),
        ),
    );

    const maxTextLen = Math.max(
        18,
        ...list.map(
            (item) =>
                displayWidth(item?.text || "0 secs"),
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
                padEndWidth(name, maxNameLen),
                padEndWidth(text, maxTextLen),
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