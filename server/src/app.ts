import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { authRouter } from './modules/auth/auth.routes.js'
import { orderRouter } from './modules/orders/order.routes.js'
import { profileRouter } from './modules/profile/profile.routes.js'
import { technicianRouter } from './modules/technicians/technician.routes.js'
import { errorHandler } from './middleware/error-handler.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { technicianWorkbenchRouter } from './modules/technician-workbench/technician-workbench.routes.js'
import { serviceRouter } from './modules/services/service.routes.js'

const app = express()
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(',') ?? true }))
app.use(express.json({ limit: '160kb' }))
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }))
app.use('/api/auth', authRouter)
app.use('/api/technicians', technicianRouter)
app.use('/api/services', serviceRouter)
app.use('/api/orders', orderRouter)
app.use('/api/profile', profileRouter)
app.use('/api/admin', adminRouter)
app.use('/api/technician-workbench', technicianWorkbenchRouter)
app.use(errorHandler)

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => console.log(`Luohan API ready at http://localhost:${port}`))
