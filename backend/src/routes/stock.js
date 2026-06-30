const supabase = require('../services/supabase')

async function stockRoutes(fastify) {
  // ดูสต็อกคงเหลือทั้งหมด
  fastify.get('/api/stock', async (req, reply) => {
    const { data: products, error } = await supabase
      .from('product_type')
      .select('product_id, product_name, price, initial_stock')

    if (error) return reply.code(500).send({ error: error.message })

    const stockList = await Promise.all(
      products.map(async (product) => {
        const { data: stockIn } = await supabase
          .from('stock')
          .select('qty_added')
          .eq('product_id', product.product_id)

        const { data: stockOut } = await supabase
          .from('order_detail')
          .select('qty_sales')
          .eq('product_id_ref', product.product_id)
          // ✅ ลบ .eq('free_itemtype', false) ออก
          // เพื่อให้ของแถมตัดสต็อกด้วย (แค่ไม่คิดราคา)

        const totalAdded = stockIn?.reduce((s, i) => s + i.qty_added, 0) || 0
        const totalSold = stockOut?.reduce((s, i) => s + i.qty_sales, 0) || 0
        const remaining = product.initial_stock + totalAdded - totalSold

        return {
          product_id: product.product_id,
          product_name: product.product_name,
          price: product.price,
          initial_stock: product.initial_stock,
          total_added: totalAdded,
          total_sold: totalSold,
          remaining
        }
      })
    )

    return reply.send(stockList)
  })

  // เติมสต็อก
  fastify.post('/api/stock', async (req, reply) => {
    const { product_id, qty_added } = req.body

    const { data: product, error: productError } = await supabase
      .from('product_type')
      .select('product_name')
      .eq('product_id', product_id)
      .single()

    if (productError)
      return reply.code(500).send({ error: productError.message })

    const { data, error } = await supabase
      .from('stock')
      .insert({
        product_id,
        product_name: product.product_name,
        qty_added
      })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // ประวัติการเติมสต็อก
  fastify.get('/api/stock/history', async (req, reply) => {
    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .order('added_at', { ascending: false })
      .limit(50)

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })
}

module.exports = stockRoutes
