const laneQueries = {
  all: '(art | artist | music | musician | video | filmmaker | game | builder | animation | remix)',
  music: '(music | musician | song | producer | beat | album | remix | performance)',
  visual: '(art | artist | illustration | animation | design | poster | visual)',
  video: '(video | filmmaker | short | reel | trailer | remotion | edit)',
  game: '(game | gamedev | playable | arcade | build | demo)',
  builder: '(build | builder | miniapp | frame | app | prototype | repo)'
};

const laneLabels = {
  all: 'All creative lanes',
  music: 'Music',
  visual: 'Visual art',
  video: 'Video',
  game: 'Games',
  builder: 'Builders'
};

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json; charset=utf-8'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders()
  });
}

function getApiKey(env) {
  return env.NEYNAR_API_KEY || env.GHOSTMINTOPS_NEYNAR_API_KEY || env.NEYCLAW_NEYNAR_API_KEY || '';
}

function scoreCandidate(author, casts) {
  const followerCount = Number(author.follower_count || 0);
  const engagement = casts.reduce((total, cast) => {
    return total + Number(cast.reactions?.likes_count || 0) + Number(cast.reactions?.recasts_count || 0) + Number(cast.replies?.count || 0);
  }, 0);
  const underDiscoveredBonus = followerCount < 2500 ? 25 : followerCount < 10000 ? 12 : 0;
  const activityBonus = Math.min(casts.length * 7, 28);
  const engagementBonus = Math.min(engagement, 30);
  return Math.round(underDiscoveredBonus + activityBonus + engagementBonus);
}

function fitReason(lane, author, casts) {
  const profile = author.profile?.bio?.text || '';
  const sample = casts[0]?.text || '';
  const laneLabel = laneLabels[lane] || laneLabels.all;
  return `${author.display_name || author.username} is showing public ${laneLabel.toLowerCase()} signals through recent casts${profile ? ' and profile context' : ''}. Good candidate for a human-reviewed ZABAL invite if their work matches the community tone. Sample signal: "${sample.slice(0, 150)}${sample.length > 150 ? '...' : ''}"`;
}

function inviteCopy(lane, author) {
  const laneLabel = laneLabels[lane] || 'creative';
  return `Saw your ${laneLabel.toLowerCase()} work on Farcaster and thought it might fit ZABAL Gamez July build month. If you are into shipping a small, linkable artifact with a real creator community around it, this might be worth a look.`;
}

async function searchNeynar(apiKey, query, lane) {
  const url = new URL('https://api.neynar.com/v2/farcaster/cast/search/');
  url.searchParams.set('q', query);
  url.searchParams.set('mode', 'hybrid');
  url.searchParams.set('sort_type', 'algorithmic');
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: {
      'x-api-key': apiKey,
      'x-neynar-experimental': 'true'
    }
  });

  if (!response.ok) {
    throw new Error(`Neynar search failed: ${response.status}`);
  }

  const payload = await response.json();
  const casts = payload.result?.casts || [];
  const byFid = new Map();

  for (const cast of casts) {
    const author = cast.author;
    if (!author?.fid || !author.username) continue;
    if (!byFid.has(author.fid)) byFid.set(author.fid, { author, casts: [] });
    byFid.get(author.fid).casts.push(cast);
  }

  return [...byFid.values()]
    .map(({ author, casts }) => ({
      fid: author.fid,
      username: author.username,
      displayName: author.display_name || author.username,
      pfpUrl: author.pfp_url || '',
      profileUrl: `https://farcaster.xyz/${author.username}`,
      bio: author.profile?.bio?.text || '',
      followerCount: author.follower_count || 0,
      followingCount: author.following_count || 0,
      score: scoreCandidate(author, casts),
      lane: laneLabels[lane] || laneLabels.all,
      fitReason: fitReason(lane, author, casts),
      inviteCopy: inviteCopy(lane, author),
      sampleCasts: casts.slice(0, 3).map((cast) => ({
        text: cast.text || '',
        timestamp: cast.timestamp || '',
        likes: cast.reactions?.likes_count || 0,
        recasts: cast.reactions?.recasts_count || 0,
        replies: cast.replies?.count || 0,
        url: cast.hash ? `https://farcaster.xyz/${author.username}/${cast.hash}` : ''
      }))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet({ request, env }) {
  const apiKey = getApiKey(env);
  const requestUrl = new URL(request.url);
  const lane = requestUrl.searchParams.get('lane') || 'all';
  const seed = requestUrl.searchParams.get('q') || '';
  const queryBase = laneQueries[lane] || laneQueries.all;
  const query = `${seed ? `${seed} + ` : ''}${queryBase} -giveaway -airdrop -presale`;

  if (!apiKey) {
    return json({
      ok: false,
      connected: false,
      source: 'not_configured',
      message: 'Farcaster scout backend is deployed, but no Neynar API key is configured in Cloudflare Pages secrets.',
      query,
      candidates: []
    });
  }

  try {
    const candidates = await searchNeynar(apiKey, query, lane);
    return json({
      ok: true,
      connected: true,
      source: 'neynar_search_casts',
      generatedAt: new Date().toISOString(),
      query,
      lane: laneLabels[lane] || laneLabels.all,
      candidates
    });
  } catch (error) {
    return json({
      ok: false,
      connected: true,
      source: 'neynar_search_casts',
      message: error.message,
      query,
      candidates: []
    }, 502);
  }
}
