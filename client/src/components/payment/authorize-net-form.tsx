import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Shield, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthorizeNetFormProps {
  paymentType: 'fap' | 'tgf';
  amount: number;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: any) => void;
  orderDetails?: any;
  membershipTier?: string;
  isProcessing?: boolean;
}

export function AuthorizeNetForm({ 
  paymentType, 
  amount, 
  onPaymentSuccess, 
  onPaymentError,
  orderDetails,
  membershipTier,
  isProcessing = false
}: AuthorizeNetFormProps) {
  const [formData, setFormData] = useState({
    // Card details
    cardNumber: '',
    expirationMonth: '',
    expirationYear: '',
    cardCode: '',
    
    // Billing information
    firstName: '',
    lastName: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: '',
    email: ''
  });

  const [useTestCard, setUseTestCard] = useState(true);
  const [testCardType, setTestCardType] = useState('visa');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const testCards = {
    visa: '4111111111111111',
    mastercard: '5424000000000015',
    amex: '378282246310005',
    discover: '6011111111111117',
    declined: '4000000000000002'
  };

  const handleTestCardSelect = (cardType: string) => {
    setTestCardType(cardType);
    setFormData(prev => ({
      ...prev,
      cardNumber: testCards[cardType as keyof typeof testCards],
      expirationMonth: '12',
      expirationYear: '2025',
      cardCode: cardType === 'amex' ? '1234' : '123'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (processing || isProcessing) return;
    
    setProcessing(true);

    try {
      const cardDetails = {
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        expirationDate: `${formData.expirationMonth}${formData.expirationYear}`,
        cardCode: formData.cardCode
      };

      const billingInfo = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        company: formData.company,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country,
        phone: formData.phone,
        email: formData.email
      };

      let endpoint = '';
      let payload: any = {
        amount: amount.toFixed(2),
        cardDetails,
        billingInfo
      };

      if (paymentType === 'fap') {
        endpoint = '/api/payment/membership';
        payload.tier = membershipTier;
        payload.userId = 11; // TODO: Get from auth context
      } else {
        endpoint = '/api/payment/products';
        payload.orderDetails = orderDetails;
        payload.orderId = orderDetails?.orderId;
      }

      const response = await apiRequest('POST', endpoint, payload);
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Payment Successful",
          description: `${paymentType === 'fap' ? 'Membership' : 'Product'} payment processed successfully`,
        });
        onPaymentSuccess(result);
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || 'There was an error processing your payment',
        variant: "destructive",
      });
      onPaymentError(error);
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {paymentType === 'fap' ? 'Membership Payment' : 'Product Payment'}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Shield className="w-4 h-4" />
          Secure payment processing via Authorize.Net
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">
              {paymentType === 'fap' ? `${membershipTier} Membership` : 'Product Purchase'}
            </span>
            <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
          </div>
          {paymentType === 'fap' && (
            <p className="text-sm text-gray-600 mt-1">
              One-time membership fee
            </p>
          )}
        </div>

        {/* Test Card Selection (Sandbox only) */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Sandbox Mode:</strong> Use test card numbers for testing</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={testCardType === 'visa' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTestCardSelect('visa')}
                >
                  Visa (Success)
                </Button>
                <Button
                  type="button"
                  variant={testCardType === 'mastercard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTestCardSelect('mastercard')}
                >
                  Mastercard
                </Button>
                <Button
                  type="button"
                  variant={testCardType === 'declined' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => handleTestCardSelect('declined')}
                >
                  Test Decline
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Card Information</h3>
            
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                value={formData.cardNumber}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  cardNumber: formatCardNumber(e.target.value)
                }))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="expirationMonth">Month</Label>
                <Select 
                  value={formData.expirationMonth} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, expirationMonth: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = (i + 1).toString().padStart(2, '0');
                      return (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="expirationYear">Year</Label>
                <Select 
                  value={formData.expirationYear} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, expirationYear: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="YYYY" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = (new Date().getFullYear() + i).toString();
                      return (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="cardCode">CVV</Label>
                <Input
                  id="cardCode"
                  value={formData.cardCode}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    cardCode: e.target.value.replace(/\D/g, '')
                  }))}
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Billing Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                  placeholder="TX"
                  maxLength={2}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={processing || isProcessing}
            size="lg"
          >
            {processing || isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Processing Payment...
              </div>
            ) : (
              `Pay $${amount.toFixed(2)}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}