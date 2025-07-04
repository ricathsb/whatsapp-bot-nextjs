/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageCircle, Users, Send, Upload } from "@/components/icons"

interface BotStatus {
  isRunning: boolean
  isReady: boolean
  qrCode?: string
  contactsCount: number
  messagesSent: number
  error?: string
}

export default function WhatsAppBot() {
  const [status, setStatus] = useState<BotStatus>({
    isRunning: false,
    isReady: false,
    contactsCount: 0,
    messagesSent: 0,
  })
  const [message, setMessage] =
    useState(`Halo {name}, kami perhatikan status kepesertaan BPJS Ketenagakerjaan Anda sedang tidak aktif.

Jangan lewatkan perlindungan dan manfaat penting untuk Anda dan keluarga!

Dengan mengaktifkan kembali kepesertaan Anda, Anda akan mendapatkan:
- Perlindungan dari risiko kecelakaan saat bekerja (JKK).
- Manfaat uang tunai saat memasuki usia 56 tahun atau berhenti kerja (JHT).
- Santunan untuk ahli waris jika meninggal dunia (JKM).
- Beasiswa pendidikan untuk 2 orang anak (dengan syarat berlaku).

Yuk, segera aktifkan kembali kepesertaan Anda agar merasa lebih aman dan tenang saat bekerja.

Balas pesan ini untuk informasi lebih lanjut mengenai cara pengaktifan kembali.`)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    // Poll status every 2 seconds
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/whatsapp/status")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error("Failed to check status:", error)
    }
  }

  const startBot = async () => {
    try {
      const response = await fetch("/api/whatsapp/start", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        setLogs((prev) => [...prev, "Bot started successfully"])
      } else {
        setLogs((prev) => [...prev, `Error: ${data.error}`])
      }
    } catch (error) {
      setLogs((prev) => [...prev, `Failed to start bot: ${error}`])
    }
  }

  const stopBot = async () => {
    try {
      const response = await fetch("/api/whatsapp/stop", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        setLogs((prev) => [...prev, "Bot stopped successfully"])
      }
    } catch (error) {
      setLogs((prev) => [...prev, `Failed to stop bot: ${error}`])
    }
  }

  const uploadCSV = async () => {
    if (!csvFile) return

    const formData = new FormData()
    formData.append("csv", csvFile)

    try {
      const response = await fetch("/api/whatsapp/upload-csv", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (data.success) {
        setLogs((prev) => [...prev, `CSV uploaded: ${data.contactsCount} contacts loaded`])
      } else {
        setLogs((prev) => [...prev, `Upload failed: ${data.error}`])
      }
    } catch (error) {
      setLogs((prev) => [...prev, `Upload error: ${error}`])
    }
  }

  const sendMessages = async () => {
    try {
      const response = await fetch("/api/whatsapp/send-messages", {
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
        <p className="text-gray-600">Manage your WhatsApp bulk messaging bot</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
            <MessageCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={status.isReady ? "default" : status.isRunning ? "secondary" : "outline"}>
                {status.isReady ? "Ready" : status.isRunning ? "Starting" : "Stopped"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.contactsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.messagesSent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!status.isRunning ? (
              <Button onClick={startBot} className="w-full">
                Start Bot
              </Button>
            ) : (
              <Button onClick={stopBot} variant="destructive" className="w-full">
                Stop Bot
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Display */}
      {status.qrCode && (
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

      {/* CSV Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Contacts</CardTitle>
          <CardDescription>Upload a CSV file with name and phone columns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
            <Button onClick={uploadCSV} disabled={!csvFile}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Template */}
      <Card>
        <CardHeader>
          <CardTitle>Message Template</CardTitle>
          <CardDescription>Use {"{name}"} as placeholder for contact name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            placeholder="Enter your message template..."
          />
          <Button onClick={sendMessages} disabled={!status.isReady || status.contactsCount === 0} className="w-full">
            {status.isReady ? "Send Messages" : "Bot Not Ready"}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
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
    </div>
  )
}
