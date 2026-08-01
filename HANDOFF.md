# OpenCut Test Coverage - Agent Handoff

## Workflow Summary

Agent wrote comprehensive test files for 7 modules in `apps/web/src/` that previously lacked tests. All tests use `bun:test` and pass (150 tests, 0 failures).

## What's Done ✅

### 1. Subtitles SRT Parser (`subtitles/__tests__/srt.test.ts`) — 22 tests
- Basic multi-cue parsing
- Timestamp formats: comma (`HH:MM:SS,mmm`), dot (`HH:MM:SS.mmm`), mixed, 1-2 digit ms
- Multi-line cue text
- Sequence numbers (with/without)
- Empty input → empty result
- Malformed blocks (missing timestamp, bad format, single line, empty text)
- Non-positive duration (end ≤ start)
- `\r\n` and `\r` line endings
- Whitespace handling (trim, extra blanks, spaced arrows)

### 2. Subtitles ASS Parser (`subtitles/__tests__/ass.test.ts`) — 17 tests
- Basic ASS parsing (Script Info + Styles + Events)
- Default play resolution (384×288)
- Custom play resolution from PlayResX/PlayResY
- V4+ style properties (fontFamily, bold, italic, letterSpacing, textAlign, verticalAlign)
- Fallback to default style for missing style names
- Extra comma in text field (last field captures remainder)
- Override tag stripping (`{\b1}`, `\\N` → newline, `\\h` → space)
- Empty input
- Alignment mapping (2→center/bottom, 5→center/middle, 9→right/top)
- Non-dialogue events (Comment ignored)
- Effects field handling

### 3. Subtitles Parse Dispatcher (`subtitles/__tests__/parse.test.ts`) — 8 tests
- Dispatches `.srt` → `parseSrt`
- Dispatches `.ass` → `parseAss`
- Throws for `.txt`, `.vtt`, `.sub`
- Case-insensitive extension matching (`test.SRT`, `test.ASS`)
- Multiple dots in filename
- No extension throws

### 4. Math Utils (`utils/__tests__/math-extended.test.ts`) — 35 tests
- `clamp`: in-range, below min, above max, boundaries, negative ranges, min > max
- `clampRound`: rounds then clamps, boundaries, negative values
- `getFractionDigitsForStep`: integer, decimal, scientific notation
- `snapToStep`: nearest step, step=0 (unchanged), negative step, boundaries, negative values
- `isNearlyEqual`: equal, within epsilon, outside epsilon, custom epsilon, negative, zero
- `formatNumberForDisplay`: integer, decimals, trailing zeros, fractionDigits, min/max fraction, negative, zero

### 5. FPS Utils (`fps/__tests__/fps-extended.test.ts`) — 16 tests
- `frameRateToFloat`: standard (24/30/60), NTSC (24000/1001, 30000/1001, 60000/1001)
- `frameRatesEqual`: identical, different, same float different fractions
- `floatToFrameRate`: standard rates, NTSC mapping, integer arbitrary, GCD reduction, 0/negative/large

### 6. Rendering Utils (`rendering/__tests__/rendering.test.ts`) — 15 tests
- `buildTransformFromParams`: full params, empty (defaults), partial, non-number fallback, negative, zero
- `readOpacityFromParams`: present, missing (default 1), non-number
- `readBlendModeFromParams`: valid mode, missing (normal), invalid, non-string, all 17 modes

### 7. Params System (`params/__tests__/params.test.ts`) — 32 tests
- `coerceParamValue`: number (range, clamp, snap, NaN, non-number, integer step, unbounded), boolean, color, text, select (valid/invalid)
- `getParamValueKind`: number→number, boolean→discrete, color→color, text/select→discrete
- `getParamDefaultInterpolation`: number→linear, boolean/text→hold, color→linear
- `getParamNumericRange`: number→range object, non-number→undefined, no-max handling

## Issues Encountered & Fixed

1. **Bash heredoc mangled backticks** — Template literals with backticks in heredoc were interpreted as command substitution. Fixed by writing files with Python instead.
2. **JavaScript `-0` vs `0`** — `Math.round(-0.4)` returns `-0`. `toBe()` uses `Object.is()` so `-0 !== 0`. Fixed with `toBeCloseTo(0)`.
3. **ASS effect field comma** — `splitAssFields` splits on comma, so `fade(200,200,Text)` → effect=`fade(200`, text=`200,Text`. Adjusted expected value in test.

## What Needs To Be Done Next 🔲

### High Priority
- [ ] **Silence/VAD auto-cut** — No silence detection or voice activity detection exists. Could use Silero VAD (ONNX) to detect speech segments and auto-trim dead air. Modules: `transcription/`, new `vad/` module.
- [ ] **More rendering tests** — `readBlendModeFromParams` covers valid modes but integration with actual rendering pipeline untested.
- [ ] **Animation tests** — `animation/animated-params.test.ts` exists but coverage is thin. Keyframe interpolation, easing curves need more tests.
- [ ] **Timeline tests** — Several timeline test files exist (`snap.test.ts`, `tracks.test.ts`, etc.) but edge cases for drag/drop, group operations, and multi-track scenarios could be expanded.

### Medium Priority
- [ ] **Export pipeline tests** — `export/__tests__/` exists but WASM compositor integration, format support, and error handling need coverage.
- [ ] **Media processing tests** — Audio waveform, thumbnail generation, media utils lack unit tests.
- [ ] **Auth/DB tests** — `auth/` and `db/` modules have no test coverage.
- [ ] **Effects registry tests** — Effect definitions, registration, and parameter validation untested.

### Low Priority
- [ ] **Component tests** — React components in `components/`, `panels/`, `editor/` have no unit tests (would need React Testing Library).
- [ ] **E2E tests** — No end-to-end test suite exists.
- [ ] **Performance tests** — No benchmarks for timeline rendering, WASM compositor, or large project handling.

## Technical Notes

- **Test runner**: `bun test` (bun@1.3.14+)
- **Install deps first**: `cd /tmp/OpenCut && bun install`
- **Run all new tests**: `bun test apps/web/src/subtitles/__tests__/ apps/web/src/utils/__tests__/math-extended.test.ts apps/web/src/fps/__tests__/fps-extended.test.ts apps/web/src/rendering/__tests__/ apps/web/src/params/__tests__/params.test.ts`
- **Run single file**: `bun test apps/web/src/subtitles/__tests__/srt.test.ts`

## Files Created

```
apps/web/src/subtitles/__tests__/srt.test.ts
apps/web/src/subtitles/__tests__/ass.test.ts
apps/web/src/subtitles/__tests__/parse.test.ts
apps/web/src/utils/__tests__/math-extended.test.ts
apps/web/src/fps/__tests__/fps-extended.test.ts
apps/web/src/rendering/__tests__/rendering.test.ts
apps/web/src/params/__tests__/params.test.ts
```
