import type { ColumnType } from 'kysely';

export type CreatedAt = ColumnType<Date, Date | string | undefined, never>;
export type UpdatableAt = ColumnType<Date, Date | string | undefined, string | undefined>;
export type UpdatedAt = UpdatableAt;
export type OptionalAt = ColumnType<Date | null, Date | string | null | undefined, string | null | undefined>;
export type DeletedAt = OptionalAt;
