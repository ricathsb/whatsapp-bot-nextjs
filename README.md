# WhatsApp Bot Dashboard

Sistem WhatsApp Bot otomatis dengan dashboard web untuk mengelola pesan massal dan user management.

## 🚀 Fitur Utama

- **Auto User Management** - User otomatis aktif saat bot start, nonaktif saat bot stop
- **Bulk Messaging** - Kirim pesan ke banyak kontak sekaligus
- **CSV Upload** - Import kontak dan user dari file CSV
- **AI Response** - Bot otomatis membalas pesan dari user aktif
- **Real-time Dashboard** - Monitor status bot dan aktivitas secara real-time
- **User Management** - Kelola status aktif/nonaktif user individual

## 📋 Persyaratan

- Node.js 18+ 
- npm atau yarn
- Chrome/Chromium (untuk WhatsApp Web)

## ⚡ Cara Menjalankan

### 1. Clone & Install
\`\`\`bash
git clone <repository-url>
cd whatsapp-bot-nextjs-master
npm install
\`\`\`

### 2. Jalankan Development Server
\`\`\`bash
npm run dev
\`\`\`

### 3. Buka Dashboard
Akses: \`http://localhost:3000\`

### 4. Start Bot
1. Klik tombol **"🚀 Start Bot + Activate All Users"**
2. Scan QR Code dengan WhatsApp di HP Anda
3. Tunggu status berubah menjadi **"Ready"**
4. Bot siap digunakan!

## 📁 Upload Kontak

### Format CSV
Buat file CSV dengan format:
\`\`\`csv
name,phone
John Doe,6281234567890
Jane Smith,6287654321098
Bob Wilson,6285555555555
\`\`\`

### Cara Upload
1. Klik **"Upload CSV"** di dashboard
2. Pilih file CSV Anda
3. Kontak otomatis dimuat untuk messaging
4. User otomatis ditambah ke management table

## 💬 Kirim Pesan Massal

### 1. Siapkan Template Pesan
- Gunakan \`{name}\` untuk nama kontak
- Contoh: \`Halo {name}, selamat datang!\`

### 2. Kirim Pesan
1. Pastikan bot status **"Ready"**
2. Pastikan ada kontak yang sudah diupload
3. Klik **"Send Messages"**
4. Bot akan kirim pesan ke semua kontak

## 👥 User Management

### Auto Management
- **Start Bot** → Semua user otomatis **AKTIF**
- **Stop Bot** → Semua user otomatis **NONAKTIF**

### Manual Management
- Toggle individual user: Klik switch di tabel user
- Bulk activate: Klik **"Activate All"**
- Bulk deactivate: Klik **"Deactivate All"**

### Penting!
⚠️ **Bot hanya membalas pesan dari user yang statusnya AKTIF**

## 🤖 AI Response

Bot otomatis membalas pesan masuk dari user aktif menggunakan AI service.

### Cara Kerja:
1. User aktif kirim pesan → Bot terima
2. Bot kirim ke AI service untuk generate jawaban
3. Bot kirim balasan otomatis ke user

## 📊 Dashboard Features

### Status Cards
- **Bot Status**: Ready/Starting/Stopped
- **Contacts**: Jumlah kontak yang diupload
- **Messages Sent**: Total pesan terkirim
- **Bot Control**: Start/Stop bot

### Activity Logs
Monitor semua aktivitas bot secara real-time:
- Bot start/stop
- CSV upload
- User activation/deactivation
- Message sending progress

### User Management Table
- Lihat semua user dan status mereka
- Edit nama/nomor user
- Toggle status aktif/nonaktif
- Hapus user

## 🔧 Troubleshooting

### Bot Tidak Start
- Pastikan port 3000 tidak digunakan aplikasi lain
- Restart development server: \`Ctrl+C\` lalu \`npm run dev\`

### QR Code Tidak Muncul
- Refresh halaman browser
- Pastikan koneksi internet stabil

### CSV Upload Gagal
- Pastikan format CSV benar: \`name,phone\`
- Pastikan nomor telepon minimal 10 digit
- Cek console browser untuk error detail

### Bot Tidak Membalas
- Pastikan user yang kirim pesan statusnya **AKTIF**
- Cek di User Management table
- Pastikan bot status **"Ready"**

## 📱 Format Nomor Telepon

### Format yang Benar:
- \`6281234567890\` ✅
- \`+6281234567890\` ✅  
- \`081234567890\` ✅

### Format yang Salah:
- \`81234567890\` ❌ (kurang 62)
- \`123456\` ❌ (terlalu pendek)

## 🛑 Stop Bot

Klik **"🛑 Stop Bot + Deactivate All Users"** untuk:
- Menghentikan bot service
- Menonaktifkan semua user otomatis
- Membersihkan session WhatsApp

## 💡 Tips

1. **Backup Data**: Export user list sebelum clear data
2. **Test Dulu**: Coba kirim ke 1-2 kontak dulu sebelum bulk
3. **Monitor Logs**: Selalu cek activity logs untuk debug
4. **User Status**: Ingat user harus aktif untuk terima balasan bot
5. **QR Code**: Scan ulang QR jika bot disconnect

## 🔄 Development

### Structure
\`\`\`
app/
├── api/whatsapp/          # WhatsApp API endpoints
├── api/users/             # User management API
├── page.tsx               # Main dashboard
components/
├── user-management.tsx    # User management component
├── ui/                    # UI components
lib/
├── whatsapp-service.ts    # Core WhatsApp service
\`\`\`

### Build Production
\`\`\`bash
npm run build
npm start
\`\`\`

---

**Selamat menggunakan WhatsApp Bot Dashboard! 🎉**

Jika ada pertanyaan atau masalah, cek troubleshooting section atau lihat console logs untuk detail error.
