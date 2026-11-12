// All wording is pending founder approval. Edit freely.
//
// Every word and number the marks section on /story shows lives here.
// Words in {curly braces} are filled in by the page:
//   {gap}       how far the total is below 150, e.g. "18 marks"
//   {perPaper}  that gap spread over three papers, rounded up, e.g. "6 marks"
//   {total}     the group total, e.g. 159
//   {papers}    the papers below 40, e.g. "Financial Reporting and AFM"
//   {n}         how many of the three marks are entered so far

/** The Group 1 rules. Three papers: FR, AFM, Audit. */
export const RULES = { paperMin: 40, paperMax: 100, groupMin: 150, groupMax: 300 };

/** How far below 150 counts as close (up to 10) or moderate (11 to 30). More is large. */
export const BANDS = { close: 10, moderate: 30 };

/** The three papers, in order. `label` sits on the input, `name` goes into sentences. */
export const PAPERS = [
  { key: 'fr', label: 'Financial Reporting', name: 'Financial Reporting' },
  { key: 'afm', label: 'Advanced Financial Management', name: 'AFM' },
  { key: 'audit', label: 'Audit', name: 'Audit' },
];

/** "Use sample marks" fills these, in the order above. */
export const SAMPLE = [47, 41, 44];

export const COPY = {
  intro: {
    heading: 'Start with the three numbers you already know.',
    lead: 'Open your last Group 1 result. Type the marks you got in each paper.',
    small: 'Out of 100 each. Not saved, not sent.',
  },
  placeholder: 'e.g. 47',
  suffix: '/ 100',
  entered: '{n} of 3 entered',
  sampleButton: 'Not sure? Try sample marks',
  resetButton: 'Start again',
  note: 'A quick calculation, not a diagnosis.',
  error: 'Marks are out of 100.',
  groupLabel: 'Group total',
  panelLabel: 'A MENTOR’S FIRST READ',
  panelEmpty: 'Your first read will appear here.',

  verdicts: {
    pass: {
      head: 'These marks would clear Group 1.',
      body: 'Every paper is 40 or above and the total is 150 or more. If these are from an attempt you cleared, enter the marks from the attempt you didn’t.',
    },
    close: {
      head: 'You’re {gap} short of 150.',
      body: 'Every paper is above 40, so it’s the group total holding you back. Spread across three papers, that’s about {perPaper} each. This is a close one, and that’s exactly why it’s worth understanding where those marks went.',
    },
    moderate: {
      head: 'You’re {gap} short of 150.',
      body: 'Every paper is above 40, so no single subject is the whole story. Gaps like this are often many small losses rather than one big one, which is why where you lost them matters more than the total.',
    },
    large: {
      head: 'You’re {gap} short of 150.',
      body: 'That’s a real distance, and we won’t pretend otherwise. It isn’t a verdict on you. It tells us where to look first and what to leave alone.',
    },
    paperOnly: {
      head: 'One paper stands between you and Group 1.',
      body: 'Your total is {total}, above 150. But {papers} is below 40, and in Group 1 every paper needs 40 whatever the others score. This attempt came down to a paper, not the whole group.',
    },
    // The same read when two papers are below 40 and the total still clears 150.
    paperOnlyMany: {
      head: 'Two papers stand between you and Group 1.',
      body: 'Your total is {total}, above 150. But {papers} are below 40, and in Group 1 every paper needs 40 whatever the others score. This attempt came down to papers, not the whole group.',
    },
    both: {
      head: 'Two things are open.',
      body: '{papers} below 40, and the total is {gap} short of 150. Raising a paper that’s below 40 also raises the total, so that’s where we’d start.',
    },
  },

  followup: {
    prompt: 'Which paper surprised you most?',
    chips: ['Financial Reporting', 'AFM', 'Audit', 'None of them'],
    replyPaper:
      'You expected more from it. Hold on to that. The gap between how a paper felt and what it scored is the first thing worth looking at.',
    replyNone: 'Then the marks match how it felt. That’s useful: it tells us where not to look first.',
  },

  bridge: {
    head: 'What marks can’t tell you is why.',
    body: 'Your marksheet shows where the marks went. Why they went is in how you studied, how you wrote and how the three hours were used. That’s what a one-to-one conversation is for.',
  },
};

/** The call to action under the bridge, shown once a first read is on screen. The arrow is drawn. */
export const MARKS_CTA_LABEL = 'Book a consultation about these marks';

/** Fills {placeholders} in a template. Unknown ones are left as they are. */
export function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** plural(1, "mark") is "1 mark", plural(18, "mark") is "18 marks". */
export function plural(n, word) {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}
