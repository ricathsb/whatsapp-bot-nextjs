// ===== TYPES & INTERFACES =====

export interface Nasabah {
    id: string
    nama: string
    no_hp: string
    isSended: boolean
}

export interface BotStatus {
    isRunning: boolean
    isReady: boolean
    qrCode?: string
    contactsCount: number
    messagesSent: number
    error?: string
    lastActivity?: Date
}

export interface ChatMessage {
    from: string
    content: string
    timestamp: Date
    isIncoming: boolean
}

export interface ChatHistory {
    [phone: string]: ChatMessage[]
}

export interface CSVParseResult {
    headers: string[]
    rows: string[][]
}

export interface ColumnIndices {
    nameIndex: number
    phoneIndex: number
    suggestions: string
}

export interface AIResponse {
    reply?: string
    error?: string
}
