import { Request, Response } from 'express';
import { handleCors } from './_lib/cors.js';

export default function healthHandler(req: Request, res: Response) {
  if (handleCors(req, res)) return;
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
