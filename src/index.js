import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "node:fs/promises";

import {
    getAllTime,
    getStats,
} from "./wakatime.js";

import {
    generateWakaSection,
    replaceWakaSection,
} from "./readme.js";

function getBooleanInput(name, fallback = false) {
    const value = core.getInput(name);

    if (value === "") {
        return fallback;
    }

    return value.toLowerCase() === "true";
}

async function run() {
    try {
        const apiKey = core.getInput(
            "wakatime_api_key",
            { required: true },
        );

        const githubToken = core.getInput(
            "github_token",
            { required: true },
        );

        const repository = core.getInput(
            "github_repository",
            { required: true },
        );

        const readmePath =
            core.getInput("readme_path") || "README.md";

        const statsRange =
            core.getInput("stats_range") || "last_7_days";

        const options = {
            showCodeTime: getBooleanInput(
                "show_code_time",
                true,
            ),

            showAiTime: getBooleanInput(
                "show_ai_time",
                true,
            ),

            showLanguages: getBooleanInput(
                "show_languages",
                true,
            ),

            showEditors: getBooleanInput(
                "show_editors",
                true,
            ),

            showOs: getBooleanInput(
                "show_os",
                true,
            ),

            showProjects: getBooleanInput(
                "show_projects",
                true,
            ),
        };

        core.info("Fetching WakaTime statistics...");

        const [allTimeResponse, statsResponse] =
            await Promise.all([
                getAllTime(apiKey),
                getStats(apiKey, statsRange),
            ]);

        const allTime = allTimeResponse?.data;
        const stats = statsResponse?.data;

        if (!allTime) {
            throw new Error(
                "WakaTime all-time statistics were not returned.",
            );
        }

        if (!stats) {
            throw new Error(
                "WakaTime statistics were not returned.",
            );
        }

        /*
         * Diagnostics
         *
         * These logs expose only metadata/counts.
         * No API key or raw WakaTime response is printed.
         */

        core.info(
            `Languages count: ${
                stats.languages?.length ?? 0
            }`,
        );

        core.info(
            `Editors count: ${
                stats.editors?.length ?? 0
            }`,
        );

        core.info(
            `Operating systems count: ${
                stats.operating_systems?.length ?? 0
            }`,
        );

        core.info(
            `Projects count: ${
                stats.projects?.length ?? 0
            }`,
        );

        core.info(
            `AI additions: ${
                stats.ai_additions ?? 0
            }`,
        );

        core.info(
            `AI deletions: ${
                stats.ai_deletions ?? 0
            }`,
        );

        core.info(
            `AI line changes: ${
                stats.ai_line_changes_total ?? 0
            }`,
        );

        core.info(
            `AI sessions: ${
                stats.ai_sessions ?? 0
            }`,
        );

        core.info(
            `Stats range: ${statsRange}`,
        );

        core.info(
            `Code time enabled: ${
                options.showCodeTime
            }`,
        );

        core.info(
            `AI time enabled: ${
                options.showAiTime
            }`,
        );

        core.info(
            `Languages enabled: ${
                options.showLanguages
            }`,
        );

        core.info(
            `Editors enabled: ${
                options.showEditors
            }`,
        );

        core.info(
            `Operating systems enabled: ${
                options.showOs
            }`,
        );

        core.info(
            `Projects enabled: ${
                options.showProjects
            }`,
        );

        const hasEnabledSections = Object.values(
            options,
        ).some(Boolean);

        if (!hasEnabledSections) {
            core.info(
                "All WakaTime sections are disabled; skipping README update.",
            );

            return;
        }

        const wakaSection = generateWakaSection({
            allTime,
            stats,
            options,
        });

        if (!wakaSection) {
            throw new Error(
                "No WakaTime statistics were available to render.",
            );
        }

        const readme = await fs.readFile(
            readmePath,
            "utf8",
        );

        const updatedReadme = replaceWakaSection(
            readme,
            wakaSection,
        );

        if (updatedReadme === readme) {
            core.info(
                "README is already up to date.",
            );

            return;
        }

        const [owner, repo] =
            repository.split("/");

        if (!owner || !repo) {
            throw new Error(
                `Invalid repository: ${repository}`,
            );
        }

        const octokit =
            github.getOctokit(githubToken);

        const currentFile =
            await octokit.rest.repos.getContent({
                owner,
                repo,
                path: readmePath,
            });

        if (Array.isArray(currentFile.data)) {
            throw new Error(
                `${readmePath} points to a directory.`,
            );
        }

        const encodedContent =
            Buffer.from(updatedReadme).toString(
                "base64",
            );

        await octokit.rest.repos.createOrUpdateFileContents(
            {
                owner,
                repo,
                path: readmePath,
                message: "chore: update WakaTime stats",
                content: encodedContent,
                sha: currentFile.data.sha,
            },
        );

        core.info(
            `Updated ${repository}/${readmePath}`,
        );
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : String(error);

        core.setFailed(message);
    }
}

run();