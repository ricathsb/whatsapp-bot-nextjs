import type { User } from "./types/whatsapp"
import { PhoneNormalizer } from "./phone-normalizer"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export class UserManager {
  private users: User[] = []

  // ✅ Load user dari DB dan isi ke memory
  async loadUsersFromDatabase(): Promise<number> {
    console.log("[UserManager] ===== LOADING USERS FROM DATABASE =====")

    const nasabahList = await prisma.nasabah.findMany({
      select: {
        id: true,
        nama: true,
        no_hp: true,
        isActive: true,
      },
    })

    console.log("[UserManager] Raw data from DB:", nasabahList)

    let addedCount = 0
    let skippedCount = 0

    for (const n of nasabahList) {
      const name = n.nama?.trim()
      const phoneRaw = n.no_hp?.trim()

      if (!name || !phoneRaw) continue
      if (!PhoneNormalizer.isValid(phoneRaw)) continue

      const phone = PhoneNormalizer.normalize(phoneRaw)
      const existingUser = this.users.find((u) => u.phone === phone)

      if (existingUser) {
        skippedCount++
        continue
      }

      const isActive = n.isActive === true // pastikan benar boolean true
      console.log(`[UserManager] ➕ ${name} (${phone}) - isActive: ${isActive}`)

      this.addUser(name, phone, isActive, n.id)
      addedCount++
    }

    console.log("[UserManager] ===== LOAD SUMMARY =====")
    console.log(`🟢 Added: ${addedCount}`)
    console.log(`⚠️ Skipped (duplicate phone): ${skippedCount}`)
    console.log(`📋 Total in memory: ${this.users.length}`)

    return addedCount
  }

  // ➕ Tambahkan user ke memori
  addUser(name: string, phone: string, isActive = true, id?: string): User {
    const normalizedPhone = PhoneNormalizer.normalize(phone)

    const existingUser = this.users.find((u) => u.phone === normalizedPhone)
    if (existingUser) return existingUser

    const user: User = {
      id: id ?? (Date.now().toString() + Math.random().toString(36).substr(2, 9)),
      name,
      phone: normalizedPhone,
      createdAt: new Date(),
      isActive,
    }

    this.users.push(user)
    return user
  }

  // 🟡 Update data user
  updateUser(id: string, updates: Partial<User>): User | null {
    const index = this.users.findIndex((u) => u.id === id)
    if (index === -1) return null
    this.users[index] = { ...this.users[index], ...updates }
    return this.users[index]
  }

  // ❌ Hapus user berdasarkan ID
  deleteUser(id: string): boolean {
    const index = this.users.findIndex((u) => u.id === id)
    if (index === -1) return false
    this.users.splice(index, 1)
    return true
  }

  // 🧹 Bersihkan semua user dari memori
  clearUsers(): void {
    console.log(`[UserManager] 🧹 Cleared ${this.users.length} users`)
    this.users = []
  }

  // 🔁 Kembalikan semua user
  getUsers(): User[] {
    return [...this.users]
  }

  // 🚫 Set semua user menjadi tidak aktif
  deactivateAllUsers(): number {
    let count = 0
    this.users.forEach((user) => {
      if (user.isActive) {
        user.isActive = false
        count++
      }
    })
    console.log(`[UserManager] 🔕 Deactivated ${count} users`)
    return count
  }
}
