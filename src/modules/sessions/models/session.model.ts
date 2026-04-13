import type { SessionStatus } from 'common/enums';
import type { EegSession } from 'database/schema/eeg-session';

export class SessionModel {
  id: string;
  userId: string;
  sessionName: string;
  protocolName: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;

  constructor(session: EegSession) {
    this.id = session.id;
    this.userId = session.userId;
    this.sessionName = session.sessionName;
    this.protocolName = session.protocolName;
    this.status = session.status;
    this.createdAt = session.createdAt;
    this.updatedAt = session.updatedAt;
    this.startedAt = session.startedAt;
    this.endedAt = session.endedAt;
  }

  static fromResult(this: void, session: EegSession): SessionModel {
    return new SessionModel(session);
  }
}
