const supabase = require('../services/supabase')
const { calculatePromotion } = require('../services/promotion')
const { sendSaleAlert } = require('../services/telegram')

async function orderRoutes(fastify) {
  fastify.post('/api/orders', async (req, reply) => {
    const { items, payment_method } = req.body

    const normalItems = items.filter(i => !i.free_itemtype)
    const freeItemsFromFrontend = items.filter(i => i.free_itemtype)

    const promotion = calculatePromotion(normalItems)
    const { freeQty, grandTotal } = promotion
    const totalQty = normalItems.reduce((sum, i) => sum + i.qty_sales, 0)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_qty: totalQty + freeQty,
        grand_total: grandTotal,
        payment_method: payment_method || 'cash'
        // ไม่ต้องส่ง date — Supabase ใช้เวลาไทยอัตโนมัติแล้ว
      })
      .select()
      .single()

    if (orderError)
      return reply.code(500).send({ error: orderError.message })

    const normalItemsData = normalItems.map(i => ({
      order_id: order.order_id,
      product_id_ref: i.product_id_ref,
      free_itemtype: false,
      order_price: i.order_price,
      qty_sales: i.qty_sales,
      subtotal: i.order_price * i.qty_sales
    }))

    const freeItemsData = freeItemsFromFrontend.map(i => ({
      order_id: order.order_id,
      product_id_ref: i.product_id_ref,
      free_itemtype: true,
      order_price: 0,
      qty_sales: i.qty_sales,
      subtotal: 0
    }))

    const { error: detailError } = await supabase
      .from('order_detail')
      .insert([...normalItemsData, ...freeItemsData])

    if (detailError)
      return reply.code(500).send({ error: detailError.message })

    await sendSaleAlert(order, normalItems, freeQty, 0, freeItemsFromFrontend)

    return reply.send({
      success: true,
      order_id: order.order_id,
      total_qty: totalQty,
      free_qty: freeQty,
      grand_total: grandTotal
    })
  })

  fastify.get('/api/orders', async (req, reply) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('date', { ascending: false })
      .limit(50)
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  fastify.get('/api/orders/today', async (req, reply) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('date', `${today}T00:00:00`)
      .lte('date', `${today}T23:59:59`)
    if (error) return reply.code(500).send({ error: error.message })
    const summary = {
      total_bills: data.length,
      total_items: data.reduce((s, o) => s + o.total_qty, 0),
      total_revenue: data.reduce((s, o) => s + o.grand_total, 0)
    }
    return reply.send(summary)
  })
}

module.exports = orderRoutes
