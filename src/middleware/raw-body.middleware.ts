import { json } from 'body-parser';
import type { RequestWithRawBody } from 'common/interfaces/request-with-raw-body.interface';
import type { RequestHandler, Response } from 'express';

interface RawBodyMiddlewareOptions {
  paths?: string[];
}

export function rawBodyMiddleware({ paths = [] }: RawBodyMiddlewareOptions): RequestHandler {
  return json({
    verify: (request: RequestWithRawBody, _response: Response, buffer: Buffer) => {
      if (paths.includes(request.url) && Buffer.isBuffer(buffer)) {
        request.rawBody = Buffer.from(buffer);
      }
      return true;
    },
  });
}
