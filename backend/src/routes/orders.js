const supabase = require('../services/supabase')
const { calculatePromotion } = require('../services/promotion')
const { sendSaleAlert } = require('../services/telegram')

async function orderRoutes(fastify) {

  // ─── POST /api/orders (เดิม) ───────────────────────────────────────────
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
      })
      .select()
      .single()
    if (orderError) return reply.code(500).send({ error: orderError.message })

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

    await sendSaleAlert(order, normalItems, freeQty, 0, freeItemsFromFrontend)

    return reply.send({
      success: true,
      order_id: order.order_id,
      total_qty: totalQty,
      free_qty: freeQty,
      grand_total: grandTotal
    })
  })

  // ─── GET /api/orders (เดิม) ────────────────────────────────────────────
  fastify.get('/api/orders', async (req, reply) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('date', { ascending: false })
      .limit(50)
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // ─── GET /api/orders/today (เดิม) ──────────────────────────────────────
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

  // ─── GET /api/orders/:id/detail (ใหม่) ─────────────────────────────────
  // ดึงรายละเอียด order_detail สำหรับ modal แก้ไข
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

  // ─── DELETE /api/orders/:id (ใหม่) ─────────────────────────────────────
  // ลบ order + order_detail → สต็อกคืนค่าอัตโนมัติ (คำนวณจาก query)
  fastify.delete('/api/orders/:id', async (req, reply) => {
    const { id } = req.params

    // ตรวจว่า order มีอยู่จริง
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('order_id')
      .eq('order_id', id)
      .single()
    if (findError || !order) return reply.code(404).send({ error: 'ไม่พบ order นี้' })

    // ลบ order_detail ก่อน (FK constraint)
    const { error: detailError } = await supabase
      .from('order_detail')
      .delete()
      .eq('order_id', id)
    if (detailError) return reply.code(500).send({ error: detailError.message })

    // ลบ orders หัวบิล
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('order_id', id)
    if (orderError) return reply.code(500).send({ error: orderError.message })

    return reply.send({ success: true, message: `ลบ Order #${id} เรียบร้อยแล้ว` })
  })

  // ─── PUT /api/orders/:id (ใหม่) ────────────────────────────────────────
  // แก้ไข order = ลบ order_detail เก่า + คำนวณใหม่ + บันทึกใหม่
  fastify.put('/api/orders/:id', async (req, reply) => {
    const { id } = req.params
    const { items, payment_method } = req.body

    // ตรวจว่า order มีอยู่จริง
    const { data: existingOrder, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', id)
      .single()
    if (findError || !existingOrder) return reply.code(404).send({ error: 'ไม่พบ order นี้' })

    // คำนวณโปรโมชันจากรายการใหม่
    const normalItems = items.filter(i => !i.free_itemtype)
    const freeItemsFromFrontend = items.filter(i => i.free_itemtype)
    const { freeQty, grandTotal } = calculatePromotion(normalItems)
    const totalQty = normalItems.reduce((sum, i) => sum + i.qty_sales, 0)

    // ลบ order_detail เก่าทั้งหมด
    const { error: deleteDetailError } = await supabase
      .from('order_detail')
      .delete()
      .eq('order_id', id)
    if (deleteDetailError) return reply.code(500).send({ error: deleteDetailError.message })

    // อัปเดตหัวบิล orders
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        total_qty: totalQty + freeQty,
        grand_total: grandTotal,
        payment_method: payment_method || existingOrder.payment_method
      })
      .eq('order_id', id)
    if (updateOrderError) return reply.code(500).send({ error: updateOrderError.message })

    // Insert order_detail ใหม่
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
