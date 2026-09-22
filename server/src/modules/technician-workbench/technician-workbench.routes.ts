import { Router } from 'express'
import { authenticate } from '../../middleware/authentication.js'
import { authorize } from '../../middleware/authorization.js'
import { advanceTechnicianOrder, technicianOverview } from './technician-workbench.service.js'

export const technicianWorkbenchRouter = Router()
technicianWorkbenchRouter.use(authenticate, authorize('TECHNICIAN'))

technicianWorkbenchRouter.get('/overview', async (req, res, next) => {
  try { res.json({ data: await technicianOverview(req.auth!.sub) }) } catch (error) { next(error) }
})
technicianWorkbenchRouter.post('/orders/:id/advance', async (req, res, next) => {
  try { res.json({ data: await advanceTechnicianOrder(req.auth!.sub, req.params.id) }) } catch (error) { next(error) }
})
