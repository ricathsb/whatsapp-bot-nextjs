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
  Send,
} from "lucide-react"

interface UserInterface {
  id: string
  nama: string
  no_hp: string
  isActive: boolean
  isSended: boolean
  status_langganan: "subscribe" | "unsubscribe" | "invalid"
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
  const [chatHistory, setChatHistory] = useState<{ [phone: string]: ChatMessage[] }>({})
  const [selectedUserChat, setSelectedUserChat] = useState<ChatMessage[]>([])
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false)
  const [selectedUserName, setSelectedUserName] = useState("")
  const [selectedUserPhone, setSelectedUserPhone] = useState("")
  const [isSSEConnected, setIsSSEConnected] = useState(false)
  const [readMessages, setReadMessages] = useState<{ [phone: string]: number }>({})

  const eventSourceRef = useRef<EventSource | null>(null)

  const activeUsersCount = users.filter((u) => u.isActive).length
  const inactiveUsersCount = users.length - activeUsersCount
  const verifiedUsersCount = users.filter((u) => u.status === "verified").length
  const pendingUsersCount = users.filter((u) => u.status === "pending").length
  const invalidUsersCount = users.filter((u) => u.status === "invalid").length
  const sendedUsersCount = users.filter((u) => u.isSended).length

  useEffect(() => {
    fetchUsers()
    connectToSSE()

    const handleRefresh = () => {
      setTimeout(() => fetchUsers(), 1000)
    }

    const handleBulkUpdate = () => {
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

  const connectToSSE = () => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource("/api/sse")
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsSSEConnected(true)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "chat-history") {
            setChatHistory(data.chatHistory)
          } else if (data.type === "chat-update") {
            const { phone, message } = data
            const normalizedPhone = normalizePhone(phone)

            setChatHistory((prev) => {
              const existingKey = Object.keys(prev).find((key) => normalizePhone(key) === normalizedPhone)
              const keyToUse = existingKey || phone
              const prevMessages = prev[keyToUse] || []
              const updatedMessages = [...prevMessages, message]
              return { ...prev, [keyToUse]: updatedMessages }
            })

            if (isChatDialogOpen && selectedUserPhone) {
              const normalizedSelectedPhone = normalizePhone(selectedUserPhone)
              if (normalizedPhone === normalizedSelectedPhone) {
                setSelectedUserChat((prev) => [...prev, message])
              }
            }
          }
        } catch (error) {
          console.error("Error parsing SSE data:", error)
        }
      }

      eventSource.onerror = () => {
        setIsSSEConnected(false)
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToSSE()
          }
        }, 5000)
      }
    } catch (error) {
      console.error("Failed to establish SSE connection:", error)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const handleSubscriptionStatusChange = async (userId: string, newStatus: "subscribe" | "unsubscribe" | "invalid") => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_langganan: newStatus }),
      })

      const data = await response.json()
      if (data.success) {
        setUsers(users.map((u) => (u.id === userId ? data.data : u)))
      } else {
        setError(data.error)
      }
    } catch (error) {
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
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError("Failed to toggle user status")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSended = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${id}/toggle-sended`, {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        setUsers(users.map((u) => (u.id === id ? { ...u, isSended: data.data.isSended } : u)))
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError("Failed to toggle sended status")
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
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError("Failed to delete user")
    } finally {
      setLoading(false)
    }
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

    const incomingCount = userMessages.filter((msg) => msg.isIncoming).length
    setReadMessages((prev) => ({
      ...prev,
      [normalizedUserPhone]: incomingCount,
    }))
  }

  const handleBulkActivate = async () => {
    if (!confirm("Are you sure you want to activate ALL users?")) return
    setLoading(true)
    try {
      const inactiveUsers = users.filter((u) => !u.isActive)
      for (const user of inactiveUsers) {
        await fetch(`/api/users/${user.id}/toggle`, { method: "POST" })
      }
      await fetchUsers()
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
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
            </CardTitle>
            <CardDescription>
              Manage WhatsApp bot users, subscription status, and verification.
            </CardDescription>
          </div>

          <div className="flex gap-2">
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
                  <DialogDescription>Add a new user to the WhatsApp bot system</DialogDescription>
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
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nik">NIK</Label>
                    <Input
                      id="nik"
                      value={formData.nik}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                      placeholder="Enter NIK"
                    />
                  </div>
                  <div>
                    <Label htmlFor="no_kpj">No. KPJ</Label>
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
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                <div className="text-2xl font-bold text-blue-600">{sendedUsersCount}</div>
                <p className="text-xs text-muted-foreground">Sended</p>
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Sended</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>No. KPJ</TableHead>
                <TableHead>Chat</TableHead>
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
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const unreadCount = getUnreadMessagesCount(user.no_hp)

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nama}</TableCell>
                      <TableCell>{user.no_hp || "-"}</TableCell>

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
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.isSended}
                            onCheckedChange={() => handleToggleSended(user.id)}
                            disabled={loading}
                          />
                          <Badge variant={user.isSended ? "default" : "secondary"}>
                            {user.isSended ? "Sended" : "Not Sended"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
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
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(user.status || "invalid")}
                          className="flex items-center gap-1 w-fit"
                        >
                          {getStatusIcon(user.status || "invalid")}
                          {user.status === "verified" ? "Verified" : user.status === "pending" ? "Pending" : "Invalid"}
                        </Badge>
                      </TableCell>

                      <TableCell>{user.nik || "-"}</TableCell>
                      <TableCell>{user.no_kpj || "-"}</TableCell>

                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChatDialog(user)}
                          className="flex items-center gap-2 relative"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Chat
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            </div>
                          )}
                        </Button>
                      </TableCell>

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

        <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat History - {selectedUserName}
                <Badge variant={isSSEConnected ? "default" : "secondary"} className="text-xs">
                  {isSSEConnected ? "Live" : "Offline"}
                </Badge>
              </DialogTitle>
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