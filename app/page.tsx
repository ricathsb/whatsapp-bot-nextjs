/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageCircle, Users, Send, Upload, Trash2, RefreshCw } from "lucide-react"
import { UserManagement } from "@/components/user-management"
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

interface BotStatus {
    isRunning: boolean
    isReady: boolean
    qrCode?: string
    contactsCount: number
    usersCount: number
    messagesSent: number
    error?: string
}

export default function WhatsAppBot() {
    const [status, setStatus] = useState<BotStatus>({
        isRunning: false,
        isReady: false,
        contactsCount: 0,
        usersCount: 0,
        messagesSent: 0,
    })
    const [message, setMessage] = useState(
        "Halo {name},\n" +
        "Universitas Terbuka (UT) kini membuka pendaftaran melalui platform SalutSoul.\n" +
        "\n" +
        "Dapatkan kemudahan akses layanan dan informasi terkini.\n" +
        "\n" +
        "Daftar sekarang di:\n" +
        "👉 salutsoul.com/pendaftaran"
    )
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [logs, setLogs] = useState<string[]>([])

    useEffect(() => {
        const eventSource = new EventSource(`${basePath}/api/sse/`)
        eventSource.onmessage = (event) => {
            const payload = JSON.parse(event.data)
            if (payload.type === "status") {
                setStatus((prev) => ({
                    ...prev,
                    ...payload,
                }))
            }
            if (payload.type === "qr") {
                setStatus((prev) => ({
                    ...prev,
                    qrCode: payload.qrCode,
                }))
            }
            if (payload.type === "chat-update") {
                setLogs((prev) => [...prev, `📩 New message from ${payload.contact?.name || payload.phone}`])
            }
        }

        eventSource.onerror = (err) => {
            console.error("SSE error:", err)
            eventSource.close()
        }

        return () => {
            eventSource.close()
        }
    }, [])
    const [isStarting, setIsStarting] = useState(false)
    const startBot = async () => {
        setIsStarting(true)
        try {
            const response = await fetch(`${basePath}/api/whatsapp/start`, {
                method: "POST",
            })
            const data = await response.json()
            if (data.success) {
                setLogs((prev) => [...prev, "Bot started successfully", "🟢 All users have been automatically activated"])
                window.dispatchEvent(new CustomEvent("bulkUserUpdate"))
            } else {
                setLogs((prev) => [...prev, `Error: ${data.error}`])
            }
        } catch (error) {
            setLogs((prev) => [...prev, `Failed to start bot: ${error}`])
        } finally {
            setIsStarting(false)
        }
    }

    const [isStopping, setIsStopping] = useState(false)

    const stopBot = async () => {
        setIsStopping(true) // ⏳ Mulai loading
        try {
            const response = await fetch(`${basePath}/api/whatsapp/stop`, {
                method: "POST",
            })
            const data = await response.json()
            if (data.success) {
                setLogs((prev) => [
                    ...prev,
                    "Bot stopped successfully",
                    "🔴 All users have been automatically deactivated",
                ])
                window.dispatchEvent(new CustomEvent("bulkUserUpdate"))
            }
        } catch (error) {
            setLogs((prev) => [...prev, `Failed to stop bot: ${error}`])
        } finally {
            setIsStopping(false) // ✅ Selesai loading
        }
    }


    const reloadBotData = async () => {
        try {
            const response = await fetch(`${basePath}/api/whatsapp/reload-bot-data`, {
                method: "POST",
            })
            const data = await response.json()
            if (data.success) {
                setLogs((prev) => [...prev, "♻️ Reload bot data successfully"])
                window.dispatchEvent(new CustomEvent("bulkUserUpdate"))
            } else {
                setLogs((prev) => [...prev, `Reload failed: ${data.error}`])
            }
        } catch (error) {
            setLogs((prev) => [...prev, `Reload error: ${error}`])
        }
    }

    const uploadCSV = async () => {
        if (!csvFile) return

        const formData = new FormData()
        formData.append("csv", csvFile)

        try {
            const response = await fetch(`${basePath}/api/whatsapp/upload-csv`, {
                method: "POST",
                body: formData,
                credentials: "include",
            })
            const data = await response.json()
            if (data.success) {
                setLogs((prev) => [
                    ...prev,
                    `CSV uploaded successfully:`,
                    `- ${data.contactsCount} new contacts added (Total: ${data.totalContactsCount})`,
                    `- ${data.usersCount} new users added (Total: ${data.totalUsersCount})`,
                ])
                setCsvFile(null)
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                if (fileInput) fileInput.value = ""
                window.dispatchEvent(new CustomEvent("refreshUsers"))
            } else {
                setLogs((prev) => [...prev, `Upload failed: ${data.error}`])
            }
        } catch (error) {
            setLogs((prev) => [...prev, `Upload error: ${error}`])
        }
    }

    const clearContacts = async () => {
        if (!confirm("Are you sure you want to clear ALL contacts? This will remove all contacts for messaging.")) return

        try {
            const response = await fetch(`${basePath}/api/whatsapp/upload-csv`, {
                method: "POST",
            })
            const data = await response.json()
            if (data.success) {
                setLogs((prev) => [...prev, "🗑️ All contacts cleared successfully"])
            } else {
                setLogs((prev) => [...prev, `Clear contacts failed: ${data.error}`])
            }
        } catch (error) {
            setLogs((prev) => [...prev, `Clear contacts error: ${error}`])
        }
    }

    const sendMessages = async () => {
        try {
            const response = await fetch(`${basePath}/api/whatsapp/send-messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message }),
            })
            const data = await response.json()
            if (data.success) {
                setLogs((prev) => [...prev, "Message sending started"])
            } else {
                setLogs((prev) => [...prev, `Send failed: ${data.error}`])
            }
        } catch (error) {
            setLogs((prev) => [...prev, `Send error: ${error}`])
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">WhatsApp Bot Dashboard</h1>
                <p className="text-gray-600">Manage your WhatsApp bulk messaging bot with automatic user management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Bot Status */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
                        <MessageCircle className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <Badge variant={status.isReady ? "default" : status.isRunning ? "secondary" : "outline"}>
                            {status.isReady ? "Ready" : status.isRunning ? "Starting" : "Stopped"}
                        </Badge>
                    </CardContent>
                </Card>

                {/* Contacts & Users */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contacts & Users</CardTitle>
                        <Users className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold">{status.contactsCount}</div>
                            <p className="text-xs text-muted-foreground">Contacts for messaging</p>
                            <div className="text-lg font-semibold text-blue-600">{status.usersCount}</div>
                            <p className="text-xs text-muted-foreground">Total users in system</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Messages Sent */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                        <Send className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{status.messagesSent}</div>
                    </CardContent>
                </Card>

                {/* Bot Control */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Bot Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {!status.isRunning ? (
                            <Button onClick={startBot} className="w-full" disabled={isStarting}>
                                {isStarting ? "⏳ Starting..." : "Start Bot"}
                            </Button>

                        ) : (
                            <Button onClick={stopBot} className="w-full"  disabled={isStopping}>
                                {isStopping ? "Stopping..." : "Stop Bot"}
                            </Button>
                        )}
                        <Button onClick={reloadBotData} variant="outline" className="w-full">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reload Bot Data
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* QR Code */}
            {status.qrCode && status.isRunning && !status.isReady && (
                <Card>
                    <CardHeader>
                        <CardTitle>WhatsApp QR Code</CardTitle>
                        <CardDescription>Scan this QR code with your WhatsApp to connect</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center">
                            <img
                                src={status.qrCode}
                                alt="WhatsApp QR Code"
                                className="mx-auto rounded border p-2 bg-white shadow"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Upload CSV */}
            <Card>
                <CardHeader>
                    <CardTitle>Upload Contacts & Users</CardTitle>
                    <CardDescription>Upload a CSV file with name and phone columns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                        <Button onClick={uploadCSV} disabled={!csvFile}>
                            <Upload className="h-4 w-4 mr-2" /> Upload CSV
                        </Button>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                        <Button onClick={clearContacts} variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" /> Clear All Contacts
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Message Template */}
            <Card>
                <CardHeader>
                    <CardTitle>Message Template</CardTitle>
                    <CardDescription>Use {"{name}"} as placeholder</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={10}
                        placeholder="Enter your message template..."
                    />
                    <Button
                        onClick={sendMessages}
                        disabled={!status.isReady || status.contactsCount === 0}
                        className="w-full"
                    >
                        {status.isReady ? `Send Messages to ${status.contactsCount} Contacts` : "Bot Not Ready"}
                    </Button>
                </CardContent>
            </Card>

            {/* Error Alert */}
            {status.error && (
                <Alert variant="destructive">
                    <AlertDescription>{status.error}</AlertDescription>
                </Alert>
            )}

            {/* Logs */}
            <Card>
                <CardHeader>
                    <CardTitle>Activity Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-100 p-4 rounded max-h-60 overflow-y-auto">
                        {logs.length === 0 ? (
                            <p className="text-gray-500">No activity yet...</p>
                        ) : (
                            logs.map((log, index) => (
                                <div key={index} className="text-sm mb-1">
                                    <span className="text-gray-500">{new Date().toLocaleTimeString()}:</span> {log}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* User Table */}
            <UserManagement />
        </div>
    )
}
