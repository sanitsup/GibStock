import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Products
export const getProducts         = ()         => api.get('/api/products')
export const addProduct          = (data)     => api.post('/api/products', data)
export const updateProduct       = (id, data) => api.put(`/api/products/${id}`, data)
export const deleteProduct       = (id)       => api.delete(`/api/products/${id}`)
export const updateProductStatus = (id, status) => api.put(`/api/products/${id}`, { status })

// Stock
export const getStock        = ()     => api.get('/api/stock')
export const addStock        = (data) => api.post('/api/stock', data)
export const getStockHistory = ()     => api.get('/api/stock/history')

// Orders
export const createOrder    = (data) => api.post('/api/orders', data)
export const getOrders      = ()     => api.get('/api/orders')
export const getTodayOrders = ()     => api.get('/api/orders/today')
export const getOrderDetail = (id)   => api.get(`/api/orders/${id}/detail`)   // ใหม่
export const updateOrder    = (id, data) => api.put(`/api/orders/${id}`, data) // ใหม่
export const deleteOrder    = (id)   => api.delete(`/api/orders/${id}`)        // ใหม่

// Reports
export const getDailyReport = (date) => api.get(`/api/reports/daily?date=${date}`)

// Analytics
export const getMonthlyAnalytics = (year) => api.get(`/api/analytics/monthly?year=${year}`)
export const getYearlyAnalytics  = ()     => api.get('/api/analytics/yearly')

// Expenses
export const getExpenses   = (date) => api.get(`/api/expenses?date=${date}`)
export const addExpense    = (data) => api.post('/api/expenses', data)
export const deleteExpense = (id)   => api.delete(`/api/expenses/${id}`)

export default api
