import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Home from "@/pages/home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import RegistrationSuccess from "@/pages/registration-success";
import VerifyEmail from "@/pages/verify-email";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Membership from "@/pages/membership";
import ImageTest from "@/pages/image-test";
import AdminSync from "@/pages/admin-sync";
import AdminRSRFTP from "@/pages/admin-rsr-ftp";
import AdminRSRUpload from "@/pages/admin-rsr-upload";
import AdminSyncSettings from "@/pages/admin-sync-settings";
import AdminPricingSettings from "@/pages/admin-pricing-settings";
import AdminCategoryRibbons from "@/pages/admin-category-ribbons";
import AdminFilterSettings from "@/pages/admin-filter-settings";
import AdminSyncHealth from "@/pages/admin-sync-health";
import AdminDepartmentPricing from "@/pages/admin-department-pricing";
import AdminImageSettings from "@/pages/admin-image-settings";
import AdminProductImages from "@/pages/admin-product-images";
import AdminFFLManagement from "@/pages/admin-ffl-management";
import FflManagement from "@/pages/admin/ffl-management";
import RSRIntelligenceTest from "@/pages/rsr-intelligence-test";
import PaymentTest from "@/pages/payment-test";
import Categories from "@/pages/categories";
import Browse from "@/pages/browse";
import OrderSummary from "@/pages/order-summary";
import FflSelection from "@/pages/ffl-selection";

import Shipping from "@/pages/shipping";
import Billing from "@/pages/billing";
import Payment from "@/pages/payment";
import OrderConfirmation from "@/pages/order-confirmation";
import NotFound from "@/pages/not-found";
import CMSDashboard from "@/pages/cms/cms-dashboard";
import SupportTickets from "@/pages/cms/support/support-tickets";
import EmailTemplates from "@/pages/cms/email-templates";
import FAPIntegration from "@/pages/cms/fap-integration";
import TierPricing from "@/pages/cms/tier-pricing";
import DeliverySettings from "@/pages/cms/delivery-settings";
import AtfDirectoryManagement from "@/pages/management/atf-directory";
import Account from "@/pages/account";
import AccountOrders from "@/pages/account-orders";
import CMSOrderManagement from "@/pages/cms-order-management";
import BrandingManagement from "@/pages/cms/admin/branding";
// Zoho integration pages removed - starting fresh
import FAPCustomerProfiles from "@/pages/cms/admin/fap-customer-profiles";
import TierLabels from "@/pages/cms/admin/tier-labels";
import FAPMembership from "@/pages/FAPMembership";
import SubscriptionTierManagement from "@/pages/cms/admin/subscription-tier-management";
import BillingManagement from "@/pages/BillingManagement";

// Global scroll-to-top component that monitors route changes
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/registration-success" component={RegistrationSuccess} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/products" component={Products} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/order-summary" component={OrderSummary} />
        <Route path="/ffl-selection" component={FflSelection} />

        <Route path="/shipping" component={Shipping} />
        <Route path="/billing" component={Billing} />
        <Route path="/payment" component={Payment} />
        <Route path="/order-confirmation" component={OrderConfirmation} />
        <Route path="/account" component={Account} />
        <Route path="/account/orders" component={AccountOrders} />
        <Route path="/cms/orders" component={CMSOrderManagement} />
        <Route path="/membership" component={Membership} />
        <Route path="/image-test" component={ImageTest} />
        <Route path="/admin-sync" component={AdminSync} />
        <Route path="/admin-rsr-ftp" component={AdminRSRFTP} />
        <Route path="/admin-rsr-upload" component={AdminRSRUpload} />
        <Route path="/admin-sync-settings" component={AdminSyncSettings} />
        <Route path="/admin-pricing-settings" component={AdminPricingSettings} />
        <Route path="/admin-category-ribbons" component={AdminCategoryRibbons} />
        <Route path="/admin-filter-settings" component={AdminFilterSettings} />
        <Route path="/admin-sync-health" component={AdminSyncHealth} />
        <Route path="/admin-department-pricing" component={AdminDepartmentPricing} />
        <Route path="/admin-image-settings" component={AdminImageSettings} />
        <Route path="/admin-product-images" component={AdminProductImages} />
        <Route path="/admin-ffl-management" component={AdminFFLManagement} />
        <Route path="/cms/ffls/management" component={FflManagement} />
        <Route path="/rsr-intelligence-test" component={RSRIntelligenceTest} />
        <Route path="/payment-test" component={PaymentTest} />
        <Route path="/categories" component={Categories} />
        <Route path="/browse" component={Browse} />
        <Route path="/cms" component={CMSDashboard} />
        <Route path="/cms/dashboard" component={CMSDashboard} />
        <Route path="/cms/support/tickets" component={SupportTickets} />
        <Route path="/cms/emails/templates" component={EmailTemplates} />
        <Route path="/cms/fap/integration" component={FAPIntegration} />
        <Route path="/cms/tier-pricing" component={TierPricing} />
        <Route path="/cms/delivery-settings" component={DeliverySettings} />
        <Route path="/cms/admin/branding" component={BrandingManagement} />
        {/* Zoho integration routes removed - starting fresh */}
        <Route path="/cms/admin/fap-customer-profiles" component={FAPCustomerProfiles} />
        <Route path="/cms/admin/tier-labels" component={TierLabels} />
        <Route path="/cms/admin/subscription-tier-management" component={SubscriptionTierManagement} />
        <Route path="/fap-membership" component={FAPMembership} />
        <Route path="/billing" component={BillingManagement} />
        <Route path="/management/atf-directory" component={AtfDirectoryManagement} />
        <Route component={NotFound} />
      </Switch>
    </>
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
