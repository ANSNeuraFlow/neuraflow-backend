import { Inject, Injectable } from '@nestjs/common';
import { SessionStatus } from 'common/enums';
import { KYSELY_CONNECTION_KEY } from 'database/constants';
import type { DB } from 'database/schema/db';
import { Kysely } from 'kysely';
import { v7 as uuidv7 } from 'uuid';

import type { CreateSessionDto } from '../dtos/create-session.dto';
import { SessionModel } from '../models/session.model';

@Injectable()
export class SessionsRepository {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private readonly db: Kysely<DB>) {}

  async create(userId: string, dto: CreateSessionDto): Promise<SessionModel> {
    const result = await this.db
      .insertInto('eegSessions')
      .values({
        id: uuidv7(),
        userId,
        sessionName: dto.sessionName,
        protocolName: dto.protocolName,
        status: SessionStatus.INITIALIZED,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return SessionModel.fromResult(result);
  }

  async findById(sessionId: string): Promise<SessionModel | null> {
    const result = await this.db.selectFrom('eegSessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

    return result ? SessionModel.fromResult(result) : null;
  }

  async findAllByUserId(userId: string): Promise<SessionModel[]> {
    const results = await this.db
      .selectFrom('eegSessions')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();

    return results.map(SessionModel.fromResult);
  }

  async updateStatus(
    sessionId: string,
    status: SessionStatus,
    timestamps: { startedAt?: Date; endedAt?: Date } = {},
  ): Promise<SessionModel | null> {
    const result = await this.db
      .updateTable('eegSessions')
      .set({ status, ...timestamps })
      .where('id', '=', sessionId)
      .returningAll()
      .executeTakeFirst();

    return result ? SessionModel.fromResult(result) : null;
  }

  async findByIdAndUserId(sessionId: string, userId: string): Promise<SessionModel | null> {
    const result = await this.db
      .selectFrom('eegSessions')
      .selectAll()
      .where('id', '=', sessionId)
      .where('userId', '=', userId)
      .executeTakeFirst();
    return result ? SessionModel.fromResult(result) : null;
  }

  async deleteByIdAndUserId(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('eegSessions')
      .where('id', '=', sessionId)
      .where('userId', '=', userId)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  }
}
