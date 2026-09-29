import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "node:fs/promises";

import {
    getAllTime,
    getStats,
} from "./wakatime.js";

import {
    getGitHubLanguages,
} from "./github.js";

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
        const apiKey = core.getInput("wakatime_api_key");

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

        const [owner, repo] = repository.split("/");

        if (!owner || !repo) {
            throw new Error(
                `Invalid repository: ${repository}`,
            );
        }

        const octokit = github.getOctokit(githubToken);

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

            languagesLimit:
                core.getInput("languages_limit") || "all",

            languagesSource: (
                core.getInput("languages_source") || "both"
            ).toLowerCase(),
        };

        let allTime = null;
        let stats = null;

        if (apiKey) {
            try {
                core.info("Fetching WakaTime statistics...");

                const [allTimeResponse, statsResponse] =
                    await Promise.all([
                        getAllTime(apiKey).catch((err) => {
                            core.warning(
                                `Failed to fetch WakaTime all-time stats: ${err.message}`,
                            );
                            return null;
                        }),
                        getStats(apiKey, statsRange).catch((err) => {
                            core.warning(
                                `Failed to fetch WakaTime range stats: ${err.message}`,
                            );
                            return null;
                        }),
                    ]);

                allTime = allTimeResponse?.data || null;
                stats = statsResponse?.data || null;
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : String(error);

                core.warning(
                    `Error fetching WakaTime data: ${message}`,
                );
            }
        } else {
            core.info(
                "WakaTime API key not provided; skipping WakaTime statistics.",
            );
        }

        let githubLanguages = null;

        if (
            options.showLanguages &&
            (options.languagesSource === "github" ||
                options.languagesSource === "both")
        ) {
            try {
                core.info("Fetching GitHub language statistics...");

                githubLanguages = await getGitHubLanguages(
                    octokit,
                    owner,
                );

                core.info(
                    `GitHub languages count: ${
                        githubLanguages?.length ?? 0
                    }`,
                );
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : String(error);

                core.warning(
                    `Failed to fetch GitHub language statistics: ${message}`,
                );
            }
        }

        /*
         * Diagnostics
         *
         * These logs expose only metadata/counts.
         * No API key or raw WakaTime response is printed.
         */

        core.info(
            `WakaTime languages count: ${
                stats?.languages?.length ?? 0
            }`,
        );

        core.info(
            `GitHub languages count: ${
                githubLanguages?.length ?? 0
            }`,
        );

        core.info(
            `Editors count: ${
                stats?.editors?.length ?? 0
            }`,
        );

        core.info(
            `Operating systems count: ${
                stats?.operating_systems?.length ?? 0
            }`,
        );

        core.info(
            `Projects count: ${
                stats?.projects?.length ?? 0
            }`,
        );

        core.info(
            `Stats range: ${statsRange}`,
        );

        core.info(
            `Languages limit: ${options.languagesLimit}`,
        );

        core.info(
            `Languages source: ${options.languagesSource}`,
        );

        const hasEnabledSections = Object.values(
            options,
        ).some((val) => Boolean(val));

        if (!hasEnabledSections) {
            core.info(
                "All sections are disabled; skipping README update.",
            );

            return;
        }

        const wakaSection = generateWakaSection({
            allTime,
            stats,
            githubLanguages,
            options,
        });

        if (!wakaSection) {
            throw new Error(
                "No statistics were available to render.",
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
