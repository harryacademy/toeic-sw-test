/**
 * Sample Writing form for development. Original placeholder content written for Harry Academy —
 * not taken from any ETS material. Images live on Pages under docs/m/q7r2k9xw/.
 */
var FORMS = FORMS || {};

FORMS['W-SAMPLE-01'] = {
  id: 'W-SAMPLE-01',
  title: 'Writing — Sample form 01',
  section: 'writing',
  steps: [
    {
      id: 'W1-5',
      type: 'picture_sentence',
      time_sec: 480,
      directions_en: 'Questions 1–5: Write a sentence based on a picture. For each picture, write ONE sentence that uses BOTH of the words or phrases shown under it. You may use the words in any order and change their forms. Your sentence is scored on grammar and on how relevant it is to the picture. You have 8 minutes for all five pictures and may move between them freely.',
      questions: [
        {
          id: 'W1', image: 'm/q7r2k9xw/w1.svg', words: ['ride', 'along'],
          grading: { image_description: 'A man in a helmet rides a bicycle on a paved path beside a river. Trees on the far bank, sunny day.' }
        },
        {
          id: 'W2', image: 'm/q7r2k9xw/w2.svg', words: ['book', 'under'],
          grading: { image_description: 'A woman sits on a park bench under a large tree, reading a book. A bag is on the bench next to her.' }
        },
        {
          id: 'W3', image: 'm/q7r2k9xw/w3.svg', words: ['meeting', 'because'],
          grading: { image_description: 'Four office workers sit around a table in a meeting room. One stands at a screen showing a bar chart; the others look at it.' }
        },
        {
          id: 'W4', image: 'm/q7r2k9xw/w4.svg', words: ['pay', 'cashier'],
          grading: { image_description: 'In a shop, a customer holds out a card at the checkout counter. A cashier stands behind the counter next to a register; shopping bags are on the counter.' }
        },
        {
          id: 'W5', image: 'm/q7r2k9xw/w5.svg', words: ['suitcase', 'while'],
          grading: { image_description: 'In an airport terminal, a woman stands with a wheeled suitcase and looks up at a departures board listing flights.' }
        }
      ]
    },
    {
      id: 'W6',
      type: 'email',
      time_sec: 600,
      directions_en: 'Question 6: Respond to a written request. Read the e-mail and write a reply. Your reply is scored on the quality and variety of your sentences, vocabulary, and organization, and on whether you complete every task. You have 10 minutes.',
      questions: [
        {
          id: 'W6',
          email: {
            from: 'Members Desk, Riverside Fitness Center',
            to: 'Valued members',
            subject: 'New evening classes',
            body: 'Dear members,\n\nStarting next month, Riverside Fitness Center will offer three new evening classes: yoga, indoor cycling, and a beginner strength course. Classes run from 6:30 to 8:00 p.m. on weekdays, and spaces are limited. If you are interested, please reply to this e-mail and let us know which class suits you.\n\nBest regards,\nMembers Desk'
          },
          task: 'Respond to the e-mail as a member of the fitness center. In your e-mail, ask TWO questions and give ONE piece of information about yourself.',
          grading: { tasks: ['ask two questions about the new classes', 'give one piece of information about themself'] }
        }
      ]
    },
    {
      id: 'W7',
      type: 'email',
      time_sec: 600,
      directions_en: 'Question 7: Respond to a written request. Read the e-mail and write a reply. You have 10 minutes.',
      questions: [
        {
          id: 'W7',
          email: {
            from: 'Linh Tran, Human Resources',
            to: 'All staff',
            subject: 'Company trip in November',
            body: 'Hello everyone,\n\nWe are planning a two-day company trip for all staff in November. We have not chosen the destination or the activities yet, and we would like to hear your ideas before we make a booking. Please send me your thoughts by Friday.\n\nThank you,\nLinh'
          },
          task: 'Respond to the e-mail as an employee of the company. In your e-mail, make TWO suggestions and ask ONE question.',
          grading: { tasks: ['make two suggestions for the trip', 'ask one question'] }
        }
      ]
    },
    {
      id: 'W8',
      type: 'essay',
      time_sec: 1800,
      directions_en: 'Question 8: Write an opinion essay. State your opinion on the topic and support it with reasons and examples. An effective essay usually contains at least 300 words. You have 30 minutes.',
      questions: [
        {
          id: 'W8',
          prompt: 'Some people believe that employees should be allowed to choose their own working hours. Do you agree or disagree? Give specific reasons and examples to support your opinion.',
          grading: {}
        }
      ]
    }
  ]
};
