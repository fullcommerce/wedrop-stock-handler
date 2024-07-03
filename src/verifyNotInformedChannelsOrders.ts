import { prisma } from './database/prismaClient'
import { integrationsNames } from './integrationsNames'

let isRunning = false
export async function verifyOrders() {
  if (isRunning) {
    return
  }
  isRunning = true
  const orders = await prisma.orders.findMany({
    where: {
      status: 2,
      string_channel: 'Não informado',
      picking_id: 0,
    },
  })

  for (const order of orders) {
    const integration = await prisma.integrations.findFirst({
      where: {
        id: order.integration_id,
      },
    })
    const integrationName = integrationsNames.find(
      (integrationName) =>
        integrationName.keyword.trim() === integration?.keyword.trim() ||
        integration.name.trim() === integrationName.name.trim(),
    )
    if (!integrationName) {
      console.log(integration.keyword, integration.name)
      console.log('Integration name not found')
      continue
    }
    await prisma.orders.update({
      where: {
        id: order.id,
      },
      data: {
        string_channel: integrationName.name,
        pickup_name: integrationName.name,
      },
    })
    console.log(`Order ${order.id} updated with ${integrationName.name}`)
  }
  isRunning = false
}
