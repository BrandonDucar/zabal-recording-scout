const state = {
  scout: null,
  query: "",
  lane: "all",
  sourceMode: "demo",
  archiveName: "ZABAL Gamez recordings",
};

const demoDataUrl = "./data/scout.json";
const laneSummary = document.getElementById("laneSummary");
const laneFilter = document.getElementById("laneFilter");
const recordingList = document.getElementById("recordingList");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const copyBrief = document.getElementById("copyBrief");
const artistQuery = document.getElementById("artistQuery");
const artistLane = document.getElementById("artistLane");
const runArtistScout = document.getElementById("runArtistScout");
const artistScoutStatus = document.getElementById("artistScoutStatus");
const artistResults = document.getElementById("artistResults");
const archiveName = document.getElementById("archiveName");
const archiveUrl = document.getElementById("archiveUrl");
const archiveJson = document.getElementById("archiveJson");
const loadDemo = document.getElementById("loadDemo");
const loadCustom = document.getElementById("loadCustom");
const setupStatus = document.getElementById("setupStatus");

const publicLaneLabels = new Map([
  ["Proof Drop / Receipts", "Proofs & Receipts"],
  ["DreamStar / Music", "Music & Performance"],
  ["Droid OS / Agent Identity", "Agent & Character Ideas"],
  ["WaveWarZ / Dashboard", "WaveWarZ & Dashboards"],
  ["Social Nexus / Farcaster", "Farcaster & Social"],
  ["Farcaster / Snapchain", "Farcaster & Snapchain"],
  ["ZAO Governance / Fractal", "Governance & Fractals"],
  ["IDE Tutorials / Vibe Coding", "IDE & Builder Tutorials"],
]);

function publicLane(value) {
  return publicLaneLabels.get(value) || value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortDate(value) {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function includesText(recording, query) {
  if (!query) return true;
  const haystack = [
    recording.title,
    recording.presenter,
    recording.org,
    recording.track,
    recording.primary_lane,
    recording.summary,
    ...(recording.topics || []),
    ...(recording.takeaways || []),
    ...recording.matched_lanes.flatMap((lane) => [lane.lane, lane.action, ...(lane.hits || [])]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function matchesLane(recording, lane) {
  if (lane === "all") return true;
  return recording.matched_lanes.some((match) => match.lane === lane);
}

function renderSummary() {
  if (!state.scout) return;
  laneSummary.innerHTML = state.scout.lane_recommendations
    .map(
      (lane) => `
        <article class="lane-card">
          <strong>${lane.count}</strong>
          <span>${publicLane(lane.label)}</span>
        </article>
      `,
    )
    .join("");

  laneFilter.innerHTML = `
    <option value="all">All lanes</option>
    ${state.scout.lane_recommendations.map((lane) => `<option value="${lane.label}">${publicLane(lane.label)}</option>`).join("")}
  `;
}

function renderRecordings() {
  if (!state.scout) return;
  const rows = state.scout.top_recordings.filter(
    (recording) => includesText(recording, state.query) && matchesLane(recording, state.lane),
  );

  resultCount.textContent = `${rows.length} visible`;
  recordingList.innerHTML = rows
    .map(
      (recording) => `
        <article class="recording-card">
          <div class="score">${recording.score}</div>
          <div>
            <div class="meta">
              <span class="chip">${escapeHtml(shortDate(recording.date))}</span>
              <span class="chip">${escapeHtml(recording.track || "mixed")}</span>
              <span class="chip">${escapeHtml(recording.presenter || "unknown")}${recording.org ? ` / ${escapeHtml(recording.org)}` : ""}</span>
            </div>
            <h3>${escapeHtml(recording.title)}</h3>
            <div class="meta">
              ${recording.matched_lanes
                .slice(0, 5)
                .map((lane) => `<span class="lane-chip">${escapeHtml(publicLane(lane.lane))}</span>`)
                .join("")}
            </div>
            <p class="summary">${escapeHtml(recording.summary || "No summary provided.")}</p>
            <div class="actions">
              ${recording.page ? `<a href="${escapeHtml(recording.page)}" target="_blank" rel="noreferrer">Recording</a>` : ""}
              ${recording.youtube ? `<a href="${escapeHtml(recording.youtube)}" target="_blank" rel="noreferrer">YouTube</a>` : ""}
              ${recording.transcript_raw ? `<a href="${escapeHtml(recording.transcript_raw)}" target="_blank" rel="noreferrer">Transcript</a>` : ""}
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function buildBrief() {
  return `I mocked up a simple ZABAL Recording Scout:
${location.href}

It helps builders load a workshop archive, filter by lane, open recordings/transcripts, and turn sessions into July build ideas.

Current snapshot:
- ${state.scout?.source?.count || state.scout?.top_recordings?.length || 0} recordings indexed from ${state.archiveName}
- public lanes for proofs, music, video, WaveWarZ dashboards, Farcaster/Snapchain, governance, and IDE tutorials
- each session gets a quick "what could someone build from this?" angle

I also added a Farcaster Artist Scout idea: find under-discovered artists/builders who fit ZABAL lanes, explain the fit, and keep outreach human-reviewed.

Curious if this feels useful for ZABAL builders.`;
}

function renderArtistResults(payload) {
  if (!payload.connected) {
    artistScoutStatus.textContent = payload.message || "Farcaster backend is not connected yet.";
    artistResults.innerHTML = `
      <article class="artist-card">
        <div>
          <strong>Backend not connected</strong>
          <p class="summary">The scout UI is live, but Cloudflare needs a Neynar API key secret before it can search Farcaster. Once connected, this panel will return creator candidates, fit reasons, and invite copy.</p>
        </div>
      </article>
    `;
    return;
  }

  const candidates = payload.candidates || [];
  artistScoutStatus.textContent = candidates.length
    ? `Found ${candidates.length} human-review candidates from ${payload.source}.`
    : payload.message || "No candidates returned for this search.";

  artistResults.innerHTML = candidates.length
    ? candidates
        .map(
          (candidate, index) => `
            <article class="artist-card">
              <div class="artist-rank">${index + 1}</div>
              <div>
                <div class="artist-head">
                  ${candidate.pfpUrl ? `<img src="${escapeHtml(candidate.pfpUrl)}" alt="" />` : ""}
                  <div>
                    <h3>${escapeHtml(candidate.displayName)}</h3>
                    <a href="${escapeHtml(candidate.profileUrl)}" target="_blank" rel="noreferrer">@${escapeHtml(candidate.username)}</a>
                  </div>
                </div>
                <div class="meta">
                  <span class="chip">score ${escapeHtml(candidate.score)}</span>
                  <span class="chip">${escapeHtml(candidate.lane)}</span>
                  <span class="chip">${escapeHtml(candidate.followerCount)} followers</span>
                </div>
                <p class="summary">${escapeHtml(candidate.fitReason)}</p>
                <div class="sample-casts">
                  ${(candidate.sampleCasts || [])
                    .map(
                      (cast) => `
                        <a href="${escapeHtml(cast.url || candidate.profileUrl)}" target="_blank" rel="noreferrer">
                          ${escapeHtml(cast.text || "Open sample cast")}
                        </a>
                      `,
                    )
                    .join("")}
                </div>
                <button class="secondary-button copy-invite" data-invite="${escapeHtml(candidate.inviteCopy)}">Copy invite copy</button>
              </div>
            </article>
          `,
        )
        .join("")
    : `<article class="artist-card"><div><strong>No candidates yet</strong><p class="summary">Try a broader lane or search focus.</p></div></article>`;

  artistResults.querySelectorAll(".copy-invite").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.invite || "");
      button.textContent = "Copied";
    });
  });
}

async function runFarcasterArtistScout() {
  artistScoutStatus.textContent = "Running Farcaster scout pass...";
  artistResults.innerHTML = "";
  const params = new URLSearchParams({
    lane: artistLane.value,
    q: artistQuery.value.trim(),
  });
  const response = await fetch(`/api/artist-scout?${params.toString()}`);
  const payload = await response.json();
  renderArtistResults(payload);
}

function normalizeScout(scout, sourceMode = "custom") {
  if (!scout || !Array.isArray(scout.top_recordings)) {
    throw new Error('Scout JSON must include a "top_recordings" array.');
  }

  const laneCounts = new Map();
  for (const recording of scout.top_recordings) {
    recording.matched_lanes = Array.isArray(recording.matched_lanes) ? recording.matched_lanes : [];
    for (const lane of recording.matched_lanes) {
      if (!lane.lane) continue;
      laneCounts.set(lane.lane, (laneCounts.get(lane.lane) || 0) + 1);
    }
  }

  const lane_recommendations = Array.isArray(scout.lane_recommendations) && scout.lane_recommendations.length
    ? scout.lane_recommendations
    : [...laneCounts.entries()].map(([label, count]) => ({ label, count }));

  return {
    ...scout,
    source: {
      generated: scout.source?.generated || new Date().toISOString().slice(0, 10),
      count: scout.source?.count || scout.top_recordings.length,
      url: scout.source?.url || "",
      ...(scout.source || {}),
    },
    lane_recommendations,
    top_recordings: scout.top_recordings,
    sourceMode,
  };
}

function renderScout(statusText) {
  document.getElementById("sourceCount").textContent = `${state.scout.source.count} recordings checked`;
  document.getElementById("generatedAt").textContent = `${state.archiveName} - ${state.sourceMode}`;
  setupStatus.textContent = statusText;
  archiveName.value = state.archiveName;

  state.lane = "all";

  renderSummary();
  laneFilter.value = "all";
  renderRecordings();
}

async function loadScoutFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load JSON: ${response.status}`);
  return response.json();
}

async function loadDemoScout() {
  const scout = await loadScoutFromUrl(demoDataUrl);
  state.archiveName = "ZABAL public recordings demo";
  state.sourceMode = "demo dataset";
  state.scout = normalizeScout(scout, "demo dataset");
  renderScout("Loaded the built-in public ZABAL recordings demo.");
}

async function loadCustomScout() {
  const name = archiveName.value.trim() || "Custom archive";
  const pasted = archiveJson.value.trim();
  const url = archiveUrl.value.trim();

  if (!pasted && !url) {
    setupStatus.textContent = "Paste a JSON URL, paste JSON, or load the ZABAL demo.";
    return;
  }

  const scout = pasted ? JSON.parse(pasted) : await loadScoutFromUrl(url);
  state.archiveName = name;
  state.sourceMode = pasted ? "pasted JSON" : "public JSON URL";
  state.scout = normalizeScout(scout, state.sourceMode);
  renderScout(`Loaded ${name} from ${state.sourceMode}.`);
}

async function init() {
  archiveName.value = state.archiveName;
  archiveUrl.value = "https://zabalgamez.com/recordings/index.json";

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderRecordings();
  });

  laneFilter.addEventListener("change", (event) => {
    state.lane = event.target.value;
    renderRecordings();
  });

  copyBrief.addEventListener("click", async () => {
    await navigator.clipboard.writeText(buildBrief());
    copyBrief.textContent = "Brief copied";
  });

  runArtistScout.addEventListener("click", async () => {
    try {
      await runFarcasterArtistScout();
    } catch (error) {
      artistScoutStatus.textContent = error.message;
    }
  });

  loadDemo.addEventListener("click", async () => {
    try {
      await loadDemoScout();
    } catch (error) {
      setupStatus.textContent = error.message;
    }
  });

  loadCustom.addEventListener("click", async () => {
    try {
      await loadCustomScout();
    } catch (error) {
      setupStatus.textContent = error.message;
    }
  });

  await loadDemoScout();
}

init().catch((error) => {
  recordingList.innerHTML = `<article class="recording-card"><div></div><div><h3>Scout failed to load</h3><p class="summary">${error.message}</p></div></article>`;
});
