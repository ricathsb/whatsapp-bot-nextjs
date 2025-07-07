/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
"use client"

import { useState, useEffect } from "react"
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
import { Plus, Edit, Trash2, User, RefreshCw, AlertCircle, Play, Square, MessageSquare } from "lucide-react"

interface UserInterface {
    id: string
    name: string
    phone: string
    isActive: boolean
    createdAt: string
    lastActivity?: string
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
    const [formData, setFormData] = useState({ name: "", phone: "" })

    // ✅ TAMBAHAN: State untuk chat history
    const [chatHistory, setChatHistory] = useState<{ [phone: string]: ChatMessage[] }>({})
    const [selectedUserChat, setSelectedUserChat] = useState<ChatMessage[]>([])
    const [isChatDialogOpen, setIsChatDialogOpen] = useState(false)
    const [selectedUserName, setSelectedUserName] = useState("")

    useEffect(() => {
        fetchUsers()
        fetchChatHistory()

        // ✅ SOLUSI 1: Polling chat history setiap 3 detik untuk real-time updates
        const chatPollingInterval = setInterval(() => {
            fetchChatHistory()
        }, 3000)

        // Listen for refresh events from CSV upload
        const handleRefresh = () => {
            console.log("Refreshing users due to CSV upload...")
            setTimeout(() => {
                fetchUsers()
                fetchChatHistory()
            }, 1000)
        }

        // Listen for bulk user updates from bot start/stop
        const handleBulkUpdate = () => {
            console.log("Refreshing users due to bulk status change...")
            fetchUsers()
        }

        // ✅ SOLUSI 2: Listen for new messages dan langsung update chat history
        const handleNewMessage = () => {
            console.log("New message received, refreshing chat history...")
            fetchChatHistory()
        }

        // ✅ SOLUSI 3: Listen for message sent event
        const handleMessageSent = () => {
            console.log("Message sent, refreshing chat history...")
            fetchChatHistory()
        }

        window.addEventListener("refreshUsers", handleRefresh)
        window.addEventListener("bulkUserUpdate", handleBulkUpdate)
        window.addEventListener("newMessage", handleNewMessage)
        window.addEventListener("messageSent", handleMessageSent) // ✅ TAMBAHAN

        return () => {
            clearInterval(chatPollingInterval) // ✅ CLEANUP polling
            window.removeEventListener("refreshUsers", handleRefresh)
            window.removeEventListener("bulkUserUpdate", handleBulkUpdate)
            window.removeEventListener("newMessage", handleNewMessage)
            window.removeEventListener("messageSent", handleMessageSent) // ✅ TAMBAHAN
        }
    }, [])

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

    // ✅ SOLUSI 4: Optimized fetch chat history dengan timestamp tracking
    const fetchChatHistory = async () => {
        try {
            const response = await fetch("/api/whatsapp/chat-history")
            const data = await response.json()
            if (data.success) {
                // ✅ SOLUSI 5: Hanya update jika ada perubahan
                const newChatHistory = data.chatHistory
                const hasChanges = JSON.stringify(newChatHistory) !== JSON.stringify(chatHistory)

                if (hasChanges) {
                    setChatHistory(newChatHistory)
                    console.log("Chat history updated:", Object.keys(newChatHistory).length, "conversations")

                    // ✅ SOLUSI 6: Update selected user chat jika dialog sedang terbuka
                    if (isChatDialogOpen && selectedUserName) {
                        const selectedUser = users.find((u) => u.name === selectedUserName)
                        if (selectedUser) {
                            const updatedMessages = newChatHistory[selectedUser.phone] || []
                            setSelectedUserChat(updatedMessages)
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch chat history:", error)
        }
    }

    // ✅ TAMBAHAN: Function untuk buka chat dialog
    const openChatDialog = (user: UserInterface) => {
        const userMessages = chatHistory[user.phone] || []
        setSelectedUserChat(userMessages)
        setSelectedUserName(user.name)
        setIsChatDialogOpen(true)
    }

    // ✅ TAMBAHAN: Function untuk hitung jumlah pesan masuk dari user
    const getIncomingMessagesCount = (phone: string): number => {
        const messages = chatHistory[phone] || []
        return messages.filter((msg) => msg.isIncoming).length
    }

    const handleBulkActivate = async () => {
        if (!confirm("Are you sure you want to activate ALL users?")) return

        setLoading(true)
        try {
            // Call each user's toggle endpoint if they're inactive
            const inactiveUsers = users.filter((u) => !u.isActive)

            for (const user of inactiveUsers) {
                await fetch(`/api/users/${user.id}/toggle`, {
                    method: "POST",
                })
            }

            // Refresh the user list
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
            // Call each user's toggle endpoint if they're active
            const activeUsers = users.filter((u) => u.isActive)

            for (const user of activeUsers) {
                await fetch(`/api/users/${user.id}/toggle`, {
                    method: "POST",
                })
            }

            // Refresh the user list
            await fetchUsers()
            setError(null)
        } catch (error) {
            setError("Failed to deactivate all users")
        } finally {
            setLoading(false)
        }
    }

    const handleAddUser = async () => {
        if (!formData.name || !formData.phone) {
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
                setFormData({ name: "", phone: "" })
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
        if (!editingUser || !formData.name || !formData.phone) return

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
                setFormData({ name: "", phone: "" })
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
        setFormData({ name: user.name, phone: user.phone })
    }

    const closeEditDialog = () => {
        setEditingUser(null)
        setFormData({ name: "", phone: "" })
    }

    const activeUsersCount = users.filter((u) => u.isActive).length
    const inactiveUsersCount = users.length - activeUsersCount

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            User Management
                            {/* ✅ TAMBAHAN: Indicator untuk real-time updates */}
                            <Badge variant="outline" className="text-xs">
                                🔄 Live Updates
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Manage WhatsApp bot users and their status. Chat replies update automatically every 3 seconds.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                fetchUsers()
                                fetchChatHistory()
                            }}
                            disabled={loading}
                        >
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
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter user name"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="Enter phone number"
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

                {/* Important Notice */}
                <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Real-time Updates:</strong> Chat replies are automatically updated every 3 seconds. No need to
                        refresh the page!
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
                                <TableHead>Created</TableHead>
                                <TableHead>Last Activity</TableHead>
                                <TableHead>Chat Replies</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No users found. Upload a CSV file above or add users manually to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => {
                                    const incomingCount = getIncomingMessagesCount(user.phone)
                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.phone}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={user.isActive}
                                                        onCheckedChange={() => handleToggleStatus(user.id)}
                                                        disabled={loading}
                                                    />
                                                    <Badge variant={user.isActive ? "default" : "secondary"}>
                                                        {user.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                {user.lastActivity ? new Date(user.lastActivity).toLocaleString() : "Never"}
                                            </TableCell>
                                            {/* ✅ TAMBAHAN: Chat Replies Column dengan real-time updates */}
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
                                                        {/* ✅ TAMBAHAN: Indicator untuk pesan baru */}
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter user name"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-phone">Phone Number</Label>
                                <Input
                                    id="edit-phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Enter phone number"
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

                {/* ✅ TAMBAHAN: Chat History Dialog dengan real-time updates */}
                <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Chat History - {selectedUserName}
                                <Badge variant="outline" className="text-xs">
                                    🔄 Live
                                </Badge>
                            </DialogTitle>
                            <DialogDescription>All incoming messages from this user (updates automatically)</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-96 overflow-y-auto space-y-3">
                            {selectedUserChat.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No messages found</p>
                            ) : (
                                selectedUserChat
                                    .filter((msg) => msg.isIncoming) // Hanya tampilkan pesan masuk
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
