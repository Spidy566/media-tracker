let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not configured");
  }

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" },
  );

  if (!res.ok) {
    throw new Error("Failed to get Twitch access token");
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return cachedToken.token;
}

export async function igdbFetch(endpoint: string, body: string) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) {
    throw new Error("TWITCH_CLIENT_ID is not configured");
  }

  const token = await getAccessToken();

  const res = await fetch(`https://api.igdb.com/v4${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
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
