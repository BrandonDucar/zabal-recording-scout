# ZABAL Recording Scout

Public scout page for the ZABAL Gamez recording library.

The app turns the ZABAL workshop index into a builder-facing opportunity board:

- onboarding for demo, public JSON URL, or pasted JSON,
- top relevant sessions,
- lane matching,
- action recommendations,
- direct links to recordings, YouTube, and transcripts.
- a human-reviewed Farcaster artist scout concept for creator discovery.

This is a public-safe standalone concept. It does not include private runtime, signer, memory, automation, or proprietary orchestration internals.

## Live Purpose

The scout helps ZABAL builders decide what to watch, why it matters, and what kind of artifact it could help them ship during July build month.

It maps workshops into practical lanes:

- Proof Drop / receipts
- music
- Remotion / video
- Farcaster / Snapchain
- agent identity
- WaveWarZ / dashboard
- ZAO governance / Fractal
- IDE tutorials / vibe coding

## Farcaster Artist Scout

The app also includes a live Farcaster discovery panel for finding under-discovered artists, musicians, video makers, game builders, and culture people who could fit ZABAL lanes.

This stays human-reviewed: the scout suggests candidates, fit reasons, sample casts, and invite copy, but does not perform bulk outreach or automated engagement.

The Cloudflare Pages Function lives at:

```text
functions/api/artist-scout.js
```

It uses Neynar's public cast search endpoint when one of these Cloudflare secrets is configured:

```text
NEYNAR_API_KEY
GHOSTMINTOPS_NEYNAR_API_KEY
NEYCLAW_NEYNAR_API_KEY
```

## Source

The current public dataset is generated from:

```text
https://zabalgamez.com/recordings/index.json
```

That source currently populates the bundled 30-recording demo. Users can also load a different compatible scout JSON from the onboarding panel.

The bundled snapshot lives at:

```text
data/scout.json
```

## Live URL

```text
https://dreamnet-zabal-scout.pages.dev/
```
