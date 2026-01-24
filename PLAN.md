# PLAN: AI-Driven Short-Form Video Engine

This document describes what we are building, why it matters, and how the system works end‑to‑end. It expands the original outline into concrete scope, workflows, and deliverables.

## 1) Goal & Non‑Goals

### Goal
Create an AI system that turns 3–5 long/medium‑form source videos into a single, high‑impact short‑form clip that feels professionally edited (tight pacing, coherent story, clean visuals/audio) without manual timeline work.

### Primary success criteria
- Output is **coherent** (no jarring context jumps).
- Pacing feels **intentional** and **on‑brand**.
- Video is **platform‑ready** (vertical 9:16, high audio quality, clean framing).

### Non‑goals (initial scope)
- Full replacement of human editors for complex cinematic edits.
- Long‑form video generation or full‑length episode assembly.
- Real‑time editing while streaming.

## 2) End‑to‑End Pipeline (What Exactly Happens)

### A. Input & ingestion
- User uploads 3–5 videos (e.g., talking head, B‑roll, screen recordings).
- System normalizes formats (resolution, fps, audio channels).
- Media is indexed for frame‑accurate access.

### B. Temporal chunking
- Videos are split into short, overlapping segments (e.g., 2–6 seconds).
- Each chunk is annotated with timecodes and basic visual/audio stats.

### C. Parallel extraction (Gemini / VLM)
- Multiple model instances analyze chunks in parallel to produce time‑series metadata:
  - Transcript + semantic topics
  - Emotion/energy score
  - Visual quality (blur, exposure, framing)
  - Speaking confidence and silence detection
  - Scene/shot type (talking head, B‑roll, screen capture)

### D. Pruning & scoring
- Each chunk receives a composite score (relevance + quality + narrative continuity).
- Low‑value segments are removed (rambling, filler, blurry, repeated points).
- Hard constraints enforced:
  - Keep at least one “core idea” segment.
  - Avoid abrupt narrative jumps across adjacent clips.

### E. Synthesis (edit construction)
- Surviving chunks are stitched into a single timeline.
- Apply rhythm rules for short‑form (fast cuts, clear hook, strong finish).
- Insert transitions where context shifts (subtle zoom/cut beats, not over‑stylized).

### F. Refinement & finishing
- Auto‑reframe to 9:16 with subject tracking.
- Audio cleanup (noise removal, filler word trimming, leveling).
- Optional stylization layer (user brand DNA, LUTs, captions).
- Export with platform‑ready presets.

## 3) Feature Set (Detailed)

### 3.1 AI analysis & contextual logic
| Feature | Description | Output |
| --- | --- | --- |
| Context Retrieval | VLM/LLM extraction of story beats and talking points. | Time‑series semantic graph |
| Source Layering | Understands and prioritizes different sources (A‑roll, B‑roll, screen). | Ranked source map |
| Visual Quality Filter | Detects blur, low‑light, shaky footage. | Exclusion flags |
| Auto‑Reframe | Subject tracking to keep faces centered in vertical crop. | 9:16 safe framing |

### 3.2 Personalization & style mimicry
- Social ingestion: analyze user’s Instagram/TikTok/YouTube style.
- Style extraction: pacing, transitions, color, caption style.
- Style replication: apply extracted “edit DNA” consistently.
- Copy Reference: user supplies a full reference video; system learns its pacing, transitions, color grade, caption style, and motion rhythm, then applies that style to edits built from the user’s raw clips.

### 3.3 Audio & voice interface
- Voice‑based edit controls ("shorter intro", "make it punchier").
- Filler word removal (umm/like/ah).
- High‑fidelity enhancement (EQ, compression, loudness normalization).
- Noise suppression and room echo reduction.

### 3.4 Visual refinement
- Facial enhancement / photogenic filter (light touch, no uncanny shifts).
- Background cleanup/removal for noisy environments.
- Captions with emphasis styling (keywords highlighted).

## 4) Product Surfaces

### Web platform (primary)
- Upload large files.
- Review AI‑generated cut with minimal timeline controls.
- Approve and export.

### Mobile app (secondary)
- Review and share edits on‑the‑go.
- Light tweaks: trim, caption edits, export to social.

## 5) Data & Model Assumptions

### Required metadata density
The success of “parallel Gemini” depends on **granular time‑series data**. If metadata is sparse, edits feel choppy. Therefore we must:
- Maintain short chunk sizes with overlap.
- Capture high‑resolution semantic labels per chunk.

### Storage expectations
- Raw media + derived metadata (embeddings, transcripts, scores).
- Fast time‑based retrieval (for instant previews and edits).

## 6) Key Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Messy or incoherent edits | High | Hard constraints on narrative continuity; chunk overlap; minimum context windows |
| Over‑pruning | Medium | Keep at least one segment per topic cluster |
| Style mismatch | Medium | Optional user style profiles; allow fallback to neutral style |
| Audio artifacts | Medium | Multi‑stage cleanup + loudness target |

## 7) MVP Deliverables (What “Done” Looks Like)

1. Upload 3–5 videos via web UI.
2. AI generates a 30–90s short with:
   - Clean transcript + captions
   - Vertical framing
   - Minimal jarring cuts
3. User can approve and export.

## 8) Next Build Milestones

- M1: Ingestion + chunking + transcript extraction.
- M2: Parallel analysis + scoring system.
- M3: Synthesis engine (auto‑edit assembly).
- M4: Auto‑reframe + audio polish.
- M5: Style mimicry + social profile ingestion.
