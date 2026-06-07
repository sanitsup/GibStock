const supabase = require('../services/supabase')

async function productRoutes(fastify) {
  fastify.get('/api/products', async (req, reply) => {
    const { data, error } = await supabase
      .from('product_type')
      .select('*')
      .order('product_name')
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  fastify.post('/api/products', async (req, reply) => {
    const { product_name, price, initial_stock } = req.body
    const { data, error } = await supabase
      .from('product_type')
      .insert({ product_name, price, initial_stock, status: 'active' })
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  fastify.put('/api/products/:id', async (req, reply) => {
    const { id } = req.params
    const { product_name, price, status } = req.body
    const updateData = { product_name, price }
    if (status) updateData.status = status
    const { data, error } = await supabase
      .from('product_type')
      .update(updateData)
      .eq('product_id', id)
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  fastify.delete('/api/products/:id', async (req, reply) => {
    const { id } = req.params
    const { error: detailError } = await supabase
      .from('order_detail')
      .delete()
      .eq('product_id_ref', id)
    if (detailError) return reply.code(500).send({ error: detailError.message })

    const { error: stockError } = await supabase
      .from('stock')
      .delete()
      .eq('product_id', id)
    if (stockError) return reply.code(500).send({ error: stockError.message })

    const { error } = await supabase
      .from('product_type')
      .delete()
      .eq('product_id', id)
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send({ success: true })
  })
}

module.exports = productRoutes
