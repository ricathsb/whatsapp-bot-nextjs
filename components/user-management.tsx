/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
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
} from "lucide-react"

// Updated interface to match your JSON structure
interface UserInterface {
  id: string
  nama: string
  no_hp: string
  status: "aktif" | "tidak aktif"
  status_langganan: "berlangganan" | "tidak"
  nik: string
  no_kpj: string
  updatedAt: string
  userId: string
}

interface ChatMessage {
  from: string
  content: string
  timestamp: string
  isIncoming: boolean
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

  // Chat history states
  const [chatHistory, setChatHistory] = useState<{ [phone: string]: ChatMessage[] }>({})
  const [selectedUserChat, setSelectedUserChat] = useState<ChatMessage[]>([])
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false)
  const [selectedUserName, setSelectedUserName] = useState("")

  // SSE connection states
  const [isSSEConnected, setIsSSEConnected] = useState(false)
  const [sseError, setSSEError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetchUsers()
    connectToSSE()

    // Listen for refresh events from CSV upload
    const handleRefresh = () => {
      console.log("Refreshing users due to CSV upload...")
      setTimeout(() => {
        fetchUsers()
      }, 1000)
    }

    // Listen for bulk user updates from bot start/stop
    const handleBulkUpdate = () => {
      console.log("Refreshing users due to bulk status change...")
      fetchUsers()
    }

    window.addEventListener("refreshUsers", handleRefresh)
    window.addEventListener("bulkUserUpdate", handleBulkUpdate)

    return () => {
      // Cleanup SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      window.removeEventListener("refreshUsers", handleRefresh)
      window.removeEventListener("bulkUserUpdate", handleBulkUpdate)
    }
  }, [])

  // SSE Connection Function
  const connectToSSE = () => {
    try {
      // Close existing connection if any
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
            // Update main chat history state
            setChatHistory((prevHistory) => {
              const hasChanges = JSON.stringify(newChatHistory) !== JSON.stringify(prevHistory)
              if (hasChanges) {
                console.log("Chat history updated via SSE:", Object.keys(newChatHistory).length, "conversations")
              }
              return newChatHistory
            })

            // ✅ FIXED: Always update selected user chat if dialog is open, regardless of main history changes
            if (isChatDialogOpen && selectedUserName) {
              // Find the selected user from current users state
              const selectedUser = users.find((u) => u.nama === selectedUserName)
              if (selectedUser && selectedUser.no_hp) {
                const updatedMessages = newChatHistory[selectedUser.no_hp] || []
                console.log(
                  `Checking messages for ${selectedUserName} (${selectedUser.no_hp}):`,
                  updatedMessages.length,
                )
                // Always update the selected chat, don't compare with previous state
                setSelectedUserChat(updatedMessages)
                console.log(`Updated chat dialog for ${selectedUserName} with ${updatedMessages.length} total messages`)
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

        // Attempt to reconnect after 5 seconds
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

  // Manual reconnect function
  const reconnectSSE = () => {
    setSSEError(null)
    connectToSSE()
  }

  const fetchUsers = async () => {
    console.log("Fetching users...")
    setLoading(true)
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      console.log("Users API response:", data)

      if (data.success) {
        setUsers(data.data)
        console.log(`Loaded ${data.data.length} users in UI`)
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

  // Function to open chat dialog
  const openChatDialog = (user: UserInterface) => {
    const userMessages = chatHistory[user.no_hp] || []
    setSelectedUserChat(userMessages)
    setSelectedUserName(user.nama)
    setIsChatDialogOpen(true)
  }

  // Function to count incoming messages from user
  const getIncomingMessagesCount = (phone: string): number => {
    const messages = chatHistory[phone] || []
    return messages.filter((msg) => msg.isIncoming).length
  }

  const handleBulkActivate = async () => {
    if (!confirm("Are you sure you want to activate ALL users?")) return

    setLoading(true)
    try {
      const inactiveUsers = users.filter((u) => u.status === "tidak aktif")
      for (const user of inactiveUsers) {
        await fetch(`/api/users/${user.id}/toggle`, {
          method: "POST",
        })
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
      const activeUsers = users.filter((u) => u.status === "aktif")
      for (const user of activeUsers) {
        await fetch(`/api/users/${user.id}/toggle`, {
          method: "POST",
        })
      }
      await fetchUsers()
      setError(null)
    } catch (error) {
      setError("Failed to deactivate all users")
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
    if (!editingUser || !formData.nama || !formData.no_hp) return

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

  const handleToggleStatus = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${id}/toggle`, {
        method: "POST",
      })

      const data = await response.json()
      if (data.success) {
        setUsers(users.map((u) => (u.id === id ? data.data : u)))
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

  const openEditDialog = (user: UserInterface) => {
    setEditingUser(user)
    setFormData({
      nama: user.nama,
      no_hp: user.no_hp,
      nik: user.nik,
      no_kpj: user.no_kpj,
    })
  }

  const closeEditDialog = () => {
    setEditingUser(null)
    setFormData({ nama: "", no_hp: "", nik: "", no_kpj: "" })
  }

  const activeUsersCount = users.filter((u) => u.status === "aktif").length
  const inactiveUsersCount = users.length - activeUsersCount

  // Add this useEffect after the existing useEffects
  useEffect(() => {
    // When dialog opens, ensure we have the latest chat data
    if (isChatDialogOpen && selectedUserName) {
      const selectedUser = users.find((u) => u.nama === selectedUserName)
      if (selectedUser && selectedUser.no_hp) {
        const latestMessages = chatHistory[selectedUser.no_hp] || []
        setSelectedUserChat(latestMessages)
        console.log(`Dialog opened for ${selectedUserName}, loaded ${latestMessages.length} messages`)
      }
    }
  }, [isChatDialogOpen, selectedUserName, chatHistory, users])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Management
              {/* SSE Connection Status */}
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
            </CardTitle>
            <CardDescription>
              Manage WhatsApp bot users and their status. Chat replies update in real-time via Server-Sent Events.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Reconnect SSE Button */}
            {!isSSEConnected && (
              <Button variant="outline" onClick={reconnectSSE} size="sm">
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
                    <Label htmlFor="nama">Name</Label>
                    <Input
                      id="nama"
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="Enter user name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="no_hp">Phone Number</Label>
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

        {/* SSE Connection Error */}
        {sseError && (
          <Alert variant="destructive" className="mb-4">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{sseError}</span>
              <Button variant="outline" size="sm" onClick={reconnectSSE}>
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Real-time Connection Notice */}
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Real-time Updates:</strong>{" "}
            {isSSEConnected
              ? "Chat replies are automatically updated via live connection. No need to refresh!"
              : "Connection lost. Chat updates may be delayed until reconnected."}
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

        {/* User Statistics */}
        {users.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{activeUsersCount}</div>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-500">{inactiveUsersCount}</div>
                <p className="text-xs text-muted-foreground">Inactive Users</p>
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
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
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
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No users found. Upload a CSV file above or add users manually to get started.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const incomingCount = getIncomingMessagesCount(user.no_hp)
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nama}</TableCell>
                      <TableCell>{user.no_hp}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.status === "aktif"}
                            onCheckedChange={() => handleToggleStatus(user.id)}
                            disabled={loading}
                          />
                          <Badge variant={user.status === "aktif" ? "default" : "secondary"}>
                            {user.status === "aktif" ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status_langganan === "berlangganan" ? "default" : "outline"}>
                          {user.status_langganan === "berlangganan" ? "Subscribed" : "Not Subscribed"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.nik}</TableCell>
                      <TableCell>{user.no_kpj}</TableCell>
                      <TableCell>{new Date(user.updatedAt).toLocaleDateString()}</TableCell>
                      {/* Chat Replies Column with real-time updates */}
                      <TableCell>
                        {incomingCount > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChatDialog(user)}
                            className="flex items-center gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium">{incomingCount}</span>
                            {incomingCount === 1 ? "reply" : "replies"}
                            {/* Real-time indicator */}
                            {isSSEConnected && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No replies</span>
                        )}
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

        {/* Edit Dialog */}
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

        {/* Chat History Dialog with real-time updates */}
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
                All incoming messages from this user{" "}
                {isSSEConnected ? "(updates in real-time)" : "(updates when reconnected)"}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {selectedUserChat.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No messages found</p>
              ) : (
                selectedUserChat
                  .filter((msg) => msg.isIncoming) // Only show incoming messages
                  .map((message, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="text-xs">
                          Message {index + 1}
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
