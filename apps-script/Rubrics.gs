/**
 * Rubrics and anchor samples for the AI grader. The owner edits this file.
 *
 * RUBRICS: level descriptors per task type, paraphrasing the official TOEIC Writing scoring criteria.
 * ANCHORS: real student answers scored by the owner (anonymised). They are shown to the grader as
 *          calibration examples, and runTemperatureTest() uses them to measure AI vs owner agreement.
 */

var MAX_SCORE = { picture_sentence: 3, email: 4, essay: 5 };

var RUBRICS = {
  picture_sentence: {
    criteria: ['Grammar', 'Relevance to the picture', 'Use of both required words'],
    levels: [
      '3 — ONE sentence that uses both required words appropriately, is relevant to the picture, and has no grammatical errors.',
      '2 — One or more sentences that use both required words and are relevant to the picture, with one or more grammatical errors that do not obscure the meaning.',
      '1 — Errors that interfere with meaning; OR only one of the required words is used, or a word is used inappropriately; OR the sentence is not consistent with the picture.',
      '0 — No answer, not written in English, unrelated to the task, or consists only of the given words / random characters.'
    ],
    notes: 'The words may appear in any order, and their form may change (plural, tense, -ing, etc.). A second sentence is not needed; writing more than one sentence cannot earn 3.'
  },
  email: {
    criteria: ['Task completion', 'Organization and tone', 'Sentence quality and variety', 'Vocabulary'],
    levels: [
      '4 — Completes all the tasks effectively; clear, well-organized, and uses a tone and register suitable for the reader; varied sentences with at most a few minor errors.',
      '3 — Completes all the tasks, but one may be addressed only partly or unclearly; generally organized, with some weaknesses in connection or tone; noticeable errors that do not obscure meaning.',
      '2 — Several weaknesses: addresses only some of the tasks, OR ideas are poorly connected, OR the tone is inappropriate for the reader, OR errors sometimes obscure meaning.',
      '1 — Serious disorganization or little relevant content; most tasks missing; frequent errors that obscure meaning; OR mostly copied from the e-mail.',
      '0 — No answer, only copies the prompt, unrelated to the task, or not written in English.'
    ],
    notes: 'Check each required task explicitly (count the questions, suggestions, pieces of information). A task done only vaguely counts as partly done.'
  },
  essay: {
    criteria: ['Opinion and development (reasons and examples)', 'Organization and coherence', 'Grammar and sentence variety', 'Vocabulary and idiomatic use'],
    levels: [
      '5 — Clearly states an opinion and supports it with well-chosen reasons and examples; well organized, with unity, progression and coherence; varied sentence structures, appropriate word choice and idiomatic language; only minor errors.',
      '4 — Clear opinion, generally well organized and developed, though some points are not fully explained; good range with occasional errors in structure, word form or idiom that do not obscure meaning.',
      '3 — Opinion is supported somewhat, but explanations or examples are limited or partly unclear; connections between ideas are sometimes hard to follow; limited range, and accumulated errors that occasionally obscure meaning.',
      '2 — Limited development; inadequate organization or connection of ideas; few or unsuitable examples; frequent errors in structure and word choice.',
      '1 — Seriously disorganized or underdeveloped; little or no detail, or irrelevant specifics; serious and frequent errors.',
      '0 — No answer, only copies the topic, unrelated to the topic, not written in English, or random characters.'
    ],
    notes: 'About 300 words is a guide for an effective answer. Length alone does not earn a score: a long essay with weak development or many errors still scores low; a short essay cannot show full development.'
  }
};

/**
 * Anchor samples. Add one object per scored answer. `question` has the same shape as a question in a
 * Form*.gs file (including `grading`), so the grader sees the same task as a student would.
 *
 * Example:
 * {
 *   id: 'A-EMAIL-01',
 *   type: 'email',
 *   question: {
 *     email: { from: 'Members Desk', to: 'Members', subject: 'New evening classes', body: '...' },
 *     task: 'Ask TWO questions and give ONE piece of information about yourself.',
 *     grading: { tasks: ['ask two questions', 'give one piece of information'] }
 *   },
 *   response: 'Dear Members Desk, ...',
 *   owner_score: 3,
 *   owner_note: 'Both questions clear, but the personal information is missing an explanation.'
 * }
 */
var ANCHORS = [
];

/** Anchors with an owner score, for one task type. excludeId skips one (used by the temperature test). */
function anchorsFor_(type, excludeId) {
  return ANCHORS.filter(function (a) {
    return a.type === type && a.id !== excludeId && a.response && a.owner_score !== undefined && a.owner_score !== '';
  });
}
