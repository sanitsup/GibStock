import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

export const getProducts = () => api.get('/api/products')
export const addProduct = (data) => api.post('/api/products', data)
export const updateProduct = (id, data) => api.put(`/api/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/api/products/${id}`)
export const updateProductStatus = (id, status) => api.put(`/api/products/${id}`, { status })

export const getStock = () => api.get('/api/stock')
export const addStock = (data) => api.post('/api/stock', data)
export const getStockHistory = () => api.get('/api/stock/history')

export const createOrder = (data) => api.post('/api/orders', data)
export const getOrders = () => api.get('/api/orders')
export const getTodayOrders = () => api.get('/api/orders/today')

export const getExpenses = () => api.get('/api/expenses')
export const addExpense = (data) => api.post('/api/expenses', data)
export const deleteExpense = (id) => api.delete(`/api/expenses/${id}`)

export default api
