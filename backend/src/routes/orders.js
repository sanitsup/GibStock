const supabase = require('../services/supabase')
const { calculatePromotion } = require('../services/promotion')
const { sendSaleAlert } = require('../services/telegram')

async function orderRoutes(fastify) {

  // บันทึกการขาย
  fastify.post('/api/orders', async (req, reply) => {
    const { items, payment_method } = req.body

    // 1. คำนวณโปรโมชัน 10 แถม 1
    const promotion = calculatePromotion(items)
    const { freeQty, discountAmount, freeItems } = promotion

    // 2. คำนวณยอดรวม
    // grandTotal มาจาก promotion แล้ว (ชิ้นที่ซื้อ × 100)
     const totalQty = items.reduce(
      (sum, i) => sum + i.qty_sales, 0
    )
    const grandTotal = promotion.grandTotal

    // 3. บันทึก Orders (หัวบิล)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_qty: totalQty + freeQty,
        grand_total: grandTotal,
        payment_method: payment_method || 'cash'
      })
      .select()
      .single()

    if (orderError)
      return reply.code(500).send({ error: orderError.message })

    // 4. เตรียมรายการสินค้าปกติ
    const normalItems = items.map(i => ({
      order_id: order.order_id,
      product_id_ref: i.product_id_ref,
      free_itemtype: false,
      order_price: i.order_price,
      qty_sales: i.qty_sales,
      subtotal: i.order_price * i.qty_sales
    }))

    // 5. เตรียมรายการของแถม
    const freeItemsData = freeItems.map(i => ({
      order_id: order.order_id,
      product_id_ref: i.product_id_ref,
      free_itemtype: true,
      order_price: i.order_price,
      qty_sales: i.qty_sales,
      subtotal: 0
    }))

    // 6. บันทึก Order_Detail
    const { error: detailError } = await supabase
      .from('order_detail')
      .insert([...normalItems, ...freeItemsData])

    if (detailError)
      return reply.code(500).send({ error: detailError.message })

    // 7. ส่ง Telegram แจ้งเตือน
    // 7. ส่ง Telegram แจ้งเตือน (ส่ง freeItems ไปด้วย)
await sendSaleAlert(order, items, freeQty, discountAmount, freeItems)

    return reply.send({
      success: true,
      order_id: order.order_id,
      total_qty: totalQty,
      free_qty: freeQty,
      discount: discountAmount,
      grand_total: grandTotal
    })
  })

  // ดูประวัติการขาย
  fastify.get('/api/orders', async (req, reply) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('date', { ascending: false })
      .limit(50)

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // ดูรายงานวันนี้
  fastify.get('/api/orders/today', async (req, reply) => {
    const today = new Date().toISOString().split('T')[0]

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