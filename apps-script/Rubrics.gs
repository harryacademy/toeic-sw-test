/**
 * Rubrics and anchor samples for the AI grader. The owner edits this file.
 *
 * RUBRICS: level descriptors per task type, paraphrasing the official TOEIC Writing scoring criteria.
 * ANCHORS: real student answers scored by the owner (anonymised), defined in PrivateAnchors.gs.
 *          They are shown to the grader as calibration examples, and runTemperatureTest() uses them
 *          to measure AI vs owner agreement.
 * Level descriptors are our own wording of the TOEIC Writing scoring guides; do not paste ETS text here.
 */

var MAX_SCORE = { picture_sentence: 3, email: 4, essay: 5 };

var RUBRICS = {
  picture_sentence: {
    criteria: ['Grammar', 'Relevance to the picture', 'Use of both key words'],
    levels: [
      '3 — ONE sentence with no grammatical errors, using forms of both key words appropriately, and consistent with the picture.',
      '2 — One or more sentences with one or more grammatical errors that do not obscure the meaning; both key words are present (possibly in different sentences, possibly in an inaccurate form); consistent with the picture.',
      '1 — Errors that interfere with meaning; OR one or both key words are missing; OR the sentence is not consistent with the picture.',
      '0 — Only for a blank answer, an answer not written in English, or random keystrokes. An English sentence that does not match the picture is 1, not 0.'
    ],
    notes: 'The key words may appear in any order and in any form (plural, tense, -ing, etc.). Minor spelling mistakes are not penalized. Register and formality are not assessed in this task (informal words such as "guys" are acceptable). Writing more than one sentence cannot earn 3.'
  },
  email: {
    criteria: ['Task completion', 'Organization and connecting words', 'Tone and awareness of the reader', 'Grammar, sentence variety and vocabulary'],
    levels: [
      '4 — Addresses ALL the required tasks effectively, in several sentences that clearly give the requested information / questions / suggestions. Ideas are connected logically or with suitable connecting words. Tone and register suit the reader. Only a few isolated errors, none of which obscure meaning.',
      '3 — Mostly successful, but falls short on exactly ONE required task (missing, unsuccessful or incomplete). Some organization or connecting words in at least part of the response. Some awareness of the reader. Noticeable errors may be present; at most ONE sentence has errors that obscure meaning.',
      '2 — Several weaknesses: completes only ONE required task, OR two or three tasks are done unsuccessfully or incompletely. Connections between ideas may be missing or unclear. Little awareness of the reader. Errors obscure meaning in MORE THAN ONE sentence.',
      '1 — Seriously flawed: completes NONE of the required tasks, though some content may relate to the e-mail. Connections missing or obscure; tone may be inappropriate; frequent errors obscure meaning most of the time.',
      '0 — Only copies words from the prompt, rejects or ignores the topic, is not written in English, is random keystrokes, or is blank.'
    ],
    notes: 'Count each required task explicitly (how many questions, suggestions, pieces of information). A task counts as done only if the reader would get what was asked for. Raters do not expect perfection: isolated small errors do not stop a 4. ' +
      'HOUSE STANDARD (Harry Academy head teacher): 4 requires the tasks to be done EFFECTIVELY — each task is developed with a reason, detail or context, and the sentences are connected into a real e-mail. A bare-minimum reply (one short plain sentence per task, no development) scores at most 3, even with few errors. Organization in a very short reply is at most fair.'
  },
  essay: {
    criteria: ['Opinion and support (reasons, examples, details)', 'Organization, unity and coherence', 'Grammar and sentence variety', 'Vocabulary and idiomatic use'],
    levels: [
      '5 — Does nearly all of these: answers the question fully and effectively; clear structure with well-chosen reasons, examples or details that are properly developed; ideas hang together and move forward logically; consistently strong control of language (varied sentences, precise and natural word choice), with at most small slips in words or grammar.',
      '4 — Does nearly all of these: answers the question well, though some points could be explained further; mostly well structured with enough support; ideas generally connected, though there may be some repetition, a short digression or an unclear link; good range of sentences and vocabulary, with some noticeable small errors that do not affect meaning.',
      '3 — Shows one or more of these: reasons and examples are only partly developed; the link between ideas is sometimes unclear; uneven control of sentences and word choice that sometimes makes meaning unclear; mostly correct language but a narrow range of structures and vocabulary.',
      '2 — Shows one or more of these: little development of the answer; weak structure or poorly linked ideas; too few or unsuitable examples and explanations; clearly wrong word choices or word forms; many errors in sentence structure or usage.',
      '1 — Seriously weak in one or more of these ways: very disorganized or barely developed; little or no detail, or details that are off the point; hardly answers the question; serious and frequent errors in sentence structure or usage.',
      '0 — Only copies words from the topic, rejects or ignores the topic, is not written in English, is random keystrokes, or is blank.'
    ],
    notes: 'Judge development, organization and whether errors get in the way of meaning. ' +
      'LENGTH: about 300 words is typical of an effective essay, but length is NOT a cap. An essay of about 200 words with a clear opinion and two reasons that are each explained can score 4. Only lower the score for length when the ideas are actually underdeveloped. ' +
      'ERRORS: weigh their effect, not their number. Many small errors (articles, agreement, prepositions, word forms) that do not obscure meaning are compatible with 4. ' +
      'Spelling slips and style suggestions (e.g. a rare but understandable word) should be listed in errors for the student, but they carry almost no weight in the score. ' +
      'HOUSE STANDARD (Harry Academy head teacher): a clear opinion plus two developed reasons, with frequent errors that do not block meaning, is a 4; lack of specific examples alone does not pull it down to 3.'
  }
};

// Anchor samples live in PrivateAnchors.gs (not in git; see PrivateAnchors.example.txt).
var ANCHORS = ANCHORS || [];

/** Anchors with an owner score, for one task type. excludeId skips one (used by the temperature test). */
function anchorsFor_(type, excludeId) {
  return ANCHORS.filter(function (a) {
    return a.type === type && a.id !== excludeId && a.response && a.owner_score !== undefined && a.owner_score !== '';
  });
}
