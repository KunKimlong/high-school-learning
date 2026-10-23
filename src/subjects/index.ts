/** Subjects shown in the dashboard sidebar. Add an entry (plus a route and dictionary keys) for a new subject. */
export const SUBJECTS = [
  { id: 'math', icon: '∑' },
  { id: 'chemistry', icon: '⚗' },
] as const

export type SubjectId = (typeof SUBJECTS)[number]['id']

export const DEFAULT_SUBJECT: SubjectId = 'math'
