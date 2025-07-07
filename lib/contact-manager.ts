// ===== CONTACT MANAGER =====
import type { Contact } from "./types/whatsapp"
import { PhoneNormalizer } from "./phone-normalizer"
import { CSVParser } from "./csv-parser"

export class ContactManager {
    private contacts: Contact[] = []

    async loadContactsFromCSV(csvContent: string): Promise<number> {
        console.log("[ContactManager] ===== LOADING CONTACTS FROM CSV =====")
        this.contacts = []

        const { headers, rows } = CSVParser.parse(csvContent)
        const { nameIndex, phoneIndex } = CSVParser.findColumnIndices(headers)

        if (nameIndex === -1 || phoneIndex === -1) {
            throw new Error("Cannot find required name and phone columns in CSV")
        }

        console.log(`[ContactManager] Processing ${rows.length} contact rows...`)

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            if (row.length <= Math.max(nameIndex, phoneIndex)) continue

            const name = row[nameIndex]?.trim()
            const phoneRaw = row[phoneIndex]?.trim()

            if (!name || !phoneRaw) continue
            if (!PhoneNormalizer.isValid(phoneRaw)) continue

            const phone = PhoneNormalizer.normalize(phoneRaw)
            this.contacts.push({ name, phone })
        }

        console.log(`[ContactManager] ✅ Loaded ${this.contacts.length} contacts`)
        return this.contacts.length
    }

    getContacts(): Contact[] {
        return [...this.contacts]
    }

    getContactsCount(): number {
        return this.contacts.length
    }

    clearContacts(): void {
        this.contacts = []
    }
}
