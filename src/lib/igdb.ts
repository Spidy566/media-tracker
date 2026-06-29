let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.token;
    }

    const res = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
        { method: "POST" }
    );

    if (!res.ok) {
        throw new Error("Failed to get Twitch access token");
    }

    const data = await res.json();
    // expires_in is in seconds; subtract a small buffer (5 min) to be safe
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    };

    return cachedToken.token;
}

export async function igdbFetch(endpoint: string, body: string) {
    const token = await getAccessToken();

    const res = await fetch(`https://api.igdb.com/v4${endpoint}`, {
        method: "POST",
        headers: {
            "Client-ID": process.env.TWITCH_CLIENT_ID!,
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain",
        },
        body,
    });

    if (!res.ok) {
        throw new Error(`IGDB API error: ${res.status}`);
    }

    return res.json();
}