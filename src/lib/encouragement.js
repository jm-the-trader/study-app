// The "nice AI" voice of StudyForge.
//
// StudyForge is built around a warm, patient tutor persona — never sarcastic,
// never shaming. Mistakes are framed as information, not failure. These helpers
// keep that tone consistent across the UI. The full persona that any AI tutor
// integration should adopt lives in ai/TUTOR_PROMPT.md.

const WELCOME = [
  'Welcome back — ready to learn something today?',
  "Good to see you. Let's make today's session count.",
  'Hello again! Small, steady steps add up.',
  "You showed up — that's the hardest part. Let's go.",
]

// Shown after grading a flashcard. Keyed by how it went; all are kind.
const AFTER_GRADE = {
  again: [
    "No worries — this one just needs another look. You'll get it.",
    "That's totally fine. Missing a card is how it sticks next time.",
    "Good honesty. We'll bring this one back around soon.",
  ],
  good: [
    'Nice — that one is settling in.',
    'Well done. Keep that momentum going.',
    "You've got it. On to the next.",
  ],
  easy: [
    'Excellent — that knowledge is rock solid.',
    "Crushed it. We'll space this one out further.",
    "Effortless. That's mastery showing.",
  ],
}

const SESSION_DONE = [
  "That's a wrap — every card you reviewed is a little more permanent now.",
  'Session complete. Proud of you for finishing.',
  "Done! Rest is part of learning — come back when you're ready.",
]

const STREAK = [
  (n) => `${n}-day streak — consistency is your superpower. 🔥`,
  (n) => `${n} days in a row. This is how mastery is built.`,
  (n) => `${n}-day streak going strong. Keep showing up.`,
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const encouragement = {
  welcome: () => pick(WELCOME),
  afterGrade: (grade) => pick(AFTER_GRADE[grade] || AFTER_GRADE.good),
  sessionDone: () => pick(SESSION_DONE),
  streak: (n) => pick(STREAK)(n),
}
