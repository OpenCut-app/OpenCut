# Still Missing (AS OF Jan 24, 6:38 PM)

1. **Agentic editing capability (not properly implemented yet)**
   - AI should only edit the user-selected clip, not the whole video.
   - Tools for concrete edits (cut ranges, remove segments, reorder, tighten).
   - UI/UX needs improvement to feel instant and “notes-like.”
2. **Audio input editing**
   - Voice commands to drive the same edit tools as text input.
   - Requires reliable speech-to-command parsing and confirmation UX.
2. **Transcript-driven timeline edits**
   - Edits should be driven by transcript structure (remove pauses, tighten, reorder).
3. **Multi-draft generation**
   - Tight / Balanced / Loose variants from the same clip.
4. **Reference-guided style assembly**
   - Extract pacing/cadence from a reference clip and apply as constraints.
5. **Reusable style profiles**
   - Save extracted style constraints and reapply later.
6. **Context window expansion in UI**
   - Backend supports it, UI doesn’t expose it yet.
7. **Tests / observability**
   - Minimal tests for chunking, indexing, search parsing, and error handling.
8. **Hackathon flow alignment**
   - Single-page “Upload → Auto-Edit → Fine-Tune → Export” experience.
   - Merged transcript across clips for script-driven editing.
   - Auto-stitching tuned for talking-head cohesion.
   - Social-ready vertical preview as default.
9. **Winning polish**
   - Clean, cohesive transcript merge (single script view).
   - Precise text-to-timeline sync for perfect lip-sync.
   - Instant preview when scrubbing or editing transcript.
   - Auto silence trimming + filler removal for cohesion.
   - Clear, fast export for 9:16 vertical output.

---

## Hackathon Guidelines

### What We’re Looking For

A single page video editor for short talking-head content (Reels, TikTok, Shorts). Think **Adobe Premiere power** with **iPhone Notes simplicity**.

- Upload **3–5 short form video clips**
- Automatically assemble a **cohesive**, good-looking first cut
- Provide a **minimal UI** for quick fine-tuning

### Core Functionality

These are the essentials, the foundation your project should cover:

| Component | What It Should Do |
| --- | --- |
| **Upload & Import** | Drag-and-drop 3–5 short video clips (MOV/MP4) |
| **Transcript Generation** | Auto-extract and merge a clean transcript from all clips |
| **Timeline Auto-Stitching** | Auto-construct a first cut with natural flow |
| **Script-Driven Editing** | Change the text → change the video |
| **Manual Controls** | Drag clips, reorder, trim, adjust transitions |
| **Social-Ready Preview** | Vertical video output (Reels/TikTok/Shorts-ready) |

### Take It Further

This is where you make it yours. Some ideas to spark creativity:

- Subtitles automatically synced
- Jump-cut smoothing + reframing
- Voice cleanup (noise reduction, loudness leveling)

### The Bar

Your app needs to nail two things:

1. **Cohesion of Speech:** Multiple clips should feel like one clean take
2. **Clarity of Delivery:** Perfect lip-sync, clean transcript, seamless edits

Editing should feel like editing text. The video just follows.

### The Flow

A clear, functional single-page experience:

**Upload → Auto-Edit → Fine-Tune → Export**

Use whatever stack you want. It just needs to work reliably end-to-end.

### The Test

It will be room based judging where your team pitches your product to a panel of judges who will evaluate and score based on functionality, creativity, and adherence to the set requirements.

The six highest scoring entries will move on to the next stage, where we have 3 real Stanley Creators evaluate the finalists by:

1. Upload their raw talking head clips
2. Edit a short video using your tool
3. Rate the experience

We will select the winner based on:

- How much they **liked the user experience**
- How likely they’d use this editor again

The submission that **Creators love the most** wins.
