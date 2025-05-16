import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import { signIn, getSession } from "next-auth/react";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState<string>("user");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const authContext = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("handleSubmit triggered");
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log("Attempting signIn with:", { email, password });
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      console.log("signIn result:", result);

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password." : result.error);
      } else if (result?.ok) {
        const session = await getSession();
        console.log("NextAuth session after login:", session);
        if (session?.user) {
          const userForAuthContext = {
            id: (session.user as any).id,
            name: session.user.name || undefined,
            email: session.user.email || "",
            role: (session.user as any).role || "user",
          };
          console.log("[login.tsx] Calling authContext.login with user:", userForAuthContext);
          authContext.login(userForAuthContext, (session.user as any).id || "next-auth-session");
        }
        router.push("/dashboard");
      } else {
        setError("An unknown error occurred during login.");
      }
    } catch (err: any) {
      console.error("Login submission error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Tabs defaultValue="admin" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="user">User Login</TabsTrigger>
            <TabsTrigger value="admin">Admin Login</TabsTrigger>
          </TabsList>

          <Card>
            <CardHeader>
              <CardTitle>{activeTab === "admin" ? "Admin Login" : "Login"}</CardTitle>
              <CardDescription>
                {activeTab === "admin"
                  ? "Enter your admin credentials to access the dashboard."
                  : "Enter your credentials to access your account."}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                      onClick={toggleShowPassword}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm font-medium">
                    {error}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col items-stretch">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : (activeTab === "admin" ? "Admin Sign In" : "Sign In")}
                </Button>

                {activeTab === "user" && (
                  <div className="mt-4 text-center text-sm">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-blue underline">
                      Sign up
                    </Link>
                  </div>
                )}
              </CardFooter>
            </form>
          </Card>
        </Tabs>
      </div>
    </div>
  );
};

export default LoginPage;