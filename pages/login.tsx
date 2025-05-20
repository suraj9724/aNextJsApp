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
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password." : result.error);
      } else if (result?.ok) {
        const session = await getSession();
        if (session?.user) {
          const userForAuthContext = {
            id: (session.user as any).id,
            name: session.user.name || undefined,
            email: session.user.email || "",
            role: (session.user as any).role || "user",
          };
          authContext.login(userForAuthContext, (session.user as any).id || "next-auth-session");
        }
        router.push("/dashboard");
      } else {
        setError("An unknown error occurred during login.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Tabs defaultValue="user" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full mb-6 bg-gray-100 rounded-lg p-1">
            <TabsTrigger
              value="user"
              className={`rounded-lg transition ${
                activeTab === "user" ? "bg-white shadow text-black" : "text-gray-500"
              }`}
            >
              User Login
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className={`rounded-lg transition ${
                activeTab === "admin" ? "bg-white shadow text-black" : "text-gray-500"
              }`}
            >
              Admin Login
            </TabsTrigger>
          </TabsList>

          <Card className="shadow-xl border border-gray-200 rounded-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">
                {activeTab === "admin" ? "Admin Login" : "Login"}
              </CardTitle>
              <CardDescription className="text-gray-500 mt-1">
                {activeTab === "admin"
                  ? "Enter your admin credentials to access the dashboard."
                  : "Enter your credentials to access your account."}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="rounded-md focus-visible:ring-2 focus-visible:ring-offset-1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10 rounded-md focus-visible:ring-2 focus-visible:ring-offset-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Toggle password visibility"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={toggleShowPassword}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 font-medium mt-2">{error}</p>
                )}
              </CardContent>

              <CardFooter className="flex flex-col items-stretch gap-4">
                <Button type="submit" className="w-full rounded-lg text-sm" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Signing in..."
                    : activeTab === "admin"
                    ? "Admin Sign In"
                    : "Sign In"}
                </Button>

                {activeTab === "user" && (
                  <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-blue-600 hover:underline">
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
