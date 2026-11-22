/**
 * Atmospheric footage for the landing page. Full brief and generation prompts: docs/MEDIA-PLAN.md.
 *
 * No clip has been generated yet, so every `sources` entry is null and the page renders the
 * branded fallback scene instead. When a clip is ready:
 *   1. export it as described in MEDIA-PLAN.md and put the files in public/media/
 *   2. fill in `sources` (and `poster`) below with their real paths
 * Nothing else needs to change.
 */
export interface MediaSources { mp4: string; webm?: string }
export interface MediaClip {
  id: string;
  purpose: string;
  section: string;
  durationSec: number;
  aspect: '16:9' | '9:16' | '4:5' | '1:1';
  /** Poster frame (JPG/WebP) in public/media/posters/. Null until generated. */
  poster: string | null;
  sources: { desktop: MediaSources | null; mobile: MediaSources | null };
  /** Which fallback art scene to draw while the clip doesn't exist. */
  fallback: 'office' | 'research' | 'meeting' | 'data' | 'growth';
  caption: string;
}

export const MEDIA: Record<string, MediaClip> = {
  hero: {
    id: 'hero-office', purpose: 'Hero background: modern glass office, professionals collaborating',
    section: 'Hero', durationSec: 8, aspect: '16:9', poster: null,
    sources: { desktop: null, mobile: null }, fallback: 'office', caption: 'Where every lead gets a next step',
  },
  research: {
    id: 'bdr-research', purpose: 'BDR researching prospects on a laptop',
    section: 'Video showcase', durationSec: 6, aspect: '4:5', poster: null,
    sources: { desktop: null, mobile: null }, fallback: 'research', caption: 'Prospect research',
  },
  meeting: {
    id: 'sales-meeting', purpose: 'AE leading a client meeting',
    section: 'Video showcase', durationSec: 6, aspect: '4:5', poster: null,
    sources: { desktop: null, mobile: null }, fallback: 'meeting', caption: 'Sales meetings',
  },
  data: {
    id: 'data-intelligence', purpose: 'Abstract data visualisation, flowing light',
    section: 'Video showcase', durationSec: 6, aspect: '16:9', poster: null,
    sources: { desktop: null, mobile: null }, fallback: 'data', caption: 'Data intelligence',
  },
  growth: {
    id: 'executive-growth', purpose: 'Leadership reviewing growth on a large display',
    section: 'Video showcase', durationSec: 6, aspect: '16:9', poster: null,
    sources: { desktop: null, mobile: null }, fallback: 'growth', caption: 'Executive analytics',
  },
};
