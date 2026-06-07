const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

async function reportsRoutes(fastify) {
  fastify.get('/api/reports/daily', async (req, reply) => {
    const { date } = req.query

    // ใช้เวลาไทย เพราะ Supabase เก็บเวลาไทยอยู่แล้ว
    const targetDate = date || new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Bangkok'
    })

    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('date', `${targetDate}T00:00:00`)
        .lte('date', `${targetDate}T23:59:59`)
        .order('date', { ascending: true })

      if (ordersError) throw ordersError

      if (!orders || orders.length === 0) {
        return reply.send({
          date: targetDate,
          summary: {
            totalOrders: 0,
            totalQty: 0,
            totalRevenue: 0,
            cashTotal: 0,
            transferTotal: 0,
            freeItemsTotal: 0
          },
          productSummary: [],
          freeSummary: [],
          orders: []
        })
      }

      const orderIds = orders.map(o => o.order_id)

      const { data: details, error: detailsError } = await supabase
        .from('order_detail')
        .select('*')
        .in('order_id', orderIds)

      if (detailsError) throw detailsError

      const { data: products, error: productsError } = await supabase
        .from('product_type')
        .select('product_id, product_name, price')

      if (productsError) throw productsError

      const productMap = {}
      products.forEach(p => { productMap[p.product_id] = p })

      const totalRevenue = orders.reduce((sum, o) => sum + (o.grand_total || 0), 0)
      const cashTotal = orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.grand_total || 0), 0)
      const transferTotal = orders.filter(o => o.payment_method === 'transfer').reduce((sum, o) => sum + (o.grand_total || 0), 0)
      const totalQty = orders.reduce((sum, o) => sum + (o.total_qty || 0), 0)

      const freeRows = details.filter(d => d.free_itemtype === true)
      const salesRows = details.filter(d => d.free_itemtype !== true)
      const freeItemsTotal = freeRows.length

      const productSalesMap = {}
      salesRows.forEach(d => {
        const pid = d.product_id_ref
        if (!pid) return
        if (!productSalesMap[pid]) {
          productSalesMap[pid] = {
            product_id: pid,
            product_name: productMap[pid]?.product_name || 'ไม่ทราบ',
            price: productMap[pid]?.price || 0,
            qty_sales: 0,
            subtotal: 0
          }
        }
        productSalesMap[pid].qty_sales += d.qty_sales || 0
        productSalesMap[pid].subtotal += d.subtotal || 0
      })

      const freeItemMap = {}
      freeRows.forEach(d => {
        const pid = d.product_id_ref
        if (!pid) return
        if (!freeItemMap[pid]) {
          freeItemMap[pid] = {
            product_id: pid,
            product_name: productMap[pid]?.product_name || 'ไม่ทราบ',
            freeQty: 0
          }
        }
        freeItemMap[pid].freeQty += d.qty_sales || 1
      })

      const productSummary = Object.values(productSalesMap).sort((a, b) => b.qty_sales - a.qty_sales)
      const freeSummary = Object.values(freeItemMap).sort((a, b) => b.freeQty - a.freeQty)

      return reply.send({
        date: targetDate,
        summary: {
          totalOrders: orders.length,
          totalQty,
          totalRevenue,
          cashTotal,
          transferTotal,
          freeItemsTotal
        },
        productSummary,
        freeSummary,
        orders: orders.map(o => ({
          ...o,
          details: details.filter(d => d.order_id === o.order_id).map(d => ({
            ...d,
            product_name: productMap[d.product_id_ref]?.product_name || '',
            free_item_name: d.free_itemtype === true ? (productMap[d.product_id_ref]?.product_name || '') : null
          }))
        }))
      })

    } catch (err) {
      console.error('Report error:', err)
      return reply.status(500).send({ error: err.message })
    }
  })
}

module.exports = reportsRoutes
