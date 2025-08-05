import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Lock, AlertTriangle } from "lucide-react";
import type { User } from "@shared/schema";

interface PaymentSectionProps {
  user: User;
  totalAmount: number;
  canProceed: boolean;
  isProcessing: boolean;
  onProcessing: (processing: boolean) => void;
}

export function PaymentSection({ 
  user, 
  totalAmount, 
  canProceed, 
  isProcessing, 
  onProcessing 
}: PaymentSectionProps) {
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
    }
  });

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('billing.')) {
      const billingField = field.replace('billing.', '');
      setPaymentData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [billingField]: value
        }
      }));
    } else {
      setPaymentData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canProceed) {
      alert('Please complete all required selections before proceeding.');
      return;
    }

    onProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would:
      // 1. Process payment through TheGunFirm Authorize.Net account
      // 2. Create order in database
      // 3. Send confirmation emails
      // 4. Clear cart
      
      alert('Order placed successfully! You will receive a confirmation email shortly.');
      
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment processing failed. Please try again.');
    } finally {
      onProcessing(false);
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const months = [
    '01', '02', '03', '04', '05', '06',
    '07', '08', '09', '10', '11', '12'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Payment Method Selection */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Payment Method</h3>
        
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Credit/Debit Card</p>
                <p className="text-sm text-blue-700">Visa, MasterCard, American Express, Discover</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Information */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Card Information</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={paymentData.cardNumber}
              onChange={(e) => handleInputChange('cardNumber', e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="expiryMonth">Month</Label>
              <Select 
                value={paymentData.expiryMonth} 
                onValueChange={(value) => handleInputChange('expiryMonth', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="expiryYear">Year</Label>
              <Select 
                value={paymentData.expiryYear} 
                onValueChange={(value) => handleInputChange('expiryYear', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="YYYY" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                type="text"
                placeholder="123"
                maxLength={4}
                value={paymentData.cvv}
                onChange={(e) => handleInputChange('cvv', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="cardholderName">Cardholder Name</Label>
            <Input
              id="cardholderName"
              type="text"
              placeholder="John Doe"
              value={paymentData.cardholderName}
              onChange={(e) => handleInputChange('cardholderName', e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Billing Address</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="billingStreet">Street Address</Label>
            <Input
              id="billingStreet"
              type="text"
              placeholder="123 Main St"
              value={paymentData.billingAddress.street}
              onChange={(e) => handleInputChange('billing.street', e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="billingCity">City</Label>
              <Input
                id="billingCity"
                type="text"
                placeholder="Anytown"
                value={paymentData.billingAddress.city}
                onChange={(e) => handleInputChange('billing.city', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="billingState">State</Label>
              <Input
                id="billingState"
                type="text"
                placeholder="CA"
                maxLength={2}
                value={paymentData.billingAddress.state}
                onChange={(e) => handleInputChange('billing.state', e.target.value.toUpperCase())}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="billingZip">ZIP Code</Label>
              <Input
                id="billingZip"
                type="text"
                placeholder="12345"
                value={paymentData.billingAddress.zip}
                onChange={(e) => handleInputChange('billing.zip', e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Processing Notice */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          <strong>Secure Payment Processing</strong>
          <br />
          Your payment information is encrypted and processed securely through Authorize.Net.
          We never store your complete card details on our servers.
        </AlertDescription>
      </Alert>

      {/* Compliance Notice for Firearms */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important Notice</strong>
          <br />
          By completing this purchase, you confirm that you are legally eligible to purchase 
          firearms and ammunition in your jurisdiction and that all information provided is accurate.
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canProceed || isProcessing}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing Payment...
            </div>
          ) : (
            <>
              Complete Order • {formatPrice(totalAmount)}
            </>
          )}
        </Button>
        
        {!canProceed && (
          <p className="text-sm text-red-600 text-center mt-2">
            Please complete all required selections above
          </p>
        )}
      </div>
    </form>
  );
}