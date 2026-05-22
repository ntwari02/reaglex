/** Parse YouTube video ID from URL or raw ID. */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input?.trim()) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').split('/')[0] || null;
    }
    const v = u.searchParams.get('v');
    if (v) return v;
    const embed = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embed?.[1]) return embed[1];
    const live = u.pathname.match(/\/live\/([^/?]+)/);
    if (live?.[1]) return live[1];
  } catch {
    /* not a URL */
  }
  return null;
}

export function youtubeEmbedUrl(videoId: string, opts?: { autoplay?: boolean; mute?: boolean }): string {
  const id = extractYouTubeVideoId(videoId) || videoId;
  const params = new URLSearchParams({
    autoplay: opts?.autoplay !== false ? '1' : '0',
    mute: opts?.mute !== false ? '1' : '0',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Mock broadcast ID for MVP when YouTube Live API is not configured. */
export function mockYouTubeLiveVideoId(): string {
  return process.env.YOUTUBE_LIVE_DEMO_VIDEO_ID || 'jfKfPfyJRdk';
}
