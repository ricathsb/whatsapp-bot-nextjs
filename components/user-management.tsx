"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Edit,
  Trash2,
  User,
  RefreshCw,
  AlertCircle,
  Play,
  Square,
  MessageSquare,
  Wifi,
  WifiOff,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react"

// Types for the data structure
interface UserInterface {
  id: string
  nama: string
  no_hp: string
  isActive: boolean
  status_langganan: "subscribe" | "unsubscribe" | "invalid" // Changed from Indonesian terms
  status: "invalid" | "pending" | "verified"
  nik: string
  no_kpj: string
  updatedAt: string
  userId: string
  verifiedAt?: string
}

interface ChatMessage {
  from: string
  content: string
  timestamp: string
  isIncoming: boolean
}

// Utility functions
const normalizePhone = (phone: string | undefined | null): string => {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("62")) return digits
  if (digits.startsWith("0")) return "62" + digits.substring(1)
  return "62" + digits
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "verified":
      return "default"
    case "pending":
      return "secondary"
    case "invalid":
      return "destructive"
    default:
      return "outline"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "verified":
      return <CheckCircle className="h-3 w-3" />
    case "pending":
      return <Clock className="h-3 w-3" />
    case "invalid":
      return <XCircle className="h-3 w-3" />
    default:
      return null
  }
}

const getSubscriptionLabel = (status: string) => {
  switch (status) {
    case "subscribe":
      return "Subscribe"
    case "unsubscribe":
      return "Unsubscribe"
    case "invalid":
      return "Invalid"
    default:
      return status
  }
}

const getSubscriptionBadgeVariant = (status: string) => {
  switch (status) {
    case "subscribe":
      return "default"
    case "unsubscribe":
      return "secondary"
    case "invalid":
      return "destructive"
    default:
      return "outline"
  }
}

export function UserManagement() {
  // State management
  const [users, setUsers] = useState<UserInterface[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserInterface | null>(null)
  const [formData, setFormData] = useState({
    nama: "",
    no_hp: "",
    nik: "",
    no_kpj: "",
  })

  // Real-time chat state
  const [chatHistory, setChatHistory] = useState<{ [phone: string]: ChatMessage[] }>({})
  const [selectedUserChat, setSelectedUserChat] = useState<ChatMessage[]>([])
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false)
  const [selectedUserName, setSelectedUserName] = useState("")
  const [selectedUserPhone, setSelectedUserPhone] = useState("")
  const [isSSEConnected, setIsSSEConnected] = useState(false)
  const [sseError, setSSEError] = useState<string | null>(null)
  const [lastMessageTime, setLastMessageTime] = useState<string>("")
  const [readMessages, setReadMessages] = useState<{ [phone: string]: number }>({})

  const eventSourceRef = useRef<EventSource | null>(null)

  // Statistics calculations
  const activeUsersCount = users.filter((u) => u.isActive).length
  const inactiveUsersCount = users.length - activeUsersCount
  const verifiedUsersCount = users.filter((u) => u.status === "verified").length
  const pendingUsersCount = users.filter((u) => u.status === "pending").length
  const invalidUsersCount = users.filter((u) => u.status === "invalid").length

  // Initialize component
  useEffect(() => {
    fetchUsers()
    connectToSSE()

    // Event listeners for external updates
    const handleRefresh = () => {
      console.log("Refreshing users due to CSV upload...")
      setTimeout(() => fetchUsers(), 1000)
    }

    const handleBulkUpdate = () => {
      console.log("Refreshing users due to bulk status change...")
      fetchUsers()
    }

    window.addEventListener("refreshUsers", handleRefresh)
    window.addEventListener("bulkUserUpdate", handleBulkUpdate)

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      window.removeEventListener("refreshUsers", handleRefresh)
      window.removeEventListener("bulkUserUpdate", handleBulkUpdate)
    }
  }, [])

  // Real-time connection via Server-Sent Events
  const connectToSSE = () => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      console.log("Connecting to SSE...")
      const eventSource = new EventSource("/api/sse")
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("SSE connection opened")
        setIsSSEConnected(true)
        setSSEError(null)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("SSE data received:", data)

          if (data.type === "chat-history") {
            const newChatHistory = data.chatHistory
            setChatHistory((prevHistory) => {
              const hasChanges = JSON.stringify(newChatHistory) !== JSON.stringify(prevHistory)
              if (hasChanges) {
                console.log("Chat history updated via SSE:", Object.keys(newChatHistory).length, "conversations")
              }
              return newChatHistory
            })

            // Update active chat dialog if open
            if (isChatDialogOpen && selectedUserPhone) {
              const normalizedSelectedPhone = normalizePhone(selectedUserPhone)
              const matchingKey = Object.keys(newChatHistory).find(
                (key) => normalizePhone(key) === normalizedSelectedPhone,
              )
              if (matchingKey) {
                const updatedMessages = newChatHistory[matchingKey] || []
                setSelectedUserChat(updatedMessages)
              }
            }
          } else if (data.type === "chat-update") {
            const { phone, message } = data
            const normalizedPhone = normalizePhone(phone)

            setLastMessageTime(new Date().toLocaleTimeString())

            setChatHistory((prev) => {
              const existingKey = Object.keys(prev).find((key) => normalizePhone(key) === normalizedPhone)
              const keyToUse = existingKey || phone
              const prevMessages = prev[keyToUse] || []
              const updatedMessages = [...prevMessages, message]
              return { ...prev, [keyToUse]: updatedMessages }
            })

            // Update active chat dialog if it matches current user
            if (isChatDialogOpen && selectedUserPhone) {
              const normalizedSelectedPhone = normalizePhone(selectedUserPhone)
              if (normalizedPhone === normalizedSelectedPhone) {
                setSelectedUserChat((prev) => [...prev, message])
                if (message.isIncoming) {
                  setReadMessages((prevRead) => ({
                    ...prevRead,
                    [normalizedPhone]: (prevRead[normalizedPhone] || 0) + 1,
                  }))
                }
              }
            }
          }
        } catch (error) {
          console.error("Error parsing SSE data:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error)
        setIsSSEConnected(false)
        setSSEError("Connection lost. Attempting to reconnect...")

        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            console.log("Attempting to reconnect SSE...")
            connectToSSE()
          }
        }, 5000)
      }
    } catch (error) {
      console.error("Failed to establish SSE connection:", error)
      setSSEError("Failed to establish real-time connection")
    }
  }

  // API Functions
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users")
      const data = await response.json()

      if (data.success) {
        setUsers(data.data)
        console.log(`Loaded ${data.data.length} users`)
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
      setError("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const handleSubscriptionStatusChange = async (userId: string, newStatus: "subscribe" | "unsubscribe" | "invalid") => {
    setLoading(true)
    try {
      // Convert to Indonesian for API
      let indonesianStatus: "berlangganan" | "tidak" | "invalid"
      if (newStatus === "subscribe") {
        indonesianStatus = "berlangganan"
      } else if (newStatus === "unsubscribe") {
        indonesianStatus = "tidak"
      } else {
        indonesianStatus = "invalid"
      }

      const response = await fetch(`/api/users/${userId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_langganan: indonesianStatus }),
      })

      const data = await response.json()
      if (data.success) {
        setUsers(users.map((u) => (u.id === userId ? data.data : u)))
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error("Failed to update subscription status:", error)
      setError("Failed to update subscription status")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${id}/toggle`, {
        method: "POST",
      })

      const data = await response.json()
      if (data.success) {
        setUsers(users.map((u) => (u.id === id ? { ...u, isActive: data.data.isActive } : u)))
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError("Failed to toggle user status")
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!formData.nama || !formData.no_hp) {
      setError("Name and phone are required")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        setUsers([...users, data.data])
        setFormData({ nama: "", no_hp: "", nik: "", no_kpj: "" })
        setIsAddDialogOpen(false)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError("Failed to add user")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        setUsers(users.map((u) => (u.id === editingUser.id ? data.data : u)))
        setEditingUser(null)
        setFormData({ nama: "", no_hp: "", nik: "", no_kpj: "" })
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError("Failed to update user")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        setUsers(users.filter((u) => u.id !== id))
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError("Failed to delete user")
    } finally {
      setLoading(false)
    }
  }

  // Chat functions
  const getIncomingMessagesCount = (phone: string): number => {
    const normalizedPhone = normalizePhone(phone)
    const matchingKey = Object.keys(chatHistory).find((key) => normalizePhone(key) === normalizedPhone)
    if (!matchingKey) return 0

    const messages = chatHistory[matchingKey] || []
    return messages.filter((msg) => msg.isIncoming).length
  }

  const getUnreadMessagesCount = (phone: string): number => {
    const normalizedPhone = normalizePhone(phone)
    const matchingKey = Object.keys(chatHistory).find((key) => normalizePhone(key) === normalizedPhone)
    if (!matchingKey) return 0

    const messages = chatHistory[matchingKey] || []
    const totalIncoming = messages.filter((msg) => msg.isIncoming).length
    const readCount = readMessages[normalizedPhone] || 0
    return Math.max(0, totalIncoming - readCount)
  }

  const openChatDialog = (user: UserInterface) => {
    const normalizedUserPhone = normalizePhone(user.no_hp)
    const matchingKey = Object.keys(chatHistory).find((key) => normalizePhone(key) === normalizedUserPhone)
    const userMessages = matchingKey ? chatHistory[matchingKey] || [] : []

    setSelectedUserChat(userMessages)
    setSelectedUserName(user.nama)
    setSelectedUserPhone(user.no_hp)
    setIsChatDialogOpen(true)

    // Mark messages as read
    const incomingCount = userMessages.filter((msg) => msg.isIncoming).length
    setReadMessages((prev) => ({
      ...prev,
      [normalizedUserPhone]: incomingCount,
    }))
  }

  // Bulk operations
  const handleBulkActivate = async () => {
    if (!confirm("Are you sure you want to activate ALL users?")) return

    setLoading(true)
    try {
      const inactiveUsers = users.filter((u) => !u.isActive)
      for (const user of inactiveUsers) {
        await fetch(`/api/users/${user.id}/toggle`, { method: "POST" })
      }
      await fetchUsers()
      setError(null)
    } catch (error) {
      setError("Failed to activate all users")
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDeactivate = async () => {
    if (!confirm("Are you sure you want to deactivate ALL users?")) return

    setLoading(true)
    try {
      const activeUsers = users.filter((u) => u.isActive)
      for (const user of activeUsers) {
        await fetch(`/api/users/${user.id}/toggle`, { method: "POST" })
      }
      await fetchUsers()
      setError(null)
    } catch (error) {
      setError("Failed to deactivate all users")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (user: UserInterface) => {
    setEditingUser(user)
    setFormData({
      nama: user.nama,
      no_hp: user.no_hp,
      nik: user.nik || "",
      no_kpj: user.no_kpj || "",
    })
  }

  const closeEditDialog = () => {
    setEditingUser(null)
    setFormData({ nama: "", no_hp: "", nik: "", no_kpj: "" })
    setError(null)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              WhatsApp Bot User Management
              <Badge variant={isSSEConnected ? "default" : "destructive"} className="text-xs">
                {isSSEConnected ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Live Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
              {lastMessageTime && (
                <Badge variant="outline" className="text-xs">
                  Last Message: {lastMessageTime}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Manage WhatsApp bot users, subscription status, and verification. Chat replies update in real-time via
              Server-Sent Events.
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {!isSSEConnected && (
              <Button variant="outline" onClick={connectToSSE} size="sm">
                <Wifi className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            )}
            <Button variant="outline" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {loading ? "Loading..." : "Refresh"}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Add a new user to the WhatsApp bot system manually</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nama">Name *</Label>
                    <Input
                      id="nama"
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="Enter user name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="no_hp">Phone Number *</Label>
                    <Input
                      id="no_hp"
                      value={formData.no_hp}
                      onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                      placeholder="Enter phone number (e.g., 628123456789)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nik">NIK (National ID)</Label>
                    <Input
                      id="nik"
                      value={formData.nik}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                      placeholder="Enter NIK"
                    />
                  </div>
                  <div>
                    <Label htmlFor="no_kpj">No. KPJ (Social Security)</Label>
                    <Input
                      id="no_kpj"
                      value={formData.no_kpj}
                      onChange={(e) => setFormData({ ...formData, no_kpj: e.target.value })}
                      placeholder="Enter No. KPJ"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser} disabled={loading}>
                    {loading ? "Adding..." : "Add User"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Error Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {sseError && (
          <Alert variant="destructive" className="mb-4">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{sseError}</span>
              <Button variant="outline" size="sm" onClick={connectToSSE}>
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription Rules Info */}
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Subscription Rules:</strong> Users can select subscription status. Unsubscribe → Pending (stays
            verified), Subscribe → Pending. Verified users automatically become inactive.
          </AlertDescription>
        </Alert>

        {/* Bulk Actions */}
        {users.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handleBulkActivate}
              disabled={loading || activeUsersCount === users.length}
            >
              <Play className="h-4 w-4 mr-2" />
              Activate All ({inactiveUsersCount})
            </Button>
            <Button variant="outline" onClick={handleBulkDeactivate} disabled={loading || activeUsersCount === 0}>
              <Square className="h-4 w-4 mr-2" />
              Deactivate All ({activeUsersCount})
            </Button>
          </div>
        )}

        {/* Statistics Dashboard */}
        {users.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{activeUsersCount}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-500">{inactiveUsersCount}</div>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{verifiedUsersCount}</div>
                <p className="text-xs text-muted-foreground">Verified</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{pendingUsersCount}</div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{invalidUsersCount}</div>
                <p className="text-xs text-muted-foreground">Invalid</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Verification Status</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>No. KPJ</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Chat Replies</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No users found. Upload a CSV file or add users manually to get started.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const incomingCount = getIncomingMessagesCount(user.no_hp)
                  const unreadCount = getUnreadMessagesCount(user.no_hp)

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nama}</TableCell>
                      <TableCell>{user.no_hp || "-"}</TableCell>

                      {/* Active Status with Toggle */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() => handleToggleStatus(user.id)}
                            disabled={loading || user.status === "verified"}
                          />
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {user.status === "verified" && (
                            <Badge variant="outline" className="text-xs">
                              Auto-disabled
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Subscription Status Dropdown */}
                      <TableCell>
                        <div className="space-y-2">
                          <Select
                            value={user.status_langganan}
                            onValueChange={(value: "subscribe" | "unsubscribe" | "invalid") =>
                              handleSubscriptionStatusChange(user.id, value)
                            }
                            disabled={loading}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="subscribe">Subscribe</SelectItem>
                              <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                              <SelectItem value="invalid">Invalid</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant={getSubscriptionBadgeVariant(user.status_langganan)} className="text-xs">
                            {getSubscriptionLabel(user.status_langganan)}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Verification Status */}
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(user.status || "invalid")}
                          className="flex items-center gap-1 w-fit"
                        >
                          {getStatusIcon(user.status || "invalid")}
                          {user.status === "verified" ? "Verified" : user.status === "pending" ? "Pending" : "Invalid"}
                        </Badge>
                        {user.verifiedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Verified: {new Date(user.verifiedAt).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>{user.nik || "-"}</TableCell>
                      <TableCell>{user.no_kpj || "-"}</TableCell>
                      <TableCell>{new Date(user.updatedAt).toLocaleDateString()}</TableCell>

                      {/* Chat Replies with Unread Count */}
                      <TableCell>
                        {incomingCount > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChatDialog(user)}
                            className="flex items-center gap-2 relative"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium">{incomingCount}</span>
                            {incomingCount === 1 ? "reply" : "replies"}
                            {isSSEConnected && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                            {unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                              </div>
                            )}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No replies</span>
                        )}
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={closeEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-nama">Name</Label>
                <Input
                  id="edit-nama"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Enter user name"
                />
              </div>
              <div>
                <Label htmlFor="edit-no_hp">Phone Number</Label>
                <Input
                  id="edit-no_hp"
                  value={formData.no_hp}
                  onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="edit-nik">NIK</Label>
                <Input
                  id="edit-nik"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  placeholder="Enter NIK"
                />
              </div>
              <div>
                <Label htmlFor="edit-no_kpj">No. KPJ</Label>
                <Input
                  id="edit-no_kpj"
                  value={formData.no_kpj}
                  onChange={(e) => setFormData({ ...formData, no_kpj: e.target.value })}
                  placeholder="Enter No. KPJ"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={loading}>
                {loading ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Chat History Dialog */}
        <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat History - {selectedUserName}
                <Badge variant={isSSEConnected ? "default" : "secondary"} className="text-xs">
                  {isSSEConnected ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Live
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                All messages from this user {isSSEConnected ? "(updates in real-time)" : "(updates when reconnected)"}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {selectedUserChat.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No messages found</p>
              ) : (
                selectedUserChat.map((message, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 ${
                      message.isIncoming ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={message.isIncoming ? "default" : "secondary"} className="text-xs">
                        {message.isIncoming ? "Incoming" : "Bot Reply"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChatDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
