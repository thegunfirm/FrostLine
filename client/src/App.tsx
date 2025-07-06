import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Membership from "@/pages/membership";
import ImageTest from "@/pages/image-test";
import AdminSync from "@/pages/admin-sync";
import AdminRSRFTP from "@/pages/admin-rsr-ftp";
import AdminRSRUpload from "@/pages/admin-rsr-upload";
import AdminSyncSettings from "@/pages/admin-sync-settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/products" component={Products} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/membership" component={Membership} />
      <Route path="/image-test" component={ImageTest} />
      <Route path="/admin-sync" component={AdminSync} />
      <Route path="/admin-rsr-ftp" component={AdminRSRFTP} />
      <Route path="/admin-rsr-upload" component={AdminRSRUpload} />
      <Route path="/admin-sync-settings" component={AdminSyncSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
          </div>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
