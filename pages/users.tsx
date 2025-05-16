import React, { useState, useEffect } from "react";
import AppSidebar from "../components/AppSidebar";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { useToast } from "../hooks/use-toast";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

// Define the User type
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
};

// Define the NewUser type for user creation
type NewUser = Omit<User, 'id'> & {
  password: string;
};

// Form schema for validations
const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["admin", "user"]),
  avatar: z.string().optional()
});

type UserFormData = z.infer<typeof userFormSchema>;

type DialogMode = "add" | "edit" | "delete" | null;

const users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addError, setAddError] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User | null;
    direction: 'ascending' | 'descending';
  }>({
    key: null,
    direction: 'ascending'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const { auth } = useAuth();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "securepassword123",
      role: "user" as "user" | "admin",
      avatar: ""
    },
  });

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const usersWithId = Array.isArray(data)
        ? data.map((user: any) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || ''
        }))
        : [];
      setUsers(usersWithId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort users
  const sortedUsers = React.useMemo(() => {
    let sortableUsers = [...filteredUsers];
    if (sortConfig.key !== null) {
      sortableUsers.sort((a, b) => {
        const valA = a[sortConfig.key!] ?? '';
        const valB = b[sortConfig.key!] ?? '';

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableUsers;
  }, [filteredUsers, sortConfig]);

  // Request sort
  const requestSort = (key: keyof User) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const openAddDialog = () => {
    form.reset({
      name: "",
      email: "",
      password: "securepassword123",
      role: "user",
      avatar: ""
    });
    setDialogMode("add");
  };

  const openEditDialog = (user: User) => {
    setCurrentUser(user);
    form.reset({
      name: user.name,
      email: user.email,
      password: "securepassword123",
      role: user.role as "user" | "admin",
      avatar: user.avatar || "",
    });
    setDialogMode("edit");
  };

  const openDeleteDialog = (user: User) => {
    setCurrentUser(user);
    setDeleteDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setCurrentUser(null);
  };

  const handleAddUser = async (data: UserFormData) => {
    setIsSubmitting(true);
    setAddError('');

    try {
      // Admin is always creating the user via this interface, 
      // regardless of the role selected for the new user.
      const endpoint = '/api/admin/users/create';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      // No Authorization header needed, rely on NextAuth.js session cookie

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password, // Password from form data
          role: data.role,         // Role from form data
          avatar: data.avatar || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      const responseData = await response.json();

      const newUser = {
        id: responseData.user.id || responseData.user._id,
        name: responseData.user.name,
        email: responseData.user.email,
        role: responseData.user.role,
        avatar: responseData.user.avatar || ''
      };

      setUsers(prevUsers => [...prevUsers, newUser]);
      closeDialog();
      form.reset();

      toast({
        title: "Success",
        description: `User ${data.name} created successfully as ${data.role}`,
      });
    } catch (error: any) {
      setAddError(error.message || 'Failed to create user');
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (data: UserFormData) => {
    if (!currentUser) return;
    setIsSubmitting(true); // Added to match handleAddUser pattern

    try {
      const endpoint = `/api/admin/users/${currentUser.id}`; // Changed URL

      // Prepare only the fields that are part of UserFormData and potentially changed
      // The backend PUT schema expects optional fields. Password is not updated here.
      const updatePayload: Partial<UserFormData> = {};
      if (data.name !== currentUser.name) updatePayload.name = data.name;
      if (data.email !== currentUser.email) { /* updatePayload.email = data.email; */ } // Email change typically needs separate flow/verification
      if (data.role !== currentUser.role) updatePayload.role = data.role;
      if (data.avatar !== currentUser.avatar) updatePayload.avatar = data.avatar;

      // Only send request if there is something to update (or always send if API handles empty updates gracefully)
      // For simplicity, we'll send what the form has, matching the Zod schema on backend (name, role, avatar)
      const payloadForApi = {
        name: data.name,
        role: data.role,
        avatar: data.avatar || undefined, // API expects undefined for empty optional avatar
      };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed
        },
        body: JSON.stringify(payloadForApi)
      });

      if (!response.ok) {
        const errorData = await response.json(); // get error details
        throw new Error(errorData.message || 'Failed to update user');
      }

      await fetchUsers(); // Refresh the user list
      closeDialog();
      toast({
        title: "User Updated",
        description: "User has been successfully updated.",
      });
    } catch (error: any) { // Ensure error is typed
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false); // Added to match handleAddUser pattern
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser) return;
    setIsSubmitting(true); // Optional: for loading state on delete button

    try {
      const endpoint = `/api/admin/users/${currentUser.id}`; // Changed URL
      const response = await fetch(endpoint, {
        method: 'DELETE',
        // No Authorization header needed
      });
      if (!response.ok) {
        const errorData = await response.json(); // get error details
        throw new Error(errorData.message || 'Failed to delete user');
      }

      setUsers(users.filter(user => user.id !== currentUser.id));
      setDeleteDialogOpen(false);
      setCurrentUser(null);

      toast({
        title: "User Deleted",
        description: `${currentUser.name} has been successfully deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false); // Added to match handleAddUser pattern
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />

      <main className="md:pl-64 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Users Management</h1>
            <p className="text-muted-foreground">
              View and manage user accounts
            </p>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search users..."
                    className="pl-8 w-full md:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={openAddDialog}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add New User
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-[250px] cursor-pointer"
                      onClick={() => requestSort('name')}
                    >
                      Name {sortConfig.key === 'name' ? (
                        <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                      ) : null}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('email')}
                    >
                      Email {sortConfig.key === 'email' ? (
                        <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                      ) : null}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('role')}
                    >
                      Role {sortConfig.key === 'role' ? (
                        <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                      ) : null}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                          Loading users...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sortedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedUsers.map((user, index) => (
                      <TableRow key={user.id ?? user.email ?? index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              {user.avatar ? (
                                <AvatarImage src={user.avatar} alt={user.name} />
                              ) : (
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                              )}
                            </Avatar>
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "outline"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            className="mr-1"
                            aria-label="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            className="text-destructive"
                            aria-label="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogMode === "add" || dialogMode === "edit"} onOpenChange={() => (dialogMode === "add" || dialogMode === "edit") && closeDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? "Add New User" : "Update User"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "add"
                ? "Create a new user account. Click save when you're done."
                : "Update the user details. Click save when you're done."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(dialogMode === "add" ? handleAddUser : handleEditUser)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/avatar.jpg" {...field} />
                    </FormControl>
                    <FormDescription>
                      Provide a URL to an image for the user's avatar
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="outline" type="button" onClick={closeDialog} className="mr-2">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (dialogMode === "add" ? "Creating..." : "Updating...") : (dialogMode === "add" ? "Create User" : "Update User")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            {currentUser && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                <Avatar className="h-8 w-8">
                  {currentUser.avatar ? (
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  ) : (
                    <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{currentUser.name}</p>
                  <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export async function getServerSideProps() {
  // This function makes the page dynamically rendered at request time.
  return {
    props: {},
  };
}

export default users;
