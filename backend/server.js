require('dotenv').config()
const path = require('path')
const fastify = require('fastify')({ logger: true })
const supabase = require('./src/services/supabase')
const { sendDailySummary } = require('./src/services/telegram')

// เปิดใช้ CORS
fastify.register(require('@fastify/cors'), {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})

// ลงทะเบียน Routes ทั้งหมด
fastify.register(require('./src/routes/products'))
fastify.register(require('./src/routes/stock'))
fastify.register(require('./src/routes/orders'))
fastify.register(require('./src/routes/expenses'))
fastify.register(require('./src/routes/reports'))
fastify.register(require('./src/routes/analytics'))

// Health Check
fastify.get('/health', async () => ({ status: 'ok' }))

// =============================================
// Endpoint สำหรับส่งสรุปยอดรายวัน
// (ถูกเรียกโดย cron-job.org เวลา 20:15 น.)
// =============================================
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
    .select('qty_sales, order_price')
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
      if (!productMap[id]) {
        productMap[id] = { product_name: name, total_qty: 0 }
      }
      productMap[id].total_qty += detail.qty_sales
    }
  }

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, 3)

  const totalRevenue = orders?.reduce((s, o) => s + o.grand_total, 0) || 0
  const totalExpenses = expenses?.reduce((s, e) => s + e.amount, 0) || 0
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

// Endpoint สำหรับ cron-job.org เรียกตอน 20:15 น.
fastify.get('/api/daily-summary', async (req, reply) => {
  await buildAndSendSummary()
  return reply.send({ success: true, message: 'ส่งสรุปยอดไปแล้วครับ' })
})

// Endpoint ทดสอบ
fastify.get('/api/test-summary', async (req, reply) => {
  await buildAndSendSummary()
  return reply.send({ success: true, message: 'ส่งสรุปยอดไปแล้วครับ' })
})

// เริ่ม Server
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
