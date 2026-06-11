require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const TABLES = ['product_type', 'stock', 'orders', 'order_detail', 'expenses']
const BACKUP_DIR = path.join(__dirname, '../backups')

const PK_MAP = {
  product_type: 'product_id',
  stock:        'stock_id',
  orders:       'order_id',
  order_detail: 'detail_id',
  expenses:     'expense_id'
}

function getTimestamp() {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Bangkok',
    hour12: false
  }).replace(' ', '_').replace(/:/g, '-')
}

function toInsertSQL(table, rows) {
  if (!rows || rows.length === 0) return `-- ${table}: no data\n`
  const cols = Object.keys(rows[0]).join(', ')
  const values = rows.map(row => {
    const vals = Object.values(row).map(v => {
      if (v === null || v === undefined) return 'NULL'
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
      if (typeof v === 'number') return v
      return `'${String(v).replace(/'/g, "''")}'`
    })
    return `  (${vals.join(', ')})`
  }).join(',\n')
  return `-- Table: ${table} (${rows.length} rows)\nINSERT INTO ${table} (${cols}) VALUES\n${values};\n\n`
}

async function sendTelegramNotify(message) {
  try {
    const axios = require('axios')
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      { chat_id: process.env.TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }
    )
  } catch (err) {
    console.log('  (Telegram notify ไม่สำเร็จ — ไม่กระทบ backup)')
  }
}

async function runBackup() {
  const ts = getTimestamp()
  const outDir = path.join(BACKUP_DIR, ts)
  fs.mkdirSync(outDir, { recursive: true })

  console.log('\n🗄️  GibStock Database Backup')
  console.log(`📅 เวลา: ${ts}`)
  console.log(`📁 บันทึกที่: ${outDir}\n`)

  const sqlParts = []
  const summary = {}

  sqlParts.push(`-- GibStock Database Backup`)
  sqlParts.push(`-- วันที่: ${ts}`)
  sqlParts.push(`-- ────────────────────────────\n`)
  sqlParts.push(`SET session_replication_role = replica;\n`)

  let totalRows = 0
  let hasError = false

  for (const table of TABLES) {
    process.stdout.write(`  ⏳ ${table.padEnd(15)}`)

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(PK_MAP[table])

    if (error) {
      console.log(`❌ ${error.message}`)
      summary[table] = { rows: 0, status: 'ERROR', error: error.message }
      hasError = true
      continue
    }

    const jsonFile = path.join(outDir, `${table}.json`)
    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8')

    sqlParts.push(toInsertSQL(table, data))

    summary[table] = { rows: data.length, status: 'OK' }
    totalRows += data.length
    console.log(`✅ ${data.length} rows`)
  }

  sqlParts.push(`SET session_replication_role = DEFAULT;`)
  const sqlFile = path.join(outDir, `_all_tables.sql`)
  fs.writeFileSync(sqlFile, sqlParts.join('\n'), 'utf8')

  console.log('\n──────────────────────────────')
  console.log('📊 สรุปผล:')
  for (const [t, s] of Object.entries(summary)) {
    const icon = s.status === 'OK' ? '✅' : '❌'
    console.log(`  ${icon} ${t.padEnd(15)} ${s.rows} rows`)
  }
  console.log(`  รวมทั้งหมด: ${totalRows} rows`)
  console.log('──────────────────────────────')

  cleanOldBackups(30)

  if (!hasError) {
    const msg = `✅ <b>GibStock Backup สำเร็จ</b>\n📅 ${ts}\n📦 ${totalRows} rows ใน ${TABLES.length} tables`
    await sendTelegramNotify(msg)
    console.log('\n✅ Backup สำเร็จ! Telegram แจ้งแล้ว\n')
  } else {
    const failedTables = Object.entries(summary).filter(([,s]) => s.status === 'ERROR').map(([t]) => t).join(', ')
    const msg = `❌ <b>GibStock Backup มีข้อผิดพลาด</b>\n📅 ${ts}\nตาราง: ${failedTables}`
    await sendTelegramNotify(msg)
    console.log('\n⚠️  Backup เสร็จบางส่วน — มี error ดูรายละเอียดข้างบน\n')
    process.exit(1)
  }
}

function cleanOldBackups(keepDays) {
  try {
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000
    const items = fs.readdirSync(BACKUP_DIR)
    let cleaned = 0
    for (const item of items) {
      const full = path.join(BACKUP_DIR, item)
      if (fs.statSync(full).isDirectory() && fs.statSync(full).mtimeMs < cutoff) {
        fs.rmSync(full, { recursive: true })
        cleaned++
      }
    }
    if (cleaned > 0) console.log(`  🧹 ลบ backup เก่า ${cleaned} ชุด (เกิน ${keepDays} วัน)`)
  } catch (e) {
    console.log('  (cleanOldBackups error:', e.message, ')')
  }
}

runBackup().catch(err => {
  console.error('\n❌ Backup ล้มเหลวทั้งหมด:', err.message)
  process.exit(1)
})
