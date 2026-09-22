import { closeSync, existsSync, openSync } from 'node:fs'
import { resolve } from 'node:path'

const databasePath = resolve('prisma/dev.db')
if (!existsSync(databasePath)) closeSync(openSync(databasePath, 'a'))
