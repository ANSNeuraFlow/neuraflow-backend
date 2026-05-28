import { type Kysely, sql } from 'kysely';

import type { DB } from '../schema/db';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable('drone_video_streams')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('bridge_token_id', 'uuid', (col) => col.notNull().references('bridge_tokens.id').onDelete('cascade'))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('stream_key', 'varchar(64)', (col) => col.notNull().unique())
    .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
    .addColumn('rtmp_ingest_url', 'text', (col) => col.notNull())
    .addColumn('started_at', 'timestamptz')
    .addColumn('ended_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_drone_video_streams_bridge_token_id')
    .on('drone_video_streams')
    .column('bridge_token_id')
    .execute();

  await db.schema.createIndex('idx_drone_video_streams_user_id').on('drone_video_streams').column('user_id').execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropTable('drone_video_streams').execute();
}
