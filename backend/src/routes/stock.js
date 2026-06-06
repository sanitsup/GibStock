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

        // รวมที่เติมเข้ามาทั้งหมด
        const { data: stockIn } = await supabase
          .from('stock')
          .select('qty_added')
          .eq('product_id', product.product_id)

        // รวมที่ขายออกไปทั้งหมด
        const { data: stockOut } = await supabase
          .from('order_detail')
          .select('qty_sales')
          .eq('product_id_ref', product.product_id)
          .eq('free_itemtype', false)

        const totalAdded = stockIn?.reduce(
          (s, i) => s + i.qty_added, 0
        ) || 0

        const totalSold = stockOut?.reduce(
          (s, i) => s + i.qty_sales, 0
        ) || 0

        return {
          product_id: product.product_id,
          product_name: product.product_name,
          price: product.price,
          initial_stock: product.initial_stock,
          total_added: totalAdded,
          total_sold: totalSold,
          stock_remaining: product.initial_stock + totalAdded - totalSold
        }
      })
    )

    return reply.send(stockList)
  })

  // เติมสต็อก
  fastify.post('/api/stock', async (req, reply) => {
    const { product_id, product_name, qty_added } = req.body

    const { data, error } = await supabase
      .from('stock')
      .insert({ product_id, product_name, qty_added })
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