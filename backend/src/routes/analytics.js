const supabase = require('../services/supabase')

async function analyticsRoutes(fastify) {

  // GET /api/analytics/monthly?year=2026
  fastify.get('/api/analytics/monthly', async (req, reply) => {
    const year = req.query.year || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).slice(0, 4)
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('date, grand_total, total_qty, payment_method')
        .gte('date', `${year}-01-01T00:00:00`)
        .lte('date', `${year}-12-31T23:59:59`)
      if (error) throw error
      const monthlyMap = {}
      for (let m = 1; m <= 12; m++) {
        const key = String(m).padStart(2, '0')
        monthlyMap[key] = {
          month: m,
          monthLabel: new Date(2000, m - 1, 1).toLocaleDateString('th-TH', { month: 'short' }),
          totalRevenue: 0, totalOrders: 0, totalQty: 0, cashTotal: 0, transferTotal: 0
        }
      }
      orders.forEach(o => {
        const month = o.date.slice(5, 7)
        if (!monthlyMap[month]) return
        monthlyMap[month].totalRevenue += o.grand_total || 0
        monthlyMap[month].totalOrders += 1
        monthlyMap[month].totalQty += o.total_qty || 0
        if (o.payment_method === 'cash') monthlyMap[month].cashTotal += o.grand_total || 0
        else monthlyMap[month].transferTotal += o.grand_total || 0
      })
      const monthly = Object.values(monthlyMap)
      const totalRevenue = monthly.reduce((s, m) => s + m.totalRevenue, 0)
      const totalOrders = monthly.reduce((s, m) => s + m.totalOrders, 0)
      const bestMonth = monthly.reduce((best, m) => m.totalRevenue > best.totalRevenue ? m : best, monthly[0])
      return reply.send({ year, monthly, summary: { totalRevenue, totalOrders, bestMonth: bestMonth.monthLabel } })
    } catch (err) {
      return reply.status(500).send({ error: err.message })
    }
  })

  // GET /api/analytics/yearly
  fastify.get('/api/analytics/yearly', async (req, reply) => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('date, grand_total, total_qty, payment_method')
        .order('date', { ascending: true })
      if (error) throw error
      const yearlyMap = {}
      orders.forEach(o => {
        const year = o.date.slice(0, 4)
        if (!yearlyMap[year]) yearlyMap[year] = { year, totalRevenue: 0, totalOrders: 0, totalQty: 0 }
        yearlyMap[year].totalRevenue += o.grand_total || 0
        yearlyMap[year].totalOrders += 1
        yearlyMap[year].totalQty += o.total_qty || 0
      })
      const yearly = Object.values(yearlyMap).sort((a, b) => a.year - b.year)
      return reply.send({ yearly })
    } catch (err) {
      return reply.status(500).send({ error: err.message })
    }
  })

  // GET /api/analytics/profit/monthly?year=2026
  fastify.get('/api/analytics/profit/monthly', async (req, reply) => {
    const year = req.query.year || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).slice(0, 4)
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders').select('date, grand_total')
        .gte('date', `${year}-01-01T00:00:00`).lte('date', `${year}-12-31T23:59:59`)
      if (ordersError) throw ordersError
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses').select('datetime, amount')
        .gte('datetime', `${year}-01-01T00:00:00`).lte('datetime', `${year}-12-31T23:59:59`)
      if (expensesError) throw expensesError
      const monthlyMap = {}
      for (let m = 1; m <= 12; m++) {
        const key = String(m).padStart(2, '0')
        monthlyMap[key] = {
          month: m,
          monthLabel: new Date(2000, m - 1, 1).toLocaleDateString('th-TH', { month: 'short' }),
          revenue: 0, expense: 0, profit: 0
        }
      }
      orders.forEach(o => {
        const month = o.date.slice(5, 7)
        if (monthlyMap[month]) monthlyMap[month].revenue += o.grand_total || 0
      })
      expenses.forEach(e => {
        const month = e.datetime.slice(5, 7)
        if (monthlyMap[month]) monthlyMap[month].expense += Number(e.amount) || 0
      })
      const monthly = Object.values(monthlyMap).map(m => ({ ...m, profit: m.revenue - m.expense }))
      const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0)
      const totalExpense = monthly.reduce((s, m) => s + m.expense, 0)
      const totalProfit = totalRevenue - totalExpense
      return reply.send({ year, monthly, summary: { totalRevenue, totalExpense, totalProfit } })
    } catch (err) {
      return reply.status(500).send({ error: err.message })
    }
  })

  // GET /api/analytics/profit/yearly
  fastify.get('/api/analytics/profit/yearly', async (req, reply) => {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders').select('date, grand_total').order('date', { ascending: true })
      if (ordersError) throw ordersError
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses').select('datetime, amount').order('datetime', { ascending: true })
      if (expensesError) throw expensesError
      const yearlyMap = {}
      orders.forEach(o => {
        const year = o.date.slice(0, 4)
        if (!yearlyMap[year]) yearlyMap[year] = { year, revenue: 0, expense: 0, profit: 0 }
        yearlyMap[year].revenue += o.grand_total || 0
      })
      expenses.forEach(e => {
        const year = e.datetime.slice(0, 4)
        if (!yearlyMap[year]) yearlyMap[year] = { year, revenue: 0, expense: 0, profit: 0 }
        yearlyMap[year].expense += Number(e.amount) || 0
      })
      const yearly = Object.values(yearlyMap)
        .map(y => ({ ...y, profit: y.revenue - y.expense }))
        .sort((a, b) => a.year - b.year)
      return reply.send({ yearly })
    } catch (err) {
      return reply.status(500).send({ error: err.message })
    }
  })

  // GET /api/analytics/trends?from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get('/api/analytics/trends', async (req, reply) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    const from = req.query.from || thirtyDaysAgo
    const to   = req.query.to   || today

    try {
      // ดึง orders ในช่วงวันที่เลือก
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('order_id, date, grand_total, total_qty, payment_method')
        .gte('date', `${from}T00:00:00+07:00`)
        .lte('date', `${to}T23:59:59+07:00`)
      if (ordersError) throw ordersError

      // ดึง order_detail พร้อม join product_type เพื่อได้ชื่อสินค้า
      const orderIds = orders.map(o => o.order_id)
      let topProducts = []

      if (orderIds.length > 0) {
        const { data: details, error: detailError } = await supabase
          .from('order_detail')
          .select('product_id_ref, qty_sales, subtotal, free_itemtype, product_type(product_name, price)')
          .in('order_id', orderIds)
          .eq('free_itemtype', false)
        if (detailError) throw detailError

        // รวมยอดแต่ละสินค้า
        const productMap = {}
        details.forEach(d => {
          const id = d.product_id_ref
          const name = d.product_type?.product_name || `สินค้า #${id}`
          if (!productMap[id]) productMap[id] = { product_id: id, product_name: name, totalQty: 0, totalRevenue: 0 }
          productMap[id].totalQty += d.qty_sales || 0
          productMap[id].totalRevenue += d.subtotal || 0
        })

        topProducts = Object.values(productMap)
          .sort((a, b) => b.totalQty - a.totalQty)
          .slice(0, 5)
      }

      // วันที่ขายดีสุด Top 5
      const dayMap = {}
      orders.forEach(o => {
        const day = o.date.slice(0, 10)
        if (!dayMap[day]) dayMap[day] = { date: day, totalRevenue: 0, totalOrders: 0 }
        dayMap[day].totalRevenue += o.grand_total || 0
        dayMap[day].totalOrders += 1
      })
      const topDays = Object.values(dayMap)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5)
        .map(d => ({
          ...d,
          dateLabel: new Date(d.date + 'T00:00:00').toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: 'numeric'
          })
        }))

      // เดือนที่ขายดีสุด
      const monthMap = {}
      orders.forEach(o => {
        const month = o.date.slice(0, 7)
        if (!monthMap[month]) monthMap[month] = { month, totalRevenue: 0, totalOrders: 0 }
        monthMap[month].totalRevenue += o.grand_total || 0
        monthMap[month].totalOrders += 1
      })
      const topMonths = Object.values(monthMap)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 3)
        .map(m => ({
          ...m,
          monthLabel: new Date(m.month + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
        }))

      // สรุปรวม
      const totalRevenue = orders.reduce((s, o) => s + (o.grand_total || 0), 0)
      const totalOrders  = orders.length

      return reply.send({
        from, to,
        summary: { totalRevenue, totalOrders },
        topDays,
        topMonths,
        topProducts
      })
    } catch (err) {
      console.error('Trends error:', err)
      return reply.status(500).send({ error: err.message })
    }
  })

}

module.exports = analyticsRoutes
