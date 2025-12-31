import { AssessmentDefinition } from './assessment.types';

export const GAD7_ASSESSMENT: AssessmentDefinition = {
  id: 'gad-7',
  name: 'GAD-7 (Generalized Anxiety Disorder)',
  description: 'Standardized assessment for measuring anxiety severity',
  type: 'clinical',
  questions: [
    {
      id: 'gad7_q1',
      text: 'Feeling nervous, anxious, or on edge',
      type: 'scale',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      required: true,
    },
    {
      id: 'gad7_q2',
      text: 'Not being able to stop or control worrying',
      type: 'scale',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      required: true,
    },
    {
      id: 'gad7_q3',
      text: 'Worrying too much about different things',
      type: 'scale',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      required: true,
    },
    {
      id: 'gad7_q4',
      text: 'Trouble relaxing',
      type: 'scale',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      required: true,
    },
    {
      id: 'gad7_q5',
      text: 'Being so restless that it is hard to sit still',
      type: 'scale',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      required: true,
    },
    {
      id: 'gad7_q6',
      text: 'Becoming easily annoyed or irritable',
      type: 'scale',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      required: true,
    },
    {
      id: 'gad7_q7',
      text: 'Feeling afraid, as if something awful might happen',
      type: 'scale',
      options: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      required: true,
    },
  ],
  scoringRules: {
    method: 'sum',
    minScore: 0,
    maxScore: 21,
    severityLevels: [
      {
        level: 'minimal',
        minScore: 0,
        maxScore: 4,
        description: 'Minimal anxiety',
      },
      {
        level: 'mild',
        minScore: 5,
        maxScore: 9,
        description: 'Mild anxiety',
      },
      {
        level: 'moderate',
        minScore: 10,
        maxScore: 14,
        description: 'Moderate anxiety',
      },
      {
        level: 'severe',
        minScore: 15,
        maxScore: 21,
        description: 'Severe anxiety',
      },
    ],
  },
};
