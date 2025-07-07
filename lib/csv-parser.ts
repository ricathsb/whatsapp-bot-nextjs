// ===== CSV PARSER UTILITY =====
import type { CSVParseResult, ColumnIndices } from "./types/whatsapp"

export class CSVParser {
    private static readonly NAME_VARIATIONS = [
        "name",
        "nama",
        "full_name",
        "fullname",
        "customer_name",
        "client_name",
        "first_name",
        "last_name",
        "person_name",
        "contact_name",
        "user_name",
        "nama_lengkap",
        "nama_customer",
        "nama_klien",
        "nama_peserta",
    ]

    private static readonly PHONE_VARIATIONS = [
        "phone",
        "telephone",
        "mobile",
        "cell",
        "whatsapp",
        "wa",
        "hp",
        "telepon",
        "phone_number",
        "mobile_number",
        "cell_number",
        "contact_number",
        "nomor_hp",
        "nomor_telepon",
        "nomor_wa",
        "nomor_whatsapp",
        "no_hp",
        "no_wa",
    ]

    static parse(csvContent: string): CSVParseResult {
        console.log("[CSVParser] Starting CSV parsing...")

        const lines = csvContent.split("\n").filter((line) => line.trim())
        if (lines.length === 0) {
            throw new Error("CSV file is empty")
        }

        // Detect separator and parse headers
        const headerLine = lines[0]
        let separator: string

        if (headerLine.includes(";")) {
            separator = ";"
        } else if (headerLine.includes("\t")) {
            separator = "\t"
        } else {
            separator = ","
        }

        const headers = headerLine.split(separator).map((h) => h.trim().replace(/['"]/g, "").toLowerCase())

        // Parse rows
        const rows: string[][] = []
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const row = line.split(separator).map((cell) => cell.trim().replace(/['"]/g, ""))
            rows.push(row)
        }

        console.log(`[CSVParser] Parsed ${rows.length} data rows`)
        return { headers, rows }
    }

    static findColumnIndices(headers: string[]): ColumnIndices {
        let nameIndex = -1
        let phoneIndex = -1

        // Find name column
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase()
            for (const variation of this.NAME_VARIATIONS) {
                if (header.includes(variation)) {
                    nameIndex = i
                    break
                }
            }
            if (nameIndex !== -1) break
        }

        // Find phone column
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase()
            for (const variation of this.PHONE_VARIATIONS) {
                if (header.includes(variation)) {
                    phoneIndex = i
                    break
                }
            }
            if (phoneIndex !== -1) break
        }

        // Generate suggestions if columns not found
        let suggestions = ""
        if (nameIndex === -1 || phoneIndex === -1) {
            suggestions += "\n🔍 COLUMN DETECTION RESULTS:\n"
            suggestions += `Available columns: ${headers.map((h, i) => `"${h}" (${i + 1})`).join(", ")}\n\n`

            if (nameIndex === -1) {
                suggestions += "❌ Name column not found automatically.\n"
                suggestions += `Expected variations: ${this.NAME_VARIATIONS.slice(0, 8).join(", ")}\n`
            }

            if (phoneIndex === -1) {
                suggestions += "❌ Phone column not found automatically.\n"
                suggestions += `Expected variations: ${this.PHONE_VARIATIONS.slice(0, 8).join(", ")}\n`
            }

            suggestions += "\n💡 SOLUTIONS:\n"
            suggestions += "1. Rename your CSV headers to include 'name' and 'phone'\n"
            suggestions += "2. Use headers like: 'nama', 'telepon', 'hp', 'wa'\n"
        }

        return { nameIndex, phoneIndex, suggestions }
    }
}
