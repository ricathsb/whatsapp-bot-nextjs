import type { User } from "./types/whatsapp"
import { PhoneNormalizer } from "./phone-normalizer"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export class UserManager {
    private users: User[] = []

    addUser(name: string, phone: string): User {
        const normalizedPhone = PhoneNormalizer.normalize(phone)

        const existingUserByPhone = this.users.find((u) => u.phone === normalizedPhone)
        if (existingUserByPhone) {
            console.log(`[UserManager] User with phone ${normalizedPhone} already exists, skipping ${name}`)
            return existingUserByPhone
        }

        const user: User = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name,
            phone: normalizedPhone,
            isActive: false,
            createdAt: new Date(),
        }

        this.users.push(user)
        console.log(`[UserManager] Added new user: ${name} (${normalizedPhone})`)
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
        const userIndex = this.users.findIndex((u) => u.id === id)
        if (userIndex === -1) return false

        this.users.splice(userIndex, 1)
        return true
    }

    toggleUserStatus(id: string): User | null {
        const user = this.users.find((u) => u.id === id)
        if (!user) return null

        user.isActive = !user.isActive
        user.lastActivity = new Date()
        console.log(`[UserManager] User ${user.name} status: ${user.isActive ? "ACTIVE" : "INACTIVE"}`)
        return user
    }

    activateAllUsers(): number {
        let activatedCount = 0
        this.users.forEach((user) => {
            if (!user.isActive) {
                user.isActive = true
                user.lastActivity = new Date()
                activatedCount++
            }
        })
        console.log(`[UserManager] 🟢 Activated ${activatedCount} users`)
        return activatedCount
    }

    deactivateAllUsers(): number {
        let deactivatedCount = 0
        this.users.forEach((user) => {
            if (user.isActive) {
                user.isActive = false
                user.lastActivity = new Date()
                deactivatedCount++
            }
        })
        console.log(`[UserManager] 🔴 Deactivated ${deactivatedCount} users`)
        return deactivatedCount
    }

    getActiveUsers(): User[] {
        return this.users.filter((u) => u.isActive)
    }

    isUserActive(phone: string): boolean {
        const normalizedPhone = PhoneNormalizer.normalize(phone)
        const user = this.users.find((u) => u.phone === normalizedPhone)
        const isActive = user ? user.isActive : false

        if (user) {
            console.log(`[UserManager] User ${user.name}: ${isActive ? "ACTIVE" : "INACTIVE"}`)
        } else {
            console.log(`[UserManager] User NOT FOUND for phone: ${normalizedPhone}`)
        }

        return isActive
    }

    clearUsers(): void {
        console.log(`[UserManager] Clearing all ${this.users.length} users`)
        this.users = []
    }

    async loadUsersFromDatabase(): Promise<number> {
        console.log("[UserManager] ===== LOADING USERS FROM DATABASE =====")

        const nasabahList = await prisma.nasabah.findMany({
            select: {
                nama: true,
                no_hp: true,
            },
        })

        let addedCount = 0
        let skippedCount = 0

        for (const n of nasabahList) {
            const name = n.nama.trim()
            const phoneRaw = n.no_hp.trim()

            if (!name || !phoneRaw) continue
            if (!PhoneNormalizer.isValid(phoneRaw)) continue

            const phone = PhoneNormalizer.normalize(phoneRaw)
            const existingUser = this.users.find((u) => u.phone === phone)

            if (existingUser) {
                skippedCount++
                continue
            }

            this.addUser(name, phone)
            addedCount++
        }

        console.log("[UserManager] ===== DATABASE LOADING SUMMARY =====")
        console.log(`[UserManager] Successfully added: ${addedCount}`)
        console.log(`[UserManager] Skipped (duplicates): ${skippedCount}`)
        console.log(`[UserManager] Total users in system: ${this.users.length}`)

        return addedCount
    }
}
