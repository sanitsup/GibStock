require('dotenv').config()
const path = require('path')
const fastify = require('fastify')({ logger: true })
const supabase = require('./src/services/supabase')
const { sendDailySummary } = require('./src/services/telegram')

fastify.register(require('@fastify/cors'), {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})

fastify.register(require('./src/routes/products'))
fastify.register(require('./src/routes/stock'))
fastify.register(require('./src/routes/orders'))
fastify.register(require('./src/routes/expenses'))
fastify.register(require('./src/routes/reports'))
fastify.register(require('./src/routes/analytics'))

fastify.get('/health', async (req, reply) => {
  const start = Date.now()
  try {
    const { error } = await supabase
      .from('orders')
      .select('order_id')
      .limit(1)
    const latency = Date.now() - start
    if (error) {
      return reply.code(503).send({
        status: 'error',
        db: 'disconnected',
        error: error.message,
        uptime: Math.floor(process.uptime())
      })
    }
    return reply.send({
      status: 'ok',
      db: 'connected',
      db_latency_ms: latency,
      uptime: Math.floor(process.uptime())
    })
  } catch (err) {
    return reply.code(503).send({
      status: 'error',
      db: 'disconnected',
      error: err.message,
      uptime: Math.floor(process.uptime())
    })
  }
})

async function buildAndSendSummary() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .gte('date', `${today}T00:00:00`)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .gte('datetime', `${today}T00:00:00`)

  const { data: freeData } = await supabase
    .from('order_detail')
    .select('qty_sales')
    .eq('free_itemtype', true)

  const { data: allDetails } = await supabase
    .from('order_detail')
    .select('product_id_ref, qty_sales, product_type(product_name)')
    .eq('free_itemtype', false)

  const productMap = {}
  if (allDetails) {
    for (const detail of allDetails) {
      const id = detail.product_id_ref
      const name = detail.product_type?.product_name || 'ไม่ทราบชื่อ'
      if (!productMap[id]) productMap[id] = { product_name: name, total_qty: 0 }
      productMap[id].total_qty += detail.qty_sales
    }
  }

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, 3)

  const totalRevenue   = orders?.reduce((s, o) => s + Number(o.grand_total), 0) || 0
  const totalExpenses  = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0
  const totalFreeItems = freeData?.reduce((s, f) => s + f.qty_sales, 0) || 0

  await sendDailySummary({
    totalBills: orders?.length || 0,
    totalItems: orders?.reduce((s, o) => s + o.total_qty, 0) || 0,
    totalFreeItems,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    topProducts
  }, today)
}

fastify.get('/api/daily-summary', async (req, reply) => {
  try {
    await buildAndSendSummary()
    return reply.send({ success: true, message: 'ส่งสรุปยอดไปแล้วครับ' })
  } catch (err) {
    return reply.code(500).send({ error: err.message })
  }
})

fastify.get('/api/test-summary', async (req, reply) => {
  try {
    await buildAndSendSummary()
    return reply.send({ success: true, message: 'ส่งสรุปยอดไปแล้วครับ' })
  } catch (err) {
    return reply.code(500).send({ error: err.message })
  }
})

fastify.listen(
  { port: process.env.PORT || 3000, host: '0.0.0.0' },
  (err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log('✅ GibSales POS Server กำลังทำงาน!')
  }
)
