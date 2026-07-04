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
          <span>${lane.label}</span>
        </article>
      `,
    )
    .join("");

  laneFilter.innerHTML = `
    <option value="all">All lanes</option>
    ${state.scout.lane_recommendations.map((lane) => `<option value="${lane.label}">${lane.label}</option>`).join("")}
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
                .map((lane) => `<span class="lane-chip">${lane.lane}</span>`)
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
  return `Had an idea for making the ZABAL recording archive easier for builders to use.

What if the archive also had a scout layer: search, lane filters, direct recording/YouTube/transcript links, and build prompts for July builders?

I mocked up a first pass:
${location.href}

Current snapshot:
- 30 recordings indexed
- lanes for receipts/Proof Drop, music, video, WaveWarZ dashboards, Farcaster/Snapchain, governance, and IDE tutorials
- each session gets a quick "what could someone build from this?" angle

Curious if this direction feels useful as a lightweight archive upgrade for ZABAL.`;
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
}

init().catch((error) => {
  recordingList.innerHTML = `<article class="recording-card"><div></div><div><h3>Scout failed to load</h3><p class="summary">${error.message}</p></div></article>`;
});
