import 'dotenv/config'
import app from './app'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const PORT = process.env.PORT || 5000
async function main() {
  await prisma.$connect()
  console.log('Database connected')
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}
main().catch(console.error)
