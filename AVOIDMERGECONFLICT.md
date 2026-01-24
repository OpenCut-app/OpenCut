# Avoid Merge Conflicts Plan

## Merge Order (top priority)
1. Jaden → core logic first
2. Eric → tool extensions + voice input + UI
3. Sho → UI integration last

## Assignments

### Sho — Single-Page Short Editor UI
**Goal:** Build the single-page flow and minimal UI without touching core logic.

**Tasks**
- Create the **single-page experience**: Upload → Auto-Edit → Fine-Tune → Export.
- Build **transcript editor UI** + scroll sync to preview.
- Add **vertical preview** defaults and a clear **Export** call-to-action.
- Wire UI to existing APIs/hooks; no deep timeline logic edits.

**Reference**
- WHATISMISSING.md
  - “Hackathon flow alignment”
  - “Winning polish”
- STEP2.md
  - Core flow + minimal UI focus

**Primary files**
- apps/web/src/app/<new-page>/page.tsx
- apps/web/src/components/editor/* (new UI only)
- apps/web/src/components/ui/* (new reusable widgets)
- apps/web/src/app/globals.css (only if needed)

---

### Eric — Agentic Tools + Voice Input
**Goal:** Extend toolset and add voice-driven commands, bounded to selected clip.

**Tasks**
- Add **voice input** (speech → command) in agentic UI.
- Extend **tool definitions/executor** for concrete edits: cut ranges, remove segments, reorder, tighten.
- Ensure tools only operate on **user-selected clip** (bounded editing).
- Implement the **agentic UI updates** needed for new tools + audio input.

**Reference**
- WHATISMISSING.md
  - “Agentic editing capability”
  - “Audio input editing”
- STEP2.md
  - “Bounded agentic editing”

**Primary files**
- apps/web/src/lib/ai-chat/*
- apps/web/src/stores/ai-chat-store.ts
- apps/web/src/app/api/ai-chat/route.ts

---

### Jaden — Transcript-Driven Timeline + Auto-Stitching
**Goal:** Core logic for transcript merging and timeline edits.

**Tasks**
- Build **merged transcript** across clips.
- Implement **auto-stitching** (silence trimming, filler removal, jump cuts).
- Create **text → timeline mapping** so editing text updates the timeline.
- Support **multi-draft generation** (tight / balanced / loose) if time allows.

**Reference**
- WHATISMISSING.md
  - “Transcript-driven timeline edits”
  - “Multi-draft generation”
  - “Winning polish” (sync + instant preview)
- STEP2.md
  - “Transcript-driven timeline”
  - “Multi-draft generation”

**Primary files**
- apps/web/src/lib/*
- apps/web/src/stores/*
- apps/web/src/types/*

---

This order ensures UI wires into stable APIs and avoids file overlap.
