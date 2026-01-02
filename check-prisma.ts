import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const props = Object.getOwnPropertyNames(prisma).filter(p => !p.startsWith('_'))
const fs = require('fs')
fs.writeFileSync('prisma-props.json', JSON.stringify(props, null, 2))
process.exit(0)
