import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminProvider } from "@/hooks/useAdmin";
import { ProfilePhotoProvider } from "@/hooks/useProfilePhoto";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Transactions from "./pages/Transactions";
import Reminders from "./pages/Reminders";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import ImportData from "./pages/ImportData";
import Diagnostics from "./pages/Diagnostics";
import AdminUsers from "./pages/AdminUsers";
import Plans from "./pages/Plans";
import Archive from "./pages/Archive";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import { ZenithSyncDashboard } from "./components/admin/ZenithSyncDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminProvider>
        <ProfilePhotoProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/landing" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/install" element={<Install />} />
                
                {/* Protected routes - require login or guest mode */}
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
                <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/import" element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
                <Route path="/diagnostics" element={<ProtectedRoute><Diagnostics /></ProtectedRoute>} />
                <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/zenith-sync" element={<ProtectedRoute><ZenithSyncDashboard /></ProtectedRoute>} />
                <Route path="/pricing" element={<Pricing />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </TooltipProvider>
        </ProfilePhotoProvider>
      </AdminProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
