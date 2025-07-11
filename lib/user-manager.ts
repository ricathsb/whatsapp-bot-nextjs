import type { User } from "./types/whatsapp"
import { PhoneNormalizer } from "./phone-normalizer"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export class UserManager {
  private users: User[] = []

  addUser(name: string, phone: string, isActive = true, id?: string): User {
  const normalizedPhone = PhoneNormalizer.normalize(phone)

  const existingUserByPhone = this.users.find((u) => u.phone === normalizedPhone)
  if (existingUserByPhone) {
    return existingUserByPhone
  }

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


  getUsers(): User[] {
    return [...this.users]
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const userIndex = this.users.findIndex((u) => u.id === id)
    if (userIndex === -1) return null

    this.users[userIndex] = { ...this.users[userIndex], ...updates }
    return this.users[userIndex]
  }

  deleteUser(id: string): boolean {
    console.log("deleting")
    const userIndex = this.users.findIndex((u) => u.id === id)
    if (userIndex === -1) return false
    this.users.splice(userIndex, 1)
    return true
  }

  clearUsers(): void {
    console.log(`[UserManager] 🧹 Clearing all ${this.users.length} users`)
    this.users = []
  }

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

      this.addUser(name, phone, n.isActive ?? true) // ⬅️ oper ke addUser
      addedCount++
    }

    console.log("[UserManager] ===== DATABASE LOADING SUMMARY =====")
    console.log(`[UserManager] Successfully added: ${addedCount}`)
    console.log(`[UserManager] Skipped (duplicates): ${skippedCount}`)
    console.log(`[UserManager] Total users in system: ${this.users.length}`)

    return addedCount
  }
}
