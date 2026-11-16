export const TASK_PRIORITY_VALUES = ['low', 'medium', 'high'] as const;

export type TaskPriority = (typeof TASK_PRIORITY_VALUES)[number];

export const TASK_DEFAULT_PRIORITY: TaskPriority = 'medium';
