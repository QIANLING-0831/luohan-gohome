import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../shared/errors.js'

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? '参数错误' } })
  if (error instanceof AppError) return res.status(error.status).json({ error: { code: error.code, message: error.message } })
  console.error(error)
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器暂时开小差了' } })
}
