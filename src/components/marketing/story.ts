/**
 * The home page's product story, in one place.
 *
 * Two consumers read this file and must never drift apart:
 *   - the marketing sections themselves (the words people read while scrolling)
 *   - the drawn sheet (`storySheet.ts`), a condensed copy of the same story on paper
 *
 * Camera choreography lives beside the scene in `components/three/sections.ts`; the
 * `region` below is the only spatial value the sheet needs (which block to tint).
 */

export type StoryRegion =
  | 'intro'
  | 'profile'
  | 'preview'
  | 'assistant'
  | 'share'
  | 'themes'
  | 'templates'
  | 'sites'
  | 'how'

export interface StoryPoint {
  /** Short label drawn on the sheet. */
  label: string
  /** Optional second line, used by the drawing only. */
  detail?: string
}

export interface StorySection {
  id: StoryRegion
  /** Region drawn on the paper, when the section zooms into one. */
  region: string | null
  /** Small uppercase label, for the paper. */
  eyebrow: string
  title: string
  /** The copy the section renders on the page. */
  body: string
  /** The condensed version drawn on the paper. */
  sheetBody: string
  points: StoryPoint[]
}

/** The hero: no region is focused, the whole sheet is in view. */
export const STORY_INTRO: StorySection = {
  id: 'intro',
  region: null,
  eyebrow: 'LEAF',
  title: 'Your career story, written with care.',
  body: 'LEAF turns one truthful career profile into a live CV, a thoughtful cover letter and a personal site you can share. You stay the author. AI only helps with the words.',
  sheetBody: 'One truthful career profile becomes a live CV, a thoughtful cover letter and a personal site you can share.',
  points: [
    { label: 'No payment step' },
    { label: 'Selectable-text PDFs' },
    { label: 'Private until you share' },
  ],
}

export const STORY_SECTIONS: StorySection[] = [
  {
    id: 'profile',
    region: 'profile',
    eyebrow: 'One source of truth',
    title: 'One profile. Every document.',
    body: 'Keep your real roles, education, skills and contact details in one place. New CVs, letters and sites start populated — and you can still edit every field.',
    sheetBody: 'Keep your real roles, education, skills and contact details in one place. New CVs, letters and sites start populated — and you can still edit every field.',
    points: [
      { label: 'Profile synced across every document', detail: 'CV · Cover letter · Personal site' },
      { label: 'Edit any field per document', detail: 'Originals are never overwritten' },
    ],
  },
  {
    id: 'preview',
    region: 'preview',
    eyebrow: 'Live A4 canvas',
    title: 'The page is the preview.',
    body: 'Your edits appear in a live A4 canvas. Selecting a field highlights the matching section, so you always know what changed.',
    sheetBody: 'Your edits appear in a live A4 canvas, and selecting a field highlights the matching section.',
    points: [
      { label: 'The same engine that renders your PDF', detail: 'What you see is what exports' },
      { label: 'Highlights follow the field you edit', detail: 'No guesswork about what changed' },
    ],
  },
  {
    id: 'assistant',
    region: 'assistant',
    eyebrow: 'AI is optional',
    title: 'The assistant suggests. You decide.',
    body: 'Ask for a tighter paragraph, a summary or achievement bullets. Results arrive editable, use only the facts you provide, and never touch the document until you apply them.',
    sheetBody: 'Ask for a tighter paragraph or achievement bullets. Suggestions arrive editable and use only the facts you provide.',
    points: [
      { label: 'No invented metrics', detail: 'Only the facts you wrote' },
      { label: 'Editable by default', detail: 'Nothing applied on your behalf' },
      { label: 'Optional every time', detail: 'Manual editing always works' },
    ],
  },
  {
    id: 'share',
    region: 'share',
    eyebrow: 'Sharing',
    title: 'Share on your terms.',
    body: 'Send a private link or a QR code. Add an expiry date, then revoke access in one click. The public page carries a clear PDF download and a no-index tag.',
    sheetBody: 'Send a private link or a QR code, add an expiry date, then revoke access in one click.',
    points: [
      { label: 'Private links with QR codes', detail: 'Scan to open' },
      { label: 'Expiry dates and one-click revoke', detail: 'The old address stops working' },
      { label: 'No index, no accidental discovery', detail: 'Drafts stay private' },
    ],
  },
  {
    id: 'themes',
    region: 'themes',
    eyebrow: 'Appearance',
    title: 'Light, dark — and paper.',
    body: 'Switch the workspace between light, dark and system. Your documents keep their own print palette, so the PDF always lands on white paper.',
    sheetBody: 'The workspace follows light, dark or system, while documents keep their own print palette.',
    points: [
      { label: 'Light, dark and system themes', detail: 'Your choice is remembered' },
      { label: 'Documents stay print-white', detail: 'Theme never leaks into the PDF' },
    ],
  },
  {
    id: 'templates',
    region: 'epilogue',
    eyebrow: 'Layouts',
    title: 'Real layouts, not screenshots.',
    body: 'Find the shape of your story. Every preview below is rendered by the same document engine used for your PDF. Pick a starting point, then change the template, type and colour without losing content.',
    sheetBody: 'Every template preview is rendered by the same document engine used for your PDF.',
    points: [
      { label: 'Six CV templates, six site designs', detail: 'Three cover-letter layouts' },
      { label: 'Change the design, keep every word', detail: 'Six colour presets, plus custom hex' },
    ],
  },
  {
    id: 'sites',
    region: 'epilogue',
    eyebrow: 'Personal site',
    title: 'A home for the work.',
    body: 'Turn the same profile into a one-page site with a real hero, selected work and a contact path. Choose a design, publish when it is ready, and share a clean address. Link a shared CV and visitors can download it from the page.',
    sheetBody: 'The same profile becomes a one-page site with a real hero, selected work and a contact path.',
    points: [
      { label: 'Six distinct designs', detail: 'One accessible structure underneath' },
      { label: 'Calm on a phone', detail: 'Tilt and reveals reduce for less motion' },
      { label: 'Publish and unpublish on your terms', detail: 'Changing the address retires the old one' },
    ],
  },
  {
    id: 'how',
    region: 'epilogue',
    eyebrow: 'How it works',
    title: 'From rough notes to a finished application.',
    body: 'No onboarding maze. Start with what you already know, then refine in the same place you will export from.',
    sheetBody: 'No onboarding maze: start with what you already know, then refine where you will export from.',
    points: [
      { label: '01 Fill one profile', detail: 'Experience, education, skills, contact' },
      { label: '02 Shape the story', detail: 'Template, canvas, optional suggestions' },
      { label: '03 Export and share', detail: 'A4 PDF, revocable link, personal site' },
    ],
  },
]

/** The sheet draws these beats; the rest of the story shares the closing region. */
export const SHEET_CHAPTERS: StorySection[] = STORY_SECTIONS.filter((section) => section.region !== 'epilogue')

/** The closing quarter of the sheet: how it works, with the layouts and sites lines above it. */
export const SHEET_EPILOGUE = {
  eyebrow: 'How it works',
  title: 'From rough notes to a finished application.',
  body: 'No onboarding maze: start with what you already know, then refine where you will export from.',
  steps: [
    { label: '01 Fill one profile', detail: 'Experience, education, skills, contact' },
    { label: '02 Shape the story', detail: 'Template, canvas, optional suggestions' },
    { label: '03 Export and share', detail: 'A4 PDF, revocable link, personal site' },
  ],
}
