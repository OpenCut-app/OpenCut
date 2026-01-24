# SPEC: Semantic Clip Retrieval & Reference-Guided Short Editor (Updated Plan)

## 1) Core Architecture & Pipeline
The system must prioritize accurate content indexing and retrieval to ensure selected clips are contextually strong before editing begins. Selecting the wrong moment is the primary failure state to avoid.

**Input**
- User uploads or connects a content bank consisting of long-form videos, old shorts, podcasts, or raw clips.

**Processing**
1. **Ingestion & Normalization (Server-Side)**
   - Transcode videos into lightweight proxies and extract audio for fast downstream processing.
2. **Transcript Generation (Audio First)**
   - Generate word-level timestamped transcripts for all content.
3. **Semantic Chunking (Transcript-Based)**
   - Split videos into meaning-based segments using pauses, punctuation, and sentence boundaries.
   - Start with transcript-only boundaries; add visual refinement later if needed.
4. **Visual Context Extraction (VLM, Video Input)**
   - For each transcript-derived segment, send the actual video clip to a VLM
     to produce visual summaries, tags, and action descriptions.
   - No separate OCR pass initially.
5. **Embedding & Indexing (Hybrid Search)**
   - Convert each segment into vector embeddings and index alongside metadata
     using both vector search and full-text search for fast retrieval.
6. **Semantic Retrieval**
   - Natural-language queries retrieve ranked, high-signal moments across the entire content bank.
7. **Clip Selection**
   - User selects a single clip or time window to edit.
8. **Editing Synthesis**
   - AI edits the selected clip into a short using agentic commands and optional reference-style constraints.

## 2) Feature Set

### Content Discovery & Retrieval
| Feature | Description |
| --- | --- |
| Semantic Clip Search (Hybrid) | Natural-language search over the creator’s entire content bank using hybrid vector + text retrieval to find relevant moments (e.g. “clips where I mention crypto”). |
| Timestamped Moment Retrieval | Returns exact timestamps within long videos, with previews and transcript highlights. |
| Context Window Expansion | Automatically expands candidate results to include surrounding context for coherent clip selection. |
| Quality-Aware Ranking | Downranks clips with poor audio, low face presence, or visual blur to avoid unusable moments. (Visual quality comes from VLM + lightweight heuristics.) |

### Agentic Editing & Control
| Feature | Description |
| --- | --- |
| Bounded Agentic Editing | AI edits only the user-selected clip, preventing unpredictable or messy full-video edits. |
| Prompt-Based Editing | Users modify edits via natural language (e.g. “make this tighter,” “cut pauses,” “turn this into a 30s short”). |
| Transcript-Driven Timeline | Edits are driven by semantic and transcript structure rather than raw timestamps. |
| Multi-Draft Generation | Optionally generate multiple pacing variants (tight, balanced, loose) from the same clip. |

### Reference-Guided Style Assembly
| Feature | Description |
| --- | --- |
| Reference Video Input | User provides a reference short or full video to guide style. |
| Style Signal Extraction | Analyze pacing, cut frequency, silence tolerance, caption cadence, and framing patterns from the reference. |
| Style Constraint Application | Apply extracted structural constraints when assembling the user’s clip without copying content or visuals. |
| Reusable Style Profiles | Reference styles can be saved and reused across multiple edits. |

## Note
The success of the system depends on semantic chunk quality and retrieval accuracy. If content indexing is shallow or context windows are poorly constructed, users will select weak moments, resulting in low-quality shorts regardless of editing sophistication.

## Future Implementation: Hybrid Context Extraction & Storage
This section documents the planned hybrid approach to improve accuracy for visually driven or low-speech content.

### Hybrid Segmentation
- Start with transcript-based segments for stable idea boundaries.
- Add visual refinement using shot/scene detection to split or merge segments where visuals change rapidly.
- Introduce silence-aware fallbacks to create visual-only segments when speech is sparse.

### Hybrid Context Extraction
- Run a VLM on short video clips per segment to produce visual summaries, tags, and action descriptions.
- Optionally add OCR if exact on-screen text search becomes a frequent request.
- Combine transcript + visual summaries into a single semantic record per segment.

### Hybrid Storage & Indexing
- Store both transcript-derived fields and VLM-derived fields in the same segment record.
- Build hybrid retrieval: full-text search across transcript + visual summaries and vector search over the combined semantic text.
- Maintain incremental indexing so segments become searchable as soon as either transcript or visual context is available.
