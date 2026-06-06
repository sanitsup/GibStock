const supabase = require('../services/supabase')

async function productRoutes(fastify) {

  // ดึงสินค้าทั้งหมด
  fastify.get('/api/products', async (req, reply) => {
    const { data, error } = await supabase
      .from('product_type')
      .select('*')
      .order('product_name')

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // เพิ่มสินค้าใหม่
  fastify.post('/api/products', async (req, reply) => {
    const { product_name, price, initial_stock } = req.body

    const { data, error } = await supabase
      .from('product_type')
      .insert({ product_name, price, initial_stock })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // แก้ไขสินค้า
  fastify.put('/api/products/:id', async (req, reply) => {
    const { id } = req.params
    const { product_name, price } = req.body

    const { data, error } = await supabase
      .from('product_type')
      .update({ product_name, price })
      .eq('product_id', id)
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // ลบสินค้า
  fastify.delete('/api/products/:id', async (req, reply) => {
    const { id } = req.params

    const { error } = await supabase
      .from('product_type')
      .delete()
      .eq('product_id', id)

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send({ success: true })
  })
}

module.exports = productRoutes