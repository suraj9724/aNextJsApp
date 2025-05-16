import Link from "next/link";
import { Button } from "../components/ui/button";
import { AlertTriangle } from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <AlertTriangle className="h-16 w-16 text-yellow-dark" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Access Denied</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
