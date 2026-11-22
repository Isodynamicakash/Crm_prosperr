# Landing page media plan

The landing page is designed to use five short AI-generated clips as **atmosphere**. Product functionality is never shown in footage. It is always shown with real React components (`src/components/landing/previews.tsx`).

**Status: none of these clips exists yet.** Every entry in `src/lib/media/manifest.ts` has `sources: null`, so the page draws a branded, text-free fallback scene in its place. The site is complete without the footage. Each clip, once generated, upgrades one slot.

## Rules for every clip

- No text, captions, UI, screens with readable content, logos (Prosperr or anyone else's), or watermarks in the frame.
- No fabricated customers, testimonials or named companies.
- People are generic professionals with natural movement. No identifiable real people.
- Look: natural cinematic light, shallow depth of field, slow camera movement (dolly or slider, no fast cuts), a subtle forest-green grade (shadows toward `#063F1A`, highlights neutral), and a small lime `#8BC34A` accent where it fits naturally (plants, glass reflections, a jacket).
- The clip must loop without a visible jump: match the first and last second, or use a cross-dissolve in the edit.
- Silent. Strip the audio track at export.

## Export settings

| | Desktop | Mobile |
|---|---|---|
| MP4 | H.264, 1920×1080 (or the aspect below), CRF 23, `-preset veryfast`, `-movflags +faststart`, no audio | 720 wide, CRF 26 |
| WebM | VP9, CRF 34, `-b:v 0`, no audio | 720 wide, CRF 38 |
| Poster | First frame as WebP, quality 80 | same |
| Target size | ≤ 4 MB hero, ≤ 2 MB others | ≤ 1.2 MB |

Example:
```bash
ffmpeg -i hero-office.mov -an -vf scale=1920:-2 -c:v libx264 -crf 23 -preset veryfast -movflags +faststart public/media/hero-office-1080.mp4
ffmpeg -i hero-office.mov -an -vf scale=1920:-2 -c:v libvpx-vp9 -crf 34 -b:v 0 public/media/hero-office-1080.webm
ffmpeg -i hero-office.mov -an -vf scale=720:-2 -c:v libx264 -crf 26 -preset veryfast -movflags +faststart public/media/hero-office-720.mp4
ffmpeg -ss 0 -i hero-office.mov -frames:v 1 -vf scale=1920:-2 -q:v 80 public/media/posters/hero-office.webp
```

Then fill the clip's entry in `manifest.ts`, for example:
```ts
poster: '/media/posters/hero-office.webp',
sources: { desktop: { mp4: '/media/hero-office-1080.mp4', webm: '/media/hero-office-1080.webm' }, mobile: { mp4: '/media/hero-office-720.mp4' } },
```

## How playback behaves (already built in `CinematicMedia.tsx`)

- `muted`, `loop`, `playsInline`, never any audio.
- The hero loads eagerly. Every other clip is `preload="none"`, gets its `<source>` only within 200 px of the viewport, and pauses when off screen, so two large files never download at once.
- The mobile source is used below 768 px.
- With `prefers-reduced-motion`, the clip never plays: the poster is shown, or the static fallback scene if there is no poster.

---

## Clips

### 1. Corporate hero
| | |
|---|---|
| Manifest key | `hero` |
| Files to produce | `hero-office-1080.mp4`, `hero-office-1080.webm`, `hero-office-720.mp4`, `posters/hero-office.webp` |
| Section | 1 · Cinematic hero (full-viewport background) |
| Duration | 8 s loop |
| Aspect | 16:9 desktop. For mobile, also export a 9:16 centre crop if the subject allows. |
| Desktop / mobile | Both. Mobile uses the 720 file. |

**Prompt**
> Slow cinematic dolly shot through a modern glass-walled office in late afternoon light. In the soft-focus background, small groups of professionals in smart-casual clothes collaborate around a table and look at laptops; one person gestures while explaining, another nods. Floor-to-ceiling windows, indoor plants, warm natural light with long soft shadows. Shallow depth of field, 35mm lens look, subtle deep forest-green colour grade, calm and confident mood. No text, no logos, no readable screens. Seamless loop, 8 seconds, 24fps.

Keep the left 55% of the frame darker and calmer, because the headline sits there over a dark gradient.

### 2. BDR prospect research
| | |
|---|---|
| Manifest key | `research` |
| Files | `bdr-research-1080.mp4/.webm`, `bdr-research-720.mp4`, `posters/bdr-research.webp` |
| Section | 6 · Video showcase (tall tile) |
| Duration | 6 s loop |
| Aspect | 4:5 |
| Desktop / mobile | Both |

**Prompt**
> Close, over-the-shoulder shot of a young sales professional with a headset researching on a laptop at a tidy desk, scrolling and making a short note in a notebook. The laptop screen is softly out of focus and shows only abstract shapes, no readable text. Morning light from a side window, a green plant in the foreground blur, subtle forest-green grade. Calm and focused. Slow push-in. No logos, no text. 6 seconds, seamless loop.

### 3. Sales meeting
| | |
|---|---|
| Manifest key | `meeting` |
| Files | `sales-meeting-1080.mp4/.webm`, `sales-meeting-720.mp4`, `posters/sales-meeting.webp` |
| Section | 6 · Video showcase |
| Duration | 6 s loop |
| Aspect | 4:5 |
| Desktop / mobile | Both |

**Prompt**
> A small meeting room with a glass wall. An account executive presents to two client stakeholders across a table; they listen, one leans forward with interest. Natural window light, soft reflections on the glass, shallow depth of field, slow lateral slider move. Professional, warm, trustworthy mood, subtle forest-green grade. No screens with readable content, no text, no logos. 6 seconds, seamless loop.

### 4. Data intelligence
| | |
|---|---|
| Manifest key | `data` |
| Files | `data-intelligence-1080.mp4/.webm`, `data-intelligence-720.mp4`, `posters/data-intelligence.webp` |
| Section | 6 · Video showcase (wide tile) |
| Duration | 6 s loop |
| Aspect | 16:9 |
| Desktop / mobile | Both |

**Prompt**
> Abstract macro visualisation of data as light: thin glowing lime-green lines flow and converge across a deep forest-green to near-black background, with tiny particles drifting along them and a soft bokeh grid of points behind. Elegant, slow, premium, no numbers, no text, no UI elements. Gentle camera drift. 6 seconds, seamless loop.

### 5. Executive analytics and growth
| | |
|---|---|
| Manifest key | `growth` |
| Files | `executive-growth-1080.mp4/.webm`, `executive-growth-720.mp4`, `posters/executive-growth.webp` |
| Section | 6 · Video showcase |
| Duration | 6 s loop |
| Aspect | 16:9 |
| Desktop / mobile | Desktop. Mobile can use the poster only, to save data. |

**Prompt**
> Two senior leaders stand in a modern boardroom in front of a large wall display that shows only soft, abstract rising light bars (no numbers, no text). One points toward the display; the other nods thoughtfully. Evening city light through windows, cinematic contrast, subtle forest-green and navy grade. Confident, forward-looking mood. Slow dolly-in. No logos, no readable content. 6 seconds, seamless loop.

---

## Checklist before publishing a clip

- [ ] No readable text, logos or brand marks anywhere in the frame (check every second)
- [ ] Hands, faces and motion look natural; reject clips with artefacts
- [ ] Loops cleanly
- [ ] Audio track removed
- [ ] File sizes within target
- [ ] Rights and usage terms of the generation tool allow commercial use
- [ ] Manifest updated and page checked on desktop, mobile, and with reduced motion
