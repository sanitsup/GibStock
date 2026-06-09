const supabase = require('../services/supabase')
const { calculatePromotion } = require('../services/promotion')
const { sendSaleAlert, sendLowStockAlert } = require('../services/telegram')

async function orderRoutes(fastify) {

  // ─── POST /api/orders ──────────────────────────────────────────────────
  fastify.post('/api/orders', async (req, reply) => {
    const { items, payment_method } = req.body

    // ── Input Validation ──
    if (!items || !Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ error: 'items ต้องมีอย่างน้อย 1 รายการ' })
    }
    if (!['cash', 'transfer'].includes(payment_method)) {
      return reply.code(400).send({ error: 'payment_method ต้องเป็น cash หรือ transfer เท่านั้น' })
    }
    const invalidItem = items.find(i => !i.free_itemtype && (!i.qty_sales || i.qty_sales < 1 || !Number.isInteger(i.qty_sales)))
    if (invalidItem) {
      return reply.code(400).send({ error: 'qty_sales ต้องเป็นจำนวนเต็มบวก' })
    }
    const invalidProduct = items.find(i => !i.product_id_ref)
    if (invalidProduct) {
      return reply.code(400).send({ error: 'product_id_ref ต้องระบุทุกรายการ' })
    }

    // ── คำนวณโปรโมชัน ──
    const normalItems = items.filter(i => !i.free_itemtype)
    const freeItemsFromFrontend = items.filter(i => i.free_itemtype)
    const promotion = calculatePromotion(normalItems)
    const { freeQty, grandTotal } = promotion
    const totalQty = normalItems.reduce((sum, i) => sum + i.qty_sales, 0)

    // ── บันทึก orders ──
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_qty: totalQty + freeQty,
        grand_total: grandTotal,
        payment_method: payment_method
      })
      .select()
      .single()
    if (orderError) return reply.code(500).send({ error: orderError.message })

    // ── บันทึก order_detail ──
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
    if (detailError) return reply.code(500).send({ error: detailError.message })

    // ── ส่ง Telegram sale alert ──
    try {
      await sendSaleAlert(order, normalItems, freeQty, 0, freeItemsFromFrontend)
    } catch (err) {
      console.error('[Telegram] sendSaleAlert ล้มเหลว:', err.message)
    }

    // ── ตรวจสต็อกหลังขาย → แจ้งเตือนถ้าใกล้หมด ──
    try {
      const soldProductIds = normalItems.map(i => i.product_id_ref)

      const { data: stockData } = await supabase
        .from('product_type')
        .select(`
          product_id,
          product_name,
          initial_stock,
          stock ( qty_added ),
          order_detail ( qty_sales, free_itemtype )
        `)
        .in('product_id', soldProductIds)
        .eq('status', 'active')

      if (stockData) {
        const lowStockItems = []

        for (const p of stockData) {
          const added = (p.stock || []).reduce((s, r) => s + r.qty_added, 0)
          const sold = (p.order_detail || [])
            .filter(d => !d.free_itemtype)
            .reduce((s, d) => s + d.qty_sales, 0)
          const remaining = p.initial_stock + added - sold

          if (remaining <= 5) {
            lowStockItems.push({ product_name: p.product_name, remaining })
          }
        }

        if (lowStockItems.length > 0) {
          await sendLowStockAlert(lowStockItems)
        }
      }
    } catch (err) {
      console.error('[Stock Alert] ตรวจสต็อกล้มเหลว:', err.message)
    }

    return reply.send({
      success: true,
      order_id: order.order_id,
      total_qty: totalQty,
      free_qty: freeQty,
      grand_total: grandTotal
    })
  })

  // ─── GET /api/orders ───────────────────────────────────────────────────
  fastify.get('/api/orders', async (req, reply) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('date', { ascending: false })
      .limit(50)
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // ─── GET /api/orders/today ─────────────────────────────────────────────
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
      total_revenue: data.reduce((s, o) => s + Number(o.grand_total), 0)
    }
    return reply.send(summary)
  })

  // ─── GET /api/orders/:id/detail ───────────────────────────────────────
  fastify.get('/api/orders/:id/detail', async (req, reply) => {
    const { id } = req.params

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', id)
      .single()
    if (orderError) return reply.code(404).send({ error: 'ไม่พบ order นี้' })

    const { data: details, error: detailError } = await supabase
      .from('order_detail')
      .select(`
        detail_id,
        product_id_ref,
        free_itemtype,
        order_price,
        qty_sales,
        subtotal,
        product_type ( product_name )
      `)
      .eq('order_id', id)
    if (detailError) return reply.code(500).send({ error: detailError.message })

    return reply.send({ order, details })
  })

  // ─── DELETE /api/orders/:id ───────────────────────────────────────────
  fastify.delete('/api/orders/:id', async (req, reply) => {
    const { id } = req.params

    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('order_id')
      .eq('order_id', id)
      .single()
    if (findError || !order) return reply.code(404).send({ error: 'ไม่พบ order นี้' })

    const { error: detailError } = await supabase
      .from('order_detail')
      .delete()
      .eq('order_id', id)
    if (detailError) return reply.code(500).send({ error: detailError.message })

    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('order_id', id)
    if (orderError) return reply.code(500).send({ error: orderError.message })

    return reply.send({ success: true, message: `ลบ Order #${id} เรียบร้อยแล้ว` })
  })

  // ─── PUT /api/orders/:id ──────────────────────────────────────────────
  fastify.put('/api/orders/:id', async (req, reply) => {
    const { id } = req.params
    const { items, payment_method } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ error: 'items ต้องมีอย่างน้อย 1 รายการ' })
    }

    const { data: existingOrder, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', id)
      .single()
    if (findError || !existingOrder) return reply.code(404).send({ error: 'ไม่พบ order นี้' })

    const normalItems = items.filter(i => !i.free_itemtype)
    const freeItemsFromFrontend = items.filter(i => i.free_itemtype)
    const { freeQty, grandTotal } = calculatePromotion(normalItems)
    const totalQty = normalItems.reduce((sum, i) => sum + i.qty_sales, 0)

    const { error: deleteDetailError } = await supabase
      .from('order_detail')
      .delete()
      .eq('order_id', id)
    if (deleteDetailError) return reply.code(500).send({ error: deleteDetailError.message })

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        total_qty: totalQty + freeQty,
        grand_total: grandTotal,
        payment_method: payment_method || existingOrder.payment_method
      })
      .eq('order_id', id)
    if (updateOrderError) return reply.code(500).send({ error: updateOrderError.message })

    const normalItemsData = normalItems.map(i => ({
      order_id: Number(id),
      product_id_ref: i.product_id_ref,
      free_itemtype: false,
      order_price: i.order_price,
      qty_sales: i.qty_sales,
      subtotal: i.order_price * i.qty_sales
    }))
    const freeItemsData = freeItemsFromFrontend.map(i => ({
      order_id: Number(id),
      product_id_ref: i.product_id_ref,
      free_itemtype: true,
      order_price: 0,
      qty_sales: i.qty_sales,
      subtotal: 0
    }))

    const { error: insertDetailError } = await supabase
      .from('order_detail')
      .insert([...normalItemsData, ...freeItemsData])
    if (insertDetailError) return reply.code(500).send({ error: insertDetailError.message })

    return reply.send({
      success: true,
      order_id: Number(id),
      total_qty: totalQty,
      free_qty: freeQty,
      grand_total: grandTotal,
      message: `แก้ไข Order #${id} เรียบร้อยแล้ว`
    })
  })

}

module.exports = orderRoutes
