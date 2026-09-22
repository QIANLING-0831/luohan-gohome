import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../shared/errors.js'

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) return next(new AppError(403, '当前账号没有操作权限', 'FORBIDDEN'))
    next()
  }
}
