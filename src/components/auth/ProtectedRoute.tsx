import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ("admin" | "member" | "super_admin")[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  //const isSuperAdmin = user?.email === "superadmin@aialabs.com";
  const isSuperAdmin = user?.email === 'testuser@example.com'
  const userRole = (isSuperAdmin ? "super_admin" : (user?.role || "member")) as "admin" | "member" | "super_admin";
  console.log('DEBUG:', {
    userEmail: user?.email,
    isSuperAdmin,
    userRole,
    requiredRoles: roles
  })
  const hasPermission = !roles || roles.includes(userRole);

  useEffect(() => {
    if (isAuthenticated && !loading && !hasPermission) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, loading, hasPermission, toast]);

  // Wait for the initial session check before making a routing decision
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid #e2e8f0",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (!hasPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
