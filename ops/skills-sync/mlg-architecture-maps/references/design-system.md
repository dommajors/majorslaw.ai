# MLG Diagram Design System

The visual language is consistent across every MLG architecture document so the diagrams read as one family. Use `assets/template.html` as the starting skeleton — it already contains all of this.

## Palette

```css
--bg:#0A101E;      --panel:#101A2E;   --panel2:#0D1526;  --line:#1D2B45;
--ink:#E4ECF7;     --muted:#7C8DB0;   --dim:#4A5A7A;
--core:#6FD3E7;    /* spine, cloud, structural — cyan */
--vault:#B98BF0;   /* OMEN-2, reads & drafts — violet */
--tower:#F0B15C;   /* OMEN-1, sends — amber */
--new:#4ADE9C;     /* new since last version — green */
--gate:#F07070;    /* human gate, open ruling, breach — red */
--interim:#F5A623; /* transitional, unconfirmed — orange */
--ring1:#5BA8F5;   --ring2:#4ADE9C;
```

**Color carries meaning, not decoration.** Red is a human gate, an open ruling, or a live exposure — nothing else. Green is new-since-last-version or a confirmed-good finding. Orange is transitional or unconfirmed. If a box is red, a reader should be able to ask "what decision does this need?" and get an answer.

## Type

- `Chakra Petch` — headings, device names, badges, labels. Letterspaced, uppercase for zone titles.
- `IBM Plex Sans` — all body text.
- `IBM Plex Mono` — hostnames, paths, counts, technical annotations.

Body 11–12.5px, annotations 10–10.5px, spec lines 9.5px. These read correctly at full-page zoom and survive being screenshotted into a deck.

## Components

| Class | For |
|---|---|
| `.zone` | A top-level section. Title + optional `.zone-note` + content |
| `.delta` | The "what changed" banner. Green. Always second, right after the header |
| `.stats` / `.stat` | Measured-state tiles. `.bad` `.warn` `.good` modifiers |
| `.rack` / `.device` | Physical machines. `.pending` for unconfirmed, `.unknown` for genuinely unidentified |
| `.sites` / `.site` / `.tunnel-col` | Multi-site topology with the link between them |
| `.cloudgrid` / `.cloud` | Services. `.spine` for core, `.interim` for phasing out, `.flag` for non-compliant, `.newx` for new |
| `.vlan-wrap` / `.vlan` | Callout strips under a zone. `.blocked` red, `.good` green |
| `.rings` / `.ring` / `.agent` | Agent roster columns. `.dim` for retire-recommended |
| `.ax` + `.t0`–`.t3`/`.tn` | Model tier badges |
| `.gate5` | The attorney gate. Always visually distinct |
| `table` | Ranked lists — failure domains especially |
| `.rulegrid` / `.rule` | Open rulings |

## Writing inside the diagram

**Full sentences in callouts, fragments in labels.** A device's role line is a fragment. A `.vlan` callout is prose — it is where the reasoning lives, and reasoning needs verbs.

**Quote the source when the point is that a document says something.** Italicized, in quotes. Especially for directive text a decision supersedes.

**Bold the operative clause, not the whole sentence.** One bold phrase per callout. If everything is bold, nothing is.

**Name the failure mode, not just the fact.** "A wrong root reports clean, which is the worst failure mode a daily agent has" beats "root path is incorrect." The reader needs to know why to care.

**Never use an em-dash where a period works.** These documents already run dense; short sentences are the relief.

## Layout

Max width 1560px. Zones stack vertically. Within a zone, flex-wrap grids with `min-width` floors so it degrades to fewer columns rather than crushing.

Render and look at it before delivering — a screenshot at 1560×1400 in slices catches wrapping failures that reading the HTML does not.
