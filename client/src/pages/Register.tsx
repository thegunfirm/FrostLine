import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, Mail, UserPlus, Shield } from 'lucide-react';

const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  subscriptionTier: z.enum(['Bronze', 'Gold', 'Platinum']).optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function Register() {
  const [registrationStep, setRegistrationStep] = useState<'form' | 'email-sent' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      subscriptionTier: 'Bronze'
    }
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const { confirmPassword, ...registrationData } = data;
      const response = await apiRequest('POST', '/api/auth/register', registrationData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setRegistrationStep('email-sent');
      } else {
        setErrorMessage(data.message || 'Registration failed');
        setRegistrationStep('error');
      }
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      setErrorMessage(error.message || 'Registration failed. Please try again.');
      setRegistrationStep('error');
    }
  });

  const onSubmit = (data: RegistrationFormData) => {
    setErrorMessage('');
    registrationMutation.mutate(data);
  };

  if (registrationStep === 'email-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              We've sent a verification email to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Click the verification link in your email to activate your account and complete registration.
              </p>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Didn't receive the email? Check your spam folder or contact support.</p>
            </div>
            
            <div className="pt-4">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <UserPlus className="h-8 w-8 text-red-600 dark:text-red-300" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Join The Gun Firm and start saving with tier-based pricing
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {registrationStep === 'error' && errorMessage && (
            <Alert className="mb-6" variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subscriptionTier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Tier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bronze">Bronze - Basic Access</SelectItem>
                        <SelectItem value="Gold">Gold - Better Pricing</SelectItem>
                        <SelectItem value="Platinum">Platinum - Best Pricing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a secure password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Account Security:</p>
                  <p>Your account will be created in our CRM system and requires email verification before activation.</p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={registrationMutation.isPending}
              >
                {registrationMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}