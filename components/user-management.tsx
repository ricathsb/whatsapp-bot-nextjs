"use client"

import { CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch" // Import Switch component
import { Plus, Edit, Trash2, RefreshCw, AlertCircle } from "lucide-react"

interface UserManagementUser {
  id: string // Changed to string based on your JSON example
  name: string
  phone: string
  isSended: boolean // Added isSended property
  createdAt: string
}

export function UserManagement() {
  const [users, setUsers] = useState<UserManagementUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserManagementUser | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })

  useEffect(() => {
    fetchUsers()
    const handleRefresh = () => {
      fetchUsers()
    }
    const handleBulkUpdate = () => {
      fetchUsers()
    }
    window.addEventListener("refreshUsers", handleRefresh)
    window.addEventListener("bulkUserUpdate", handleBulkUpdate)
    return () => {
      window.removeEventListener("refreshUsers", handleRefresh)
      window.removeEventListener("bulkUserUpdate", handleBulkUpdate)
    }
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      if (data.success) {
        setUsers(data.users || [])
      } else {
        setError(data.error || "Failed to fetch users")
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
      setError("Failed to fetch users")
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
    setError(null)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) {
        // Assuming new user is returned with isSended: false by default
        setUsers([...users, { ...data.user, isSended: false }])
        setFormData({ name: "", phone: "" })
        setIsAddDialogOpen(false)
      } else {
        setError(data.error || "Failed to add user")
      }
    } catch (error) {
      console.error("Failed to add user:", error)
      setError("Failed to add user")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    if (!formData.name || !formData.phone) {
      setError("Name and phone are required")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) {
        setUsers(users.map((u) => (u.id === editingUser.id ? { ...data.user, isSended: editingUser.isSended } : u)))
        setEditingUser(null)
        setFormData({ name: "", phone: "" })
      } else {
        setError(data.error || "Failed to update user")
      }
    } catch (error) {
      console.error("Failed to update user:", error)
      setError("Failed to update user")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    // Changed id type to string
    if (!confirm("Are you sure you want to delete this user?")) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        setUsers(users.filter((u) => u.id !== id))
      } else {
        setError(data.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
      setError("Failed to delete user")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleIsSended = async (id: string, currentStatus: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const newStatus = !currentStatus
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSended: newStatus }),
      })
      const data = await response.json()
      if (data.success) {
        setUsers(users.map((u) => (u.id === id ? { ...u, isSended: newStatus } : u)))
      } else {
        setError(data.error || "Failed to update sent status")
      }
    } catch (error) {
      console.error("Failed to toggle isSended status:", error)
      setError("Failed to toggle sent status")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (user: UserManagementUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      phone: user.phone,
    })
    setError(null)
  }

  const closeEditDialog = () => {
    setEditingUser(null)
    setFormData({ name: "", phone: "" })
    setError(null)
  }

  const closeAddDialog = () => {
    setIsAddDialogOpen(false)
    setFormData({ name: "", phone: "" })
    setError(null)
  }

  return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>Manage users for WhatsApp bot messaging</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {loading ? "Loading..." : "Refresh"}
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setError(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Add a new user to the system</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter user name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeAddDialog}>
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
              <div className="mb-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{users.length}</div>
                    <p className="text-xs text-muted-foreground">Total Users</p>
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
                  <TableHead>Created</TableHead>
                  <TableHead>Sent Status</TableHead> {/* New Table Head */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {" "}
                        {/* Updated colspan */}
                        Loading users...
                      </TableCell>
                    </TableRow>
                ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {" "}
                        {/* Updated colspan */}
                        No users found. Upload a CSV file or add users manually.
                      </TableCell>
                    </TableRow>
                ) : (
                    users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.phone}</TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Switch
                                checked={user.isSended}
                                onCheckedChange={() => handleToggleIsSended(user.id, user.isSended)}
                                disabled={loading}
                            />
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
                    ))
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
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter user name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone Number *</Label>
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
        </CardContent>
      </Card>
  )
}
