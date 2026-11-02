export const TASK_STATUS_VALUES = ['open', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];

export const TASK_DEFAULT_STATUS: TaskStatus = 'open';
