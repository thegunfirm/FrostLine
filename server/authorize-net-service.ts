import { APIContracts, APIControllers, Constants } from 'authorizenet';

// Dual Authorize.Net Configuration for FAP and TGF
interface AuthorizeNetConfig {
  apiLoginId: string;
  transactionKey: string;
  publicKey: string;
  environment: string;
}

class AuthorizeNetService {
  private fapConfig: AuthorizeNetConfig;
  private tgfConfig: AuthorizeNetConfig;

  constructor() {
    // FAP (FreeAmericanPeople.com) - Membership subscriptions
    this.fapConfig = {
      apiLoginId: process.env.FAP_API_LOGIN_ID || process.env.fapAPILoginID || '',
      transactionKey: process.env.FAP_TRANSACTION_KEY || process.env.fapTransactionKey || '',
      publicKey: process.env.FAP_PUBLIC_KEY || process.env.fapPublicKey || '',
      environment: 'sandbox' // Use 'production' for live environment
    };

    // TGF (TheGunFirm.com) - Product purchases
    this.tgfConfig = {
      apiLoginId: process.env.TGF_API_LOGIN_ID || process.env.tgfAPILoginID || '',
      transactionKey: process.env.TGF_TRANSACTION_KEY || process.env.tgfTransactionKey || '',
      publicKey: process.env.TGF_PUBLIC_KEY || process.env.tgfsandboxpublickey || '',
      environment: 'sandbox' // Use 'production' for live environment
    };

    this.validateConfig();
  }

  private validateConfig() {
    if (!this.fapConfig.apiLoginId || !this.fapConfig.transactionKey) {
      console.warn('FAP Authorize.Net credentials missing. Membership payments will not work.');
    }
    if (!this.tgfConfig.apiLoginId || !this.tgfConfig.transactionKey) {
      console.warn('TGF Authorize.Net credentials missing. Product payments will not work.');
    }
  }

  private getMerchantAuth(paymentType: 'fap' | 'tgf') {
    const config = paymentType === 'fap' ? this.fapConfig : this.tgfConfig;
    
    const merchantAuth = new APIContracts.MerchantAuthenticationType();
    merchantAuth.setName(config.apiLoginId);
    merchantAuth.setTransactionKey(config.transactionKey);
    
    return merchantAuth;
  }

  /**
   * Create payment for membership subscription (FAP)
   */
  async createMembershipPayment(amount: number, cardDetails: {
    cardNumber: string;
    expirationDate: string;
    cardCode: string;
  }, billingInfo: any): Promise<any> {
    return this.createPayment('fap', amount, cardDetails, billingInfo, 'Membership Subscription');
  }

  /**
   * Create payment for product purchase (TGF)
   */
  async createProductPayment(amount: number, cardDetails: {
    cardNumber: string;
    expirationDate: string;
    cardCode: string;
  }, billingInfo: any, orderDetails?: string): Promise<any> {
    return this.createPayment('tgf', amount, cardDetails, billingInfo, orderDetails || 'Product Purchase');
  }

  /**
   * Generic payment creation method
   */
  private async createPayment(
    paymentType: 'fap' | 'tgf',
    amount: number,
    cardDetails: {
      cardNumber: string;
      expirationDate: string;
      cardCode: string;
    },
    billingInfo: any,
    description: string
  ): Promise<any> {
    
    const config = paymentType === 'fap' ? this.fapConfig : this.tgfConfig;
    
    if (!config.apiLoginId || !config.transactionKey) {
      throw new Error(`${paymentType.toUpperCase()} Authorize.Net credentials not configured`);
    }

    return new Promise((resolve, reject) => {
      // Create credit card object
      const creditCard = new APIContracts.CreditCardType();
      creditCard.setCardNumber(cardDetails.cardNumber);
      creditCard.setExpirationDate(cardDetails.expirationDate);
      creditCard.setCardCode(cardDetails.cardCode);

      // Create payment method
      const paymentType = new APIContracts.PaymentType();
      paymentType.setCreditCard(creditCard);

      // Create billing address
      const billTo = new APIContracts.CustomerAddressType();
      billTo.setFirstName(billingInfo.firstName || '');
      billTo.setLastName(billingInfo.lastName || '');
      billTo.setCompany(billingInfo.company || '');
      billTo.setAddress(billingInfo.address || '');
      billTo.setCity(billingInfo.city || '');
      billTo.setState(billingInfo.state || '');
      billTo.setZip(billingInfo.zip || '');
      billTo.setCountry(billingInfo.country || 'US');
      billTo.setPhoneNumber(billingInfo.phone || '');
      billTo.setFaxNumber(billingInfo.fax || '');

      // Create transaction request
      const transactionRequest = new APIContracts.TransactionRequestType();
      transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
      transactionRequest.setAmount(amount);
      transactionRequest.setPayment(paymentType);
      transactionRequest.setBillTo(billTo);

      // Add description and reference
      const transactionSettings = new APIContracts.ArrayOfSetting();
      const setting = new APIContracts.SettingType();
      setting.setSettingName('duplicateWindow');
      setting.setSettingValue('60');
      transactionSettings.setSetting([setting]);
      transactionRequest.setTransactionSettings(transactionSettings);

      // Create the payment request
      const createRequest = new APIContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(this.getMerchantAuth(paymentType));
      createRequest.setTransactionRequest(transactionRequest);

      // Execute the request
      const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
      
      if (config.environment === 'sandbox') {
        ctrl.setEnvironment(Constants.endpoint.sandbox);
      } else {
        ctrl.setEnvironment(Constants.endpoint.production);
      }

      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.CreateTransactionResponse(apiResponse);

        if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
          const transactionResponse = response.getTransactionResponse();
          
          if (transactionResponse.getMessages() != null) {
            resolve({
              success: true,
              transactionId: transactionResponse.getTransId(),
              authCode: transactionResponse.getAuthCode(),
              messageCode: transactionResponse.getMessages().getMessage()[0].getCode(),
              description: transactionResponse.getMessages().getMessage()[0].getDescription(),
              paymentType: paymentType
            });
          } else {
            reject({
              success: false,
              error: 'Transaction failed',
              errors: transactionResponse.getErrors() ? 
                transactionResponse.getErrors().getError().map((error: any) => ({
                  code: error.getErrorCode(),
                  text: error.getErrorText()
                })) : []
            });
          }
        } else {
          reject({
            success: false,
            error: 'API request failed',
            errors: response.getMessages().getMessage().map((msg: any) => ({
              code: msg.getCode(),
              text: msg.getText()
            }))
          });
        }
      });
    });
  }

  /**
   * Create recurring billing subscription (for memberships)
   */
  async createSubscription(
    subscriptionPlan: {
      name: string;
      amount: number;
      interval: number; // days
      totalOccurrences: number;
    },
    cardDetails: {
      cardNumber: string;
      expirationDate: string;
      cardCode: string;
    },
    customerInfo: any
  ): Promise<any> {
    
    if (!this.fapConfig.apiLoginId || !this.fapConfig.transactionKey) {
      throw new Error('FAP Authorize.Net credentials not configured for subscriptions');
    }

    return new Promise((resolve, reject) => {
      // Create credit card
      const creditCard = new APIContracts.CreditCardType();
      creditCard.setCardNumber(cardDetails.cardNumber);
      creditCard.setExpirationDate(cardDetails.expirationDate);
      creditCard.setCardCode(cardDetails.cardCode);

      const payment = new APIContracts.PaymentType();
      payment.setCreditCard(creditCard);

      // Customer info
      const customer = new APIContracts.CustomerType();
      customer.setType(APIContracts.CustomerTypeEnum.INDIVIDUAL);
      customer.setId(customerInfo.id || '');
      customer.setEmail(customerInfo.email || '');

      // Billing info
      const billTo = new APIContracts.NameAndAddressType();
      billTo.setFirstName(customerInfo.firstName || '');
      billTo.setLastName(customerInfo.lastName || '');

      // Payment schedule
      const paymentSchedule = new APIContracts.PaymentScheduleType();
      const interval = new APIContracts.PaymentScheduleType.Interval();
      interval.setLength(subscriptionPlan.interval);
      interval.setUnit(APIContracts.ARBSubscriptionUnitEnum.DAYS);
      paymentSchedule.setInterval(interval);
      paymentSchedule.setStartDate(new Date().toISOString().split('T')[0]);
      paymentSchedule.setTotalOccurrences(subscriptionPlan.totalOccurrences);

      // Create subscription
      const subscription = new APIContracts.ARBSubscriptionType();
      subscription.setName(subscriptionPlan.name);
      subscription.setPaymentSchedule(paymentSchedule);
      subscription.setAmount(subscriptionPlan.amount);
      subscription.setPayment(payment);
      subscription.setCustomer(customer);
      subscription.setBillTo(billTo);

      const createRequest = new APIContracts.ARBCreateSubscriptionRequest();
      createRequest.setMerchantAuthentication(this.getMerchantAuth('fap'));
      createRequest.setSubscription(subscription);

      const ctrl = new APIControllers.ARBCreateSubscriptionController(createRequest.getJSON());
      
      if (this.fapConfig.environment === 'sandbox') {
        ctrl.setEnvironment(Constants.endpoint.sandbox);
      }

      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.ARBCreateSubscriptionResponse(apiResponse);

        if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
          resolve({
            success: true,
            subscriptionId: response.getSubscriptionId(),
            messages: response.getMessages()
          });
        } else {
          reject({
            success: false,
            error: 'Subscription creation failed',
            messages: response.getMessages()
          });
        }
      });
    });
  }

  /**
   * Get public client key for frontend
   */
  getPublicKey(paymentType: 'fap' | 'tgf'): string {
    return paymentType === 'fap' ? this.fapConfig.publicKey : this.tgfConfig.publicKey;
  }

  /**
   * Validate test card numbers for sandbox
   */
  static getTestCards() {
    return {
      visa: '4111111111111111',
      mastercard: '5424000000000015',
      amex: '378282246310005',
      discover: '6011111111111117',
      // Test cards that will decline
      declined: '4000000000000002',
      insufficientFunds: '4000000000000036'
    };
  }
}

export const authorizeNetService = new AuthorizeNetService();
export { AuthorizeNetService };