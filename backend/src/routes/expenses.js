const supabase = require('../services/supabase')

async function expenseRoutes(fastify) {

  // ดูค่าใช้จ่ายทั้งหมด
  fastify.get('/api/expenses', async (req, reply) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('datetime', { ascending: false })
      .limit(50)

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // บันทึกค่าใช้จ่าย
  fastify.post('/api/expenses', async (req, reply) => {
    const { category, amount } = req.body

    const { data, error } = await supabase
      .from('expenses')
      .insert({ category, amount })
      .select()
      .single()

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // ลบค่าใช้จ่าย
  fastify.delete('/api/expenses/:id', async (req, reply) => {
    const { id } = req.params

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('expense_id', id)

    if (error) return reply.code(500).send({ error: error.message })
    return reply.send({ success: true })
  })
}

module.exports = expenseRoutes