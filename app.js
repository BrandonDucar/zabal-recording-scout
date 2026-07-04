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
  return `I turned the ZABAL recordings into a DreamNet scout board.

30 recordings checked.
28 map to Proof Drop / receipts.
24 map to Droid OS / agent identity.
24 map to IDE tutorials / vibe coding.
19 map to WaveWarZ dashboard ideas.
16 map to Farcaster / Snapchain.

The point: DreamNet can help ZABAL builders convert workshops into build prompts, receipts, dashboards, songs, videos, and agent-readable memory.

Live scout: ${location.href}`;
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
