import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';

import { KYSELY_CONNECTION_KEY } from './constants';
import { DB } from './schema/db';

@Injectable()
export class DatabaseService {
  constructor(@Inject(KYSELY_CONNECTION_KEY) private db: Kysely<DB>) {}

  getDB(): Kysely<DB> {
    return this.db;
  }
}
