require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const BACKUP_DIR = path.join(__dirname, '../backups')

// ลำดับการ restore ต้องถูกต้องตาม FK
const RESTORE_ORDER = ['product_type', 'stock', 'orders', 'order_detail', 'expenses']

// ลำดับการลบต้องกลับกัน (ลบลูกก่อนพ่อ)
const DELETE_ORDER = ['order_detail', 'orders', 'stock', 'expenses', 'product_type']

const PK_MAP = {
  product_type: 'product_id',
  stock:        'stock_id',
  orders:       'order_id',
  order_detail: 'detail_id',
  expenses:     'expense_id'
}

function listBackups() {
  const dirs = fs.readdirSync(BACKUP_DIR)
    .filter(d => fs.statSync(path.join(BACKUP_DIR, d)).isDirectory())
    .sort()
    .reverse()
  return dirs
}

async function runRestore(targetFolder) {
  console.log('\n🔄 GibStock Database Restore')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ── ถ้าไม่ระบุ folder แสดงรายการให้เลือก ──
  if (!targetFolder) {
    const backups = listBackups()
    if (backups.length === 0) {
      console.log('❌ ไม่พบ backup ใดๆ ใน', BACKUP_DIR)
      process.exit(1)
    }
    console.log('📂 Backup ที่มีอยู่ (ล่าสุดก่อน):')
    backups.forEach((b, i) => console.log(`  ${i + 1}. ${b}`))
    console.log('\n📌 วิธีใช้: node scripts/restore.js <ชื่อโฟลเดอร์>')
    console.log('   ตัวอย่าง: node scripts/restore.js ' + backups[0])
    process.exit(0)
  }

  const restoreDir = path.join(BACKUP_DIR, targetFolder)
  if (!fs.existsSync(restoreDir)) {
    console.log(`❌ ไม่พบโฟลเดอร์ backup: ${targetFolder}`)
    console.log('   รัน node scripts/restore.js เพื่อดูรายการ backup ที่มีอยู่')
    process.exit(1)
  }

  // ── ตรวจสอบไฟล์ JSON ครบไหม ──
  console.log('📋 ตรวจสอบไฟล์ backup...')
  for (const table of RESTORE_ORDER) {
    const file = path.join(restoreDir, `${table}.json`)
    if (!fs.existsSync(file)) {
      console.log(`❌ ไม่พบไฟล์ ${table}.json ใน backup นี้`)
      process.exit(1)
    }
    console.log(`  ✅ ${table}.json พบแล้ว`)
  }

  // ── ยืนยันก่อน restore ──
  console.log(`\n⚠️  กำลังจะ RESTORE จาก: ${targetFolder}`)
  console.log('⚠️  ข้อมูลปัจจุบันใน Database จะถูกแทนที่ทั้งหมด!')
  console.log('\n   ถ้าต้องการดำเนินการต่อ รัน:')
  console.log(`   node scripts/restore.js ${targetFolder} --confirm\n`)

  if (!process.argv.includes('--confirm')) {
    console.log('❌ ยกเลิก — ไม่มี --confirm flag')
    process.exit(0)
  }

  console.log('✅ ได้รับการยืนยัน เริ่ม Restore...\n')

  // ── ลบข้อมูลเก่าตามลำดับ FK ──
  console.log('🗑️  ลบข้อมูลเก่า...')
  for (const table of DELETE_ORDER) {
    process.stdout.write(`  ⏳ ลบ ${table.padEnd(15)}`)
    const { error } = await supabase.from(table).delete().neq(PK_MAP[table], 0)
    if (error) {
      console.log(`❌ ${error.message}`)
      process.exit(1)
    }
    console.log('✅')
  }

  // ── Insert ข้อมูลใหม่ตามลำดับ FK ──
  console.log('\n📥 กู้คืนข้อมูล...')
  const summary = {}

  for (const table of RESTORE_ORDER) {
    const file = path.join(restoreDir, `${table}.json`)
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'))

    if (rows.length === 0) {
      console.log(`  ⏭️  ${table.padEnd(15)} ไม่มีข้อมูล ข้าม`)
      summary[table] = 0
      continue
    }

    process.stdout.write(`  ⏳ ${table.padEnd(15)}`)

    // Insert ทีละ 100 rows เพื่อป้องกัน payload ใหญ่เกิน
    const CHUNK = 100
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { error } = await supabase.from(table).insert(chunk)
      if (error) {
        console.log(`❌ ${error.message}`)
        process.exit(1)
      }
    }

    summary[table] = rows.length
    console.log(`✅ ${rows.length} rows`)
  }

  // ── สรุปผล ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 สรุปผลการ Restore:')
  const total = Object.values(summary).reduce((s, n) => s + n, 0)
  for (const [t, n] of Object.entries(summary)) {
    console.log(`  ✅ ${t.padEnd(15)} ${n} rows`)
  }
  console.log(`  รวมทั้งหมด: ${total} rows`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✅ Restore สำเร็จ!\n')
}

const targetFolder = process.argv[2]
runRestore(targetFolder).catch(err => {
  console.error('\n❌ Restore ล้มเหลว:', err.message)
  process.exit(1)
})
