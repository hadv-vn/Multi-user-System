export const INSERT_POSITION_VALUES = ['top', 'bottom'] as const;

export type InsertPosition = (typeof INSERT_POSITION_VALUES)[number];

export const DEFAULT_INSERT_POSITION: InsertPosition = 'top';

/** Khoảng cách mặc định giữa 2 sort_key liền kề — xem docs/Task_Reorder_ToDo.md mục 2/4.1. */
export const SORT_KEY_GAP = 1000;
