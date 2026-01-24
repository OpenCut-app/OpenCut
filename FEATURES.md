# OpenCut Features

A comprehensive list of all features currently implemented in the OpenCut video editor.

---

## Project Management

### Project Lifecycle
- Create, load, save, delete, rename, and duplicate projects
- Auto-save and manual save
- Project persistence via IndexedDB
- Automatic thumbnail generation for projects

### Project Configuration
- Canvas size customization with presets (16:9, 9:16, 1:1, 4:3) and custom dimensions
- FPS configuration (24, 25, 30, 60, 120 fps)
- Background color selection
- Background type: solid color or blur (intensity levels: 4, 8, 18)
- Aspect ratio auto-detection from first imported media

### Scenes
- Multiple scenes per project
- Scene creation, deletion, renaming, and switching
- Independent timelines per scene
- Main scene enforcement

---

## Timeline Editing

### Track Management
- Multi-track support (media, audio, text)
- Dynamic track addition and removal
- Automatic track ordering (text, media, audio)
- Track muting
- Main track enforcement

### Timeline Elements
- Media elements (video, audio, image)
- Text elements with full typography control
- Element trimming (start/end)
- Element duration and start time adjustment
- Single and multi-select
- Visibility toggle, deletion, and duplication

### Element Operations
- **Split**: Split element at playhead (keep left/right)
- **Audio separation**: Extract audio track from video
- **Trim**: Visual trim handles with feedback
- **Replace media**: Swap underlying media for a timeline element
- **Drag and reposition**: Move elements within and across tracks
- **Copy/Paste**: Clipboard support for elements

### Timeline Controls
- Ripple editing mode (toggle)
- Snapping with visual indicators (toggle)
- Multi-selection editing
- Context menus for elements
- Undo/Redo with history stack
- Overlap detection and resolution
- Timeline zoom (0.25x to 4x, 7 levels)
- Playhead scrubbing
- Frame-accurate editing
- Bookmarks/markers
- Layout guides (TikTok preset)

---

## Media Management

### Supported Formats
- **Video**: MP4, WebM, and standard video formats
- **Audio**: MP3, WAV, and standard audio formats
- **Images**: PNG, JPG, SVG, and standard image formats

### Media Library
- Import media files
- Media library with grid/list view modes
- Automatic video thumbnail generation
- Metadata extraction (duration, dimensions, FPS)
- Media search and filtering
- Object URL management and memory optimization
- Ephemeral media items (timeline-only, no library entry)

### Media Operations
- Add media to timeline via drag-and-drop or click
- Remove media from project (cascading deletion from timeline)
- Replace media assets
- Media-to-element linking

---

## Text & Captions

### Text Elements
- Add text elements to the timeline
- Inline text content editing
- Font selection (26+ font families)
- Font size (8-300px)
- Font weight (normal, bold)
- Font style (normal, italic)
- Text alignment (left, center, right)
- Text decoration (none, underline, line-through)
- Text color and background color
- Opacity control (0-100%)
- Position adjustment (x, y)
- Rotation (0-360 degrees)

### Auto-Captions
- Automatic audio transcription
- Language selection (English, Spanish, Italian, French, German, Portuguese, Russian, Japanese, Chinese)
- Zero-knowledge encryption for uploaded audio
- Word-based timing with segment grouping
- Automatic caption placement on timeline

---

## Audio

### Audio Management
- Multi-track audio mixing
- Element-level and track-level muting
- Audio trimming
- Audio separation from video
- Volume control

### Sound Effects (Freesound Integration)
- Search Freesound.org library
- Commercial license filtering
- Rating and download count filtering
- Pagination
- Sound preview playback
- Saved sounds library with persistence
- Add sound effects directly to timeline

### Playback Controls
- Play/Pause
- Seek (frame-step, jump, go-to start/end)
- Volume adjustment and mute toggle
- Playback speed control (0.1x to 2x)
- Real-time audio synchronization
- Frame-accurate playback

---

## Graphics & Stickers

- Iconify API integration (100,000+ icons)
- Search across categories (general, brands, emoji)
- Collection browsing
- Recent stickers tracking
- SVG to image conversion
- Automatic sizing (200x200px)
- Add stickers to timeline as media elements

---

## Preview & Rendering

### Real-Time Preview
- Canvas-based real-time preview
- Frame caching for performance
- Multi-layer composition
- Text and media element preview
- Layer visibility toggle

### Canvas Features
- Audio buffer waveform visualization
- Selection highlighting
- Grid alignment indicators
- Expandable preview mode

---

## Export

### Formats & Quality
- MP4 export
- WebM export
- Quality presets: low, medium, high, very high

### Export Options
- Include/exclude audio
- FPS-aware encoding
- Canvas size preservation
- Progress tracking
- Error handling and retry

### Technology
- MediaBunny integration for video encoding
- Web Audio API for audio mixing
- Canvas-based frame rendering
- Chunked processing for performance

---

## AI Engine (Short-Form Video Generation)

### Video Ingestion
- Multi-video upload (1-5 videos) with drag-and-drop
- Automatic metadata extraction (duration, dimensions, FPS, audio channels)
- Thumbnail generation
- Video validation (minimum 5 seconds, valid dimensions)

### Intelligent Chunking
- Configurable chunk duration (default 4s) with overlap (default 1s)
- Visual analysis: brightness, blur score, motion intensity, face detection
- Audio analysis: volume, peak volume, silence ratio, noise level
- Timecode generation

### AI-Powered Analysis (Gemini 2.0 Flash)
- Transcript extraction with confidence scoring
- Semantic topic identification with relevance scores
- Emotion categorization (neutral, excited, serious, humorous, inspirational, informative)
- Scene type classification (talking-head, b-roll, screen-capture, interview, transition)
- Energy scoring and visual quality assessment
- Filler content and silence detection
- Keyword extraction
- Heuristic fallback when API unavailable

### Smart Scoring & Selection
- Multi-factor scoring: relevance, quality, narrative continuity, energy, hook potential
- Configurable scoring weights
- Pruning with constraints (target duration, minimum core ideas, narrative gap limits)
- Prevents abrupt scene jumps

### Timeline Synthesis
- Automatic hook segment identification (high-energy opening)
- Closing segment selection (inspirational/high-energy ending)
- Smart segment ordering across multiple source videos
- Transition planning (cut, crossfade, zoom-in, zoom-out)

### Refinement & Export
- Aspect ratio reframing with subject tracking (9:16, 1:1, 4:5)
- Audio cleanup: noise reduction, filler word removal, loudness normalization (LUFS targeting), compression
- Automatic caption generation with keyword highlighting
- Configurable caption styling (font, size, color, position)
- Export preset support (default: TikTok/Reels 1080x1920@30fps)

### Pipeline Controls
- Real-time progress tracking with stage labels
- Configurable target duration (15-90 seconds)
- Abort/cancel support
- Error handling with retry

---

## Keyboard Shortcuts

### Default Bindings
| Action | Shortcut |
|--------|----------|
| Play/Pause | Space / K |
| Step back | J / Left Arrow |
| Step forward | L / Right Arrow |
| Jump back | Shift+Left |
| Jump forward | Shift+Right |
| Go to start | Home |
| Go to end | End |
| Split | S |
| Delete | Delete / Backspace |
| Undo | Ctrl+Z |
| Redo | Ctrl+Y / Ctrl+Shift+Z |
| Select all | Ctrl+A |
| Duplicate | Ctrl+D |
| Copy | Ctrl+C |
| Paste | Ctrl+V |
| Toggle snapping | N |

### Keybinding System
- Fully customizable keybindings
- Import/export keybinding configurations
- Conflict detection
- Recording mode for new bindings
- Persistent storage (localStorage)

---

## User Interface

### Panel Layout
- **Media Panel**: Library, sounds, stickers, text, captions, settings
- **Timeline Panel**: Multi-track canvas editor
- **Preview Panel**: Real-time video preview
- **Properties Panel**: Context-sensitive element properties
- Panel presets (default, media, inspector, vertical-preview)
- Resizable and collapsible panels

### Visual Features
- Snap indicators
- Selection boxes
- Waveform visualization
- Context menus
- Tooltips
- Progress indicators
- Loading states

---

## Storage & Persistence

- **IndexedDB**: Projects and structured data
- **OPFS** (Origin Private File System): Large media files
- **LocalStorage**: UI preferences, keybindings
- Transactional storage with error handling
- Browser compatibility detection

---

## Authentication

- User registration and login (Better Auth)
- Session and token management
- Auth state management
- Logout

---

## Privacy & Security

- Zero-knowledge encryption for transcription uploads
- Client-side video processing (no server-side rendering)
- Local-first data storage
- No watermarks on exports
- Privacy-first architecture

---

## Performance

- Frame caching system
- Off-screen canvas rendering
- Lazy loading for media assets
- Video cache management
- Object URL cleanup and memory optimization

---

## Integrations

| Service | Purpose |
|---------|---------|
| Freesound API | Sound effects search and download |
| Iconify API | Stickers and icons |
| Modal | Transcription service |
| Cloudflare R2 | Media uploads |
| Marble CMS | Blog/content integration |
| Databuddy | Anonymous analytics |
| Google Gemini API | AI video analysis for short-form generation |

---

## Platform Support

- Modern desktop web browsers
- Desktop application via Tauri (macOS, Windows, Linux)
- Responsive panel layout with resize handling
- Mobile detection
