// ===== PHONE NORMALIZATION UTILITY =====
export class PhoneNormalizer {
    static normalize(phone: string): string {
        console.log(`[PhoneNormalizer] 🔧 Normalizing phone: "${phone}"`)

        // Remove all non-digits
        let normalizedPhone = phone.replace(/\D/g, "")
        console.log(`[PhoneNormalizer] After removing non-digits: "${normalizedPhone}"`)

        // Handle Indonesian phone numbers
        if (normalizedPhone.startsWith("0")) {
            // Convert 08xxx to 628xxx
            normalizedPhone = "62" + normalizedPhone.substring(1)
            console.log(`[PhoneNormalizer] Converted 0 prefix to 62: "${normalizedPhone}"`)
        } else if (!normalizedPhone.startsWith("62")) {
            // Add 62 prefix if not present
            normalizedPhone = "62" + normalizedPhone
            console.log(`[PhoneNormalizer] Added 62 prefix: "${normalizedPhone}"`)
        }

        console.log(`[PhoneNormalizer] ✅ Final normalized phone: "${phone}" → "${normalizedPhone}"`)
        return normalizedPhone
    }

    static isValid(phone: string): boolean {
        const normalized = this.normalize(phone)
        return normalized.length >= 12 // Minimum 62 + 10 digits
    }

    static toChatId(phone: string): string {
        const normalized = this.normalize(phone)
        return `${normalized}@c.us`
    }
}
