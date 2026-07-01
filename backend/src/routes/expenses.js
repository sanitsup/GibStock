const supabase = require('../services/supabase')

async function expenseRoutes(fastify) {
  // ดูค่าใช้จ่าย
  fastify.get('/api/expenses', async (req, reply) => {
    const { date } = req.query
    let query = supabase
      .from('expenses')
      .select('*')
      .order('datetime', { ascending: false })
    if (date) {
      const start = `${date}T00:00:00+07:00`
      const end   = `${date}T23:59:59+07:00`
      query = query.gte('datetime', start).lte('datetime', end)
    } else {
      query = query.limit(50)
    }
    const { data, error } = await query
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // บันทึกค่าใช้จ่าย
  fastify.post('/api/expenses', async (req, reply) => {
    const { amount, description } = req.body
    if (!amount || !description) {
      return reply.code(400).send({ error: 'กรุณากรอก amount และ description' })
    }
    const { data, error } = await supabase
      .from('expenses')
      .insert({ amount, description })
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })
    return reply.send(data)
  })

  // ✅ แก้ไขค่าใช้จ่าย (ใหม่)
  fastify.put('/api/expenses/:id', async (req, reply) => {
    const { id } = req.params
    const { amount, description, datetime } = req.body
    if (!amount || !description) {
      return reply.code(400).send({ error: 'กรุณากรอก amount และ description' })
    }
    const updateData = { amount, description }
    if (datetime) updateData.datetime = datetime
    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('expense_id', id)
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
