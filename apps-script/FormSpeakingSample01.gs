/**
 * Sample Speaking form for development. Original placeholder content written for Harry Academy —
 * not taken from any ETS material. Media live on Pages under docs/m/q7r2k9xw/.
 * Prompt audio (s*.mp3) is generated with tools/tts/make_audio.py from tools/tts/speaking-sample-01.json.
 *
 * Question fields: prep_sec, resp_sec, text (shown), image, audio (played), play_times.
 * Step fields: context_text / context_audio (shown / played once before the first question),
 *              info + read_sec (schedule shown during the whole step; read time before the first question).
 * Anything under `grading` stays on the server (e.g. questions the student only hears).
 */
var FORMS = FORMS || {};

FORMS['S-SAMPLE-01'] = {
  id: 'S-SAMPLE-01',
  title: 'Speaking — Sample form 01',
  section: 'speaking',
  steps: [
    {
      id: 'S1-2',
      type: 'read_aloud',
      directions_en: 'Questions 1–2: Read a text aloud. You will read aloud the text on the screen. You will have 45 seconds to prepare. Then you will have 45 seconds to read the text aloud.',
      questions: [
        {
          id: 'S1', prep_sec: 45, resp_sec: 45,
          text: 'Attention, shoppers. Starting this Saturday, Greenfield Market will be open from seven in the morning until ten at night. To celebrate our new hours, all fresh fruit and vegetables will be twenty percent off for the entire weekend. Don\'t forget to visit our bakery, where you can taste our new whole-grain bread. Thank you for shopping at Greenfield Market.'
        },
        {
          id: 'S2', prep_sec: 45, resp_sec: 45,
          text: 'Welcome to this evening\'s episode of Business Today. In tonight\'s program, we will speak with three young entrepreneurs who started their own companies before the age of thirty. They will talk about the challenges they faced, the mistakes they made, and the advice they would give to anyone who wants to start a business. Stay with us after the break.'
        }
      ]
    },
    {
      id: 'S3-4',
      type: 'describe_picture',
      directions_en: 'Questions 3–4: Describe a picture. You will describe the picture on your screen in as much detail as you can. You will have 45 seconds to prepare your response. Then you will have 30 seconds to speak about the picture.',
      questions: [
        {
          id: 'S3', prep_sec: 45, resp_sec: 30, image: 'm/q7r2k9xw/w2.svg',
          grading: { image_description: 'A woman sits on a park bench under a large tree, reading a book. A bag is on the bench next to her. Grass in the foreground.' }
        },
        {
          id: 'S4', prep_sec: 45, resp_sec: 30, image: 'm/q7r2k9xw/w5.svg',
          grading: { image_description: 'In an airport terminal, a woman stands with a red wheeled suitcase and looks up at a departures board listing flights to Singapore, Tokyo, Sydney and Bangkok.' }
        }
      ]
    },
    {
      id: 'S5-7',
      type: 'respond_questions',
      directions_en: 'Questions 5–7: Respond to questions. You will answer three questions. For each question, begin responding immediately after you hear a beep. You will have 3 seconds to prepare after you hear each question. You will have 15 seconds to respond to Questions 5 and 6, and 30 seconds to respond to Question 7.',
      context_text: 'Imagine that a marketing company is doing research in your area. You have agreed to participate in a telephone interview about coffee shops.',
      context_audio: 'm/q7r2k9xw/s5_context.mp3',
      questions: [
        { id: 'S5', prep_sec: 3, resp_sec: 15, audio: 'm/q7r2k9xw/s5.mp3', text: 'How often do you go to a coffee shop, and who do you usually go with?' },
        { id: 'S6', prep_sec: 3, resp_sec: 15, audio: 'm/q7r2k9xw/s6.mp3', text: 'What do you usually order at a coffee shop?' },
        { id: 'S7', prep_sec: 3, resp_sec: 30, audio: 'm/q7r2k9xw/s7.mp3', text: 'Would you rather study or work in a coffee shop or at home? Why?' }
      ]
    },
    {
      id: 'S8-10',
      type: 'respond_info',
      directions_en: 'Questions 8–10: Respond to questions using information provided. You will answer three questions based on the information on the screen. You will have 45 seconds to read the information before the questions begin. For each question, begin responding immediately after you hear a beep. You will have 3 seconds to prepare after you hear each question. You will have 15 seconds to respond to Questions 8 and 9, and 30 seconds to respond to Question 10. You will hear Question 10 two times.',
      read_sec: 45,
      info: {
        title: 'Weekend Photography Workshop',
        subtitle: 'Riverside Community Center · Saturday, October 18 · Room 204',
        lines: [
          ['9:00 – 9:30 A.M.', 'Registration and welcome coffee'],
          ['9:30 – 11:00 A.M.', 'Camera Basics — Lisa Park'],
          ['11:00 A.M. – 12:30 P.M.', 'Taking Better Portraits — David Chen (cancelled)'],
          ['12:30 – 1:30 P.M.', 'Lunch (not included)'],
          ['1:30 – 3:00 P.M.', 'Photo Walk along the River — Lisa Park'],
          ['3:00 – 4:00 P.M.', 'Editing Photos on Your Phone — Maria Lopez']
        ],
        notes: ['Fee: $40 · Community Center members: $30']
      },
      context_audio: 'm/q7r2k9xw/s8_intro.mp3',
      questions: [
        {
          id: 'S8', prep_sec: 3, resp_sec: 15, audio: 'm/q7r2k9xw/s8.mp3',
          grading: { question_text: 'What time does the workshop start, and where is it held?' }
        },
        {
          id: 'S9', prep_sec: 3, resp_sec: 15, audio: 'm/q7r2k9xw/s9.mp3',
          grading: { question_text: 'I heard there is a session on portrait photography in the morning. Is that right?' }
        },
        {
          id: 'S10', prep_sec: 3, resp_sec: 30, audio: 'm/q7r2k9xw/s10.mp3', play_times: 2,
          grading: { question_text: 'I am most interested in the afternoon. Could you tell me about the sessions after lunch?' }
        }
      ]
    },
    {
      id: 'S11',
      type: 'opinion',
      directions_en: 'Question 11: Express an opinion. You will give your opinion about a specific topic. Be sure to say as much as you can in the time allowed. You will have 45 seconds to prepare. Then you will have 60 seconds to speak.',
      questions: [
        {
          id: 'S11', prep_sec: 45, resp_sec: 60, audio: 'm/q7r2k9xw/s11.mp3',
          text: 'Some people prefer to learn new skills from online videos, while others prefer to take classes with a teacher in person. Which do you prefer and why? Give specific reasons or examples to support your opinion.'
        }
      ]
    }
  ]
};
