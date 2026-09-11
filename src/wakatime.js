const API_BASE = "https://wakatime.com/api/v1";

function createAuthHeader(apiKey) {
    // WakaTime uses HTTP Basic Auth with the API key as the username.
    // The trailing colon represents an empty password.
    const credentials = `${apiKey}:`;

    return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export async function wakatimeRequest(apiKey, endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            Authorization: createAuthHeader(apiKey),
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `WakaTime API request failed (${response.status}): ${body}`,
        );
    }

    return response.json();
}

export async function getStats(
    apiKey,
    range = "last_7_days",
) {
    return wakatimeRequest(
        apiKey,
        `/users/current/stats/${encodeURIComponent(range)}`,
    );
}

export async function getAllTime(apiKey) {
    return wakatimeRequest(
        apiKey,
        "/users/current/all_time_since_today",
    );
}