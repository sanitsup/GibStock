require('dotenv').config()
const path = require('path')
const fastify = require('fastify')({ logger: true })
const cron = require('node-cron')
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
// CRON: สรุปยอดรายวัน ทุกวัน 20:15 น.
// =============================================
cron.schedule('15 20 * * *', async () => {
  const today = new Date().toISOString().split('T')[0]

  // ดึงข้อมูล Orders วันนี้
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .gte('date', `${today}T00:00:00`)

  // ดึงข้อมูล Expenses วันนี้
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .gte('datetime', `${today}T00:00:00`)

  // ดึงของแถมวันนี้
  const { data: freeData } = await supabase
    .from('order_detail')
    .select('qty_sales, order_price')
    .eq('free_itemtype', true)
    .gte('datetime', `${today}T00:00:00`)

  // ดึงรายการขายทั้งหมดวันนี้ (ไม่นับของแถม)
  const { data: allDetails } = await supabase
    .from('order_detail')
    .select('product_id_ref, qty_sales, product_type(product_name)')
    .eq('free_itemtype', false)
    .gte('datetime', `${today}T00:00:00`)

  // คำนวณ Top 3 สินค้าขายดี
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

  // เรียงจากขายมากสุด แล้วเอาแค่ Top 3
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, 3)

  const totalRevenue =
    orders?.reduce((s, o) => s + o.grand_total, 0) || 0
  const totalExpenses =
    expenses?.reduce((s, e) => s + e.amount, 0) || 0
  const totalFreeItems =
    freeData?.reduce((s, f) => s + f.qty_sales, 0) || 0

  await sendDailySummary({
    totalBills: orders?.length || 0,
    totalItems: orders?.reduce((s, o) => s + o.total_qty, 0) || 0,
    totalFreeItems,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    topProducts
  }, today)

}, { timezone: 'Asia/Bangkok' })

// ทดสอบส่งสรุปยอดรายวัน (ลบทิ้งหลังทดสอบเสร็จ)
fastify.get('/api/test-summary', async (req, reply) => {
  const today = new Date().toISOString().split('T')[0]

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
    .gte('datetime', `${today}T00:00:00`)

  const { data: allDetails } = await supabase
    .from('order_detail')
    .select('product_id_ref, qty_sales, product_type(product_name)')
    .eq('free_itemtype', false)
    .gte('datetime', `${today}T00:00:00`)

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

  const totalRevenue =
    orders?.reduce((s, o) => s + o.grand_total, 0) || 0
  const totalExpenses =
    expenses?.reduce((s, e) => s + e.amount, 0) || 0
  const totalFreeItems =
    freeData?.reduce((s, f) => s + f.qty_sales, 0) || 0

  await sendDailySummary({
    totalBills: orders?.length || 0,
    totalItems: orders?.reduce((s, o) => s + o.total_qty, 0) || 0,
    totalFreeItems,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    topProducts
  }, today)

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