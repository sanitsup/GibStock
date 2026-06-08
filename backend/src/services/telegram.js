require('dotenv').config()
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')

const TELEGRAM_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

function formatNumber(num) {
  return Number(num).toLocaleString('th-TH')
}

function formatDateTime(date) {
  return date.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

async function sendMessage(text) {
  try {
    await axios.post(`${TELEGRAM_URL}/sendMessage`, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    })
    console.log('✅ ส่งข้อความ Telegram สำเร็จ')
  } catch (error) {
    console.error('❌ Telegram Error:', error.message)
  }
}

async function sendPhoto(imagePath, captionText) {
  try {
    const form = new FormData()
    form.append('chat_id', process.env.TELEGRAM_CHAT_ID)
    form.append('photo', fs.createReadStream(imagePath))
    form.append('caption', captionText)
    form.append('parse_mode', 'HTML')

    await axios.post(`${TELEGRAM_URL}/sendPhoto`, form, {
      headers: form.getHeaders()
    })
    console.log('✅ ส่งรูปภาพ + Caption สำเร็จ')
  } catch (error) {
    console.error('❌ ส่งรูปไม่สำเร็จ ส่งข้อความแทน:', error.message)
    await sendMessage(captionText)
  }
}

// =============================================
// แจ้งเตือนเมื่อมีการขาย (Real-time)
// =============================================
async function sendSaleAlert(order, items, freeQty, discount, freeItems) {

  const now = new Date()
  const dateTime = formatDateTime(now)

  // รายการสินค้าปกติ
  const itemList = items
    .map(i => `📦 สินค้า : ${i.product_name}\n🔢 จำนวน : ${i.qty_sales} ชิ้น\n💰 ราคา/ชิ้น : ${formatNumber(i.order_price)} บาท`)
    .join('\n')

  // รายการของแถม
  let freeText = ''
  if (freeQty > 0 && freeItems && freeItems.length > 0) {
    const freeList = freeItems
      .map(i => `📦 สินค้า : ${i.product_name}\n🔢 จำนวน : ${i.qty_sales} ชิ้น`)
      .join('\n')
    freeText = `🎁 <b>ของแถม:</b>\n${freeList}`
  }

  const paidQty = items.reduce((sum, i) => sum + i.qty_sales, 0)

  const timeOnly = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })

  const message = `
🛍️ <b>แจ้งเตือนรายการขายใหม่!</b> \n

📅 วันที่ขาย : ${dateTime} \n
============================
${itemList}
${freeText ? '────────────────\n' + freeText : ''}

👕 รวมสินค้า   : ${paidQty} ชิ้น
💵 ยอดชำระ  : ${formatNumber(order.grand_total)} บาท
💳 ชำระด้วย : ${order.payment_method}
🕐 เวลาส่ง  : ${timeOnly}
  `.trim()

  await sendMessage(message)
}

// =============================================
// สรุปยอดรายวัน (ส่งอัตโนมัติ 20:15 น.)
// =============================================
async function sendDailySummary(summary, date) {

  const dateTime = formatDateTime(new Date())

  // Top 3 สินค้าขายดี
  const top3Text = summary.topProducts && summary.topProducts.length > 0
    ? summary.topProducts
        .map((p, index) =>
          `  ${index + 1}. ${p.product_name} → ${formatNumber(p.total_qty)} ชิ้น`
        )
        .join('\n')
    : '  ยังไม่มีข้อมูล'

  const summaryCaption = `📊 <b>สรุปยอดประจำวัน</b>
📅 วันที่ : ${dateTime}

🧾 จำนวนบิล   : ${formatNumber(summary.totalBills)} บิล
👕 จำนวนชิ้น  : ${formatNumber(summary.totalItems)} ชิ้น
🎁 แถมฟรี     : ${formatNumber(summary.totalFreeItems)} ชิ้น
========================
💵 รายได้รวม  : ${formatNumber(summary.totalRevenue)} บาท
💸 ค่าใช้จ่าย : ${formatNumber(summary.totalExpenses)} บาท
📈 กำไรสุทธิ  : ${formatNumber(summary.netProfit)} บาท
========================
🏆 <b>สินค้าขายดี Top 3</b>
${top3Text}
========================`

  const logoPath = path.join(__dirname, '../../gibstock_logo.png')
  await sendPhoto(logoPath, summaryCaption)
}

module.exports = { sendSaleAlert, sendDailySummary }
