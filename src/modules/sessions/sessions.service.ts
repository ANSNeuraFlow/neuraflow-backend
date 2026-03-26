import { Injectable } from '@nestjs/common';
import { SessionStatus } from 'common/enums';
import { ForbiddenHttpException, NotFoundHttpException } from 'common/exceptions/http';

import type { CreateSessionDto } from './dtos/create-session.dto';
import type { SessionModel } from './models/session.model';
import { SessionsRepository } from './repository/sessions.repository';

@Injectable()
export class SessionsService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async create(userId: string, dto: CreateSessionDto): Promise<SessionModel> {
    return this.sessionsRepository.create(userId, dto);
  }

  async stop(userId: string, sessionId: string): Promise<SessionModel> {
    const session = await this.sessionsRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundHttpException(`Session ${sessionId}`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenHttpException('You do not own this session');
    }

    if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.FAILED) {
      throw new ForbiddenHttpException(`Session is already ${session.status}`);
    }

    const result = await this.sessionsRepository.updateStatus(sessionId, SessionStatus.COMPLETED, {
      endedAt: new Date(),
    });

    if (!result) {
      throw new NotFoundHttpException(`Session ${sessionId}`);
    }

    return result;
  }

  async findAllForUser(userId: string): Promise<SessionModel[]> {
    return this.sessionsRepository.findAllByUserId(userId);
  }

  async activateSession(sessionId: string): Promise<void> {
    await this.sessionsRepository.updateStatus(sessionId, SessionStatus.ACTIVE, {
      startedAt: new Date(),
    });
  }

  async findOne(userId: string, sessionId: string): Promise<SessionModel> {
    const session = await this.sessionsRepository.findByIdAndUserId(sessionId, userId);
    if (!session) {
      throw new NotFoundHttpException(`Session ${sessionId}`);
    }
    return session;
  }

  async delete(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionsRepository.findByIdAndUserId(sessionId, userId);
    if (!session) {
      throw new NotFoundHttpException(`Session ${sessionId}`);
    }
    if (session.status === SessionStatus.ACTIVE) {
      throw new ForbiddenHttpException('Cannot delete an active session. Stop it first.');
    }
    await this.sessionsRepository.deleteByIdAndUserId(sessionId, userId);
  }

  async findForWsGuard(userId: string, sessionId: string): Promise<SessionModel | null> {
    return this.sessionsRepository.findByIdAndUserId(sessionId, userId);
  }
}
