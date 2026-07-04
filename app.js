const state = {
  scout: null,
  query: "",
  lane: "all",
};

const laneSummary = document.getElementById("laneSummary");
const laneFilter = document.getElementById("laneFilter");
const recordingList = document.getElementById("recordingList");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const copyBrief = document.getElementById("copyBrief");
const copyArtistBrief = document.getElementById("copyArtistBrief");

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
              <span class="chip">${shortDate(recording.date)}</span>
              <span class="chip">${recording.track || "mixed"}</span>
              <span class="chip">${recording.presenter || "unknown"}${recording.org ? ` / ${recording.org}` : ""}</span>
            </div>
            <h3>${recording.title}</h3>
            <div class="meta">
              ${recording.matched_lanes
                .slice(0, 5)
                .map((lane) => `<span class="lane-chip">${publicLane(lane.lane)}</span>`)
                .join("")}
            </div>
            <p class="summary">${recording.summary || "No summary provided."}</p>
            <div class="actions">
              ${recording.page ? `<a href="${recording.page}" target="_blank" rel="noreferrer">Recording</a>` : ""}
              ${recording.youtube ? `<a href="${recording.youtube}" target="_blank" rel="noreferrer">YouTube</a>` : ""}
              ${recording.transcript_raw ? `<a href="${recording.transcript_raw}" target="_blank" rel="noreferrer">Transcript</a>` : ""}
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

It helps builders search the workshop archive, filter by lane, open recordings/transcripts, and turn sessions into July build ideas.

Current snapshot:
- 30 recordings indexed
- public lanes for proofs, music, video, WaveWarZ dashboards, Farcaster/Snapchain, governance, and IDE tutorials
- each session gets a quick "what could someone build from this?" angle

I also added a Farcaster Artist Scout idea: find under-discovered artists/builders who fit ZABAL lanes, explain the fit, and keep outreach human-reviewed.

Curious if this feels useful for ZABAL builders.`;
}

function buildArtistBrief() {
  return `Farcaster Artist Scout idea for ZABAL:

Use public Farcaster activity to find under-discovered artists, musicians, video makers, game builders, and culture people who could fit ZABAL Gamez.

For each candidate, produce:
- creator handle and public link
- what they make
- which ZABAL lane they fit
- why they might care
- suggested build prompt
- human-reviewed invite copy

Rules:
- no bulk outreach
- no fake praise
- no auto-raids
- no low-context tagging
- keep it opt-in and useful

Goal: help ZABAL discover new creators before they are obvious, then invite the right people into July build month.`;
}

async function init() {
  const response = await fetch("./data/scout.json");
  state.scout = await response.json();

  document.getElementById("sourceCount").textContent = `${state.scout.source.count} recordings checked`;
  document.getElementById("generatedAt").textContent = `Source generated ${state.scout.source.generated}`;

  renderSummary();
  renderRecordings();

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

  copyArtistBrief.addEventListener("click", async () => {
    await navigator.clipboard.writeText(buildArtistBrief());
    copyArtistBrief.textContent = "Artist plan copied";
  });
}

init().catch((error) => {
  recordingList.innerHTML = `<article class="recording-card"><div></div><div><h3>Scout failed to load</h3><p class="summary">${error.message}</p></div></article>`;
});
