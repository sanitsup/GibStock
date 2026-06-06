const path = require('path')
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
})
const { createClient } = require('@supabase/supabase-js')

// ตรวจสอบว่ามีค่าจริงไหม
if (!process.env.SUPABASE_URL) {
  throw new Error('❌ ไม่พบ SUPABASE_URL ใน .env')
}
if (!process.env.SUPABASE_KEY) {
  throw new Error('❌ ไม่พบ SUPABASE_KEY ใน .env')
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

console.log('✅ เชื่อมต่อ Supabase สำเร็จ')

module.exports = supabase