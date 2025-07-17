/* eslint-disable @typescript-eslint/no-explicit-any */
import type { User } from "./types/whatsapp"
import { PhoneNormalizer } from "./phone-normalizer"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

export class UserManager {
  private users: User[] = []

  // ✅ Load nasabah milik user berdasarkan JWT
  async loadUsersFromDatabase(token?: string): Promise<number> {
    console.log("[UserManager] ===== LOADING USERS FOR LOGGED-IN USER =====")

    if (!token) {
      console.error("[UserManager] ❌ No token provided")
      return 0
    }

    if (!JWT_SECRET) {
      console.error("[UserManager] ❌ JWT_SECRET is not set in environment")
      return 0
    }

    let decoded: jwt.JwtPayload

    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    } catch (err: any) {
      console.error("[UserManager] ❌ Invalid JWT Token:", err.message)
      return 0
    }

    const userId = decoded.userId
    if (!userId) {
      console.error("[UserManager] ❌ userId missing in token payload")
      return 0
    }

    console.log("[UserManager] ✅ Decoded userId:", userId)

    const nasabahList = await prisma.nasabah.findMany({
      where: { userId },
      select: {
        id: true,
        nama: true,
        no_hp: true,
        isActive: true,
      },
    })

    return this.processNasabahList(nasabahList)
  }

  private processNasabahList(nasabahList: { id: string, nama: string, no_hp: string, isActive: boolean }[]): number {
    let addedCount = 0
    let skippedCount = 0

    for (const n of nasabahList) {
      const name = n.nama?.trim()
      const phoneRaw = n.no_hp?.trim()

      console.log(`[UserManager] 🔍 Entry:`, {
        id: n.id,
        nama: name,
        no_hp: phoneRaw,
        isActiveFromDB: n.isActive,
      })

      if (!name || !phoneRaw) continue
      if (!PhoneNormalizer.isValid(phoneRaw)) continue

      const phone = PhoneNormalizer.normalize(phoneRaw)
      const existingUser = this.users.find((u) => u.phone === phone)

      if (existingUser) {
        skippedCount++
        continue
      }

      const isActive = n.isActive === true
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

  updateUser(id: string, updates: Partial<User>): User | null {
    const index = this.users.findIndex((u) => u.id === id)
    if (index === -1) return null
    this.users[index] = { ...this.users[index], ...updates }
    return this.users[index]
  }

  deleteUser(id: string): boolean {
    const index = this.users.findIndex((u) => u.id === id)
    if (index === -1) return false
    this.users.splice(index, 1)
    return true
  }

  clearUsers(): void {
    console.log(`[UserManager] 🧹 Cleared ${this.users.length} users`)
    this.users = []
  }

  getUsers(): User[] {
    return [...this.users]
  }

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
