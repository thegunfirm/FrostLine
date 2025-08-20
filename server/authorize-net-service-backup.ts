import AuthorizeNet from 'authorizenet';
const { APIContracts, APIControllers } = AuthorizeNet;

export interface AuthOnlyResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  expiresAt?: Date;
  error?: string;
  rawResponse?: any;
}

export interface CaptureResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  rawResponse?: any;
}

export interface VoidResult {
  success: boolean;
  error?: string;
  rawResponse?: any;
}

export class AuthorizeNetService {
  private merchantAuth: any;

  constructor() {
    if (!process.env.AUTHORIZE_NET_API_LOGIN_ID || !process.env.AUTHORIZE_NET_TRANSACTION_KEY) {
      throw new Error('Authorize.Net credentials not configured');
    }

    // Check if we're in test mode (bypass actual API calls)
    if (process.env.NODE_ENV === 'development' && process.env.AUTHNET_TEST_MODE === 'true') {
      console.log(`🧪 Authorize.Net TEST MODE - API calls will be simulated`);
      return;
    }

    // Ensure we're using sandbox environment for testing
    process.env.AUTHORIZE_NET_ENDPOINT = 'https://apitest.authorize.net/xml/v1/request.api';

    this.merchantAuth = new APIContracts.MerchantAuthenticationType();
    this.merchantAuth.setName(process.env.AUTHORIZE_NET_API_LOGIN_ID);
    this.merchantAuth.setTransactionKey(process.env.AUTHORIZE_NET_TRANSACTION_KEY);

    console.log(`🏦 Authorize.Net configured for SANDBOX environment`);
    console.log(`📋 Using API Login ID: ${process.env.AUTHORIZE_NET_API_LOGIN_ID}`);
  }

  /**
   * Create an authorization-only transaction (for holds)
   */
  async authOnlyTransaction(
    amount: number,
    cardNumber: string,
    expirationDate: string,
    cvv: string,
    customerInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address?: {
        street: string;
        city: string;
        state: string;
        zip: string;
      };
    }
  ): Promise<AuthOnlyResult> {
    try {
      // Create payment method
      const creditCard = new APIContracts.CreditCardType();
      creditCard.setCardNumber(cardNumber);
      creditCard.setExpirationDate(expirationDate);
      creditCard.setCardCode(cvv);

      const paymentType = new APIContracts.PaymentType();
      paymentType.setCreditCard(creditCard);

      // Create customer info
      const customer = new APIContracts.CustomerDataType();
      customer.setEmail(customerInfo.email);

      const billTo = new APIContracts.CustomerAddressType();
      billTo.setFirstName(customerInfo.firstName);
      billTo.setLastName(customerInfo.lastName);
      billTo.setEmail(customerInfo.email);
      
      if (customerInfo.phone) {
        billTo.setPhoneNumber(customerInfo.phone);
      }

      if (customerInfo.address) {
        billTo.setAddress(customerInfo.address.street);
        billTo.setCity(customerInfo.address.city);
        billTo.setState(customerInfo.address.state);
        billTo.setZip(customerInfo.address.zip);
        billTo.setCountry('US');
      }

      // Create transaction request
      const transactionRequest = new APIContracts.TransactionRequestType();
      transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
      transactionRequest.setPayment(paymentType);
      transactionRequest.setAmount(amount);
      transactionRequest.setCustomer(customer);
      transactionRequest.setBillTo(billTo);

      // Create the API request
      const createRequest = new APIContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(this.merchantAuth);
      createRequest.setTransactionRequest(transactionRequest);

      // Execute the transaction with timeout
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          resolve({
            success: false,
            error: 'Authorize.Net API call timed out after 15 seconds',
          });
        }, 15000);

        try {
          const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
          
          ctrl.execute(() => {
            clearTimeout(timeoutId);
            
            try {
              const response = ctrl.getResponse();
              
              if (response && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
                const transactionResponse = response.getTransactionResponse();
                
                if (transactionResponse.getMessages() !== null) {
                  // Success
                  const transactionId = transactionResponse.getTransId();
                  const authCode = transactionResponse.getAuthCode();
                  
                  // Auth transactions typically expire in 30 days
                  const expiresAt = new Date();
                  expiresAt.setDate(expiresAt.getDate() + 30);

                  resolve({
                    success: true,
                    transactionId,
                    authCode,
                    expiresAt,
                    rawResponse: response,
                  });
                } else {
                  // Transaction failed
                  const errorCode = transactionResponse.getErrors().getError()[0].getErrorCode();
                  const errorText = transactionResponse.getErrors().getError()[0].getErrorText();
                  
                  resolve({
                    success: false,
                    error: `Transaction failed: ${errorCode} - ${errorText}`,
                    rawResponse: response,
                  });
                }
              } else {
                // API call failed
                const errorMessages = response.getMessages().getMessage();
                const errorText = errorMessages[0].getText();
                
                resolve({
                  success: false,
                  error: `API call failed: ${errorText}`,
                  rawResponse: response,
                });
              }
            } catch (parseError: any) {
              resolve({
                success: false,
                error: `Response parsing error: ${parseError.message}`,
              });
            }
          });
        } catch (executeError: any) {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: `Execute error: ${executeError.message}`,
          });
        }
      });
    } catch (error: any) {
      return {
        success: false,
        error: `Auth transaction error: ${error.message}`,
      };
    }
  }

  /**
   * Capture a previously authorized transaction
   */
  async capturePriorAuthTransaction(
    transactionId: string,
    amount: number
  ): Promise<CaptureResult> {
    try {
      // Create transaction request for prior auth capture
      const transactionRequest = new APIContracts.TransactionRequestType();
      transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.PRIORAUTHCAPTURETRANSACTION);
      transactionRequest.setAmount(amount);
      transactionRequest.setRefTransId(transactionId);

      // Create the API request
      const createRequest = new APIContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(this.merchantAuth);
      createRequest.setTransactionRequest(transactionRequest);

      // Execute the transaction
      return new Promise((resolve) => {
        const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
        
        ctrl.execute(() => {
          const response = ctrl.getResponse();
          
          if (response && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
            const transactionResponse = response.getTransactionResponse();
            
            if (transactionResponse.getMessages() !== null) {
              // Success
              const newTransactionId = transactionResponse.getTransId();
              
              resolve({
                success: true,
                transactionId: newTransactionId,
                rawResponse: response,
              });
            } else {
              // Transaction failed
              const errorCode = transactionResponse.getErrors().getError()[0].getErrorCode();
              const errorText = transactionResponse.getErrors().getError()[0].getErrorText();
              
              resolve({
                success: false,
                error: `Capture failed: ${errorCode} - ${errorText}`,
                rawResponse: response,
              });
            }
          } else {
            // API call failed
            const errorMessages = response.getMessages().getMessage();
            const errorText = errorMessages[0].getText();
            
            resolve({
              success: false,
              error: `API call failed: ${errorText}`,
              rawResponse: response,
            });
          }
        });
      });
    } catch (error: any) {
      return {
        success: false,
        error: `Capture transaction error: ${error.message}`,
      };
    }
  }

  /**
   * Void a transaction (cancel an auth or refund a capture)
   */
  async voidTransaction(transactionId: string): Promise<VoidResult> {
    try {
      // Create transaction request for void
      const transactionRequest = new APIContracts.TransactionRequestType();
      transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.VOIDTRANSACTION);
      transactionRequest.setRefTransId(transactionId);

      // Create the API request
      const createRequest = new APIContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(this.merchantAuth);
      createRequest.setTransactionRequest(transactionRequest);

      // Execute the transaction
      return new Promise((resolve) => {
        const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
        
        ctrl.execute(() => {
          const response = ctrl.getResponse();
          
          if (response && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
            const transactionResponse = response.getTransactionResponse();
            
            if (transactionResponse.getMessages() !== null) {
              // Success
              resolve({
                success: true,
                rawResponse: response,
              });
            } else {
              // Transaction failed
              const errorCode = transactionResponse.getErrors().getError()[0].getErrorCode();
              const errorText = transactionResponse.getErrors().getError()[0].getErrorText();
              
              resolve({
                success: false,
                error: `Void failed: ${errorCode} - ${errorText}`,
                rawResponse: response,
              });
            }
          } else {
            // API call failed
            const errorMessages = response.getMessages().getMessage();
            const errorText = errorMessages[0].getText();
            
            resolve({
              success: false,
              error: `API call failed: ${errorText}`,
              rawResponse: response,
            });
          }
        });
      });
    } catch (error: any) {
      return {
        success: false,
        error: `Void transaction error: ${error.message}`,
      };
    }
  }

  /**
   * Create a standard auth+capture transaction (immediate payment)
   */
  async authCaptureTransaction(
    amount: number,
    cardNumber: string,
    expirationDate: string,
    cvv: string,
    customerInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address?: {
        street: string;
        city: string;
        state: string;
        zip: string;
      };
    }
  ): Promise<AuthOnlyResult> {
    try {
      // Create payment method
      const creditCard = new APIContracts.CreditCardType();
      creditCard.setCardNumber(cardNumber);
      creditCard.setExpirationDate(expirationDate);
      creditCard.setCardCode(cvv);

      const paymentType = new APIContracts.PaymentType();
      paymentType.setCreditCard(creditCard);

      // Create customer info
      const customer = new APIContracts.CustomerDataType();
      customer.setEmail(customerInfo.email);

      const billTo = new APIContracts.CustomerAddressType();
      billTo.setFirstName(customerInfo.firstName);
      billTo.setLastName(customerInfo.lastName);
      billTo.setEmail(customerInfo.email);
      
      if (customerInfo.phone) {
        billTo.setPhoneNumber(customerInfo.phone);
      }

      if (customerInfo.address) {
        billTo.setAddress(customerInfo.address.street);
        billTo.setCity(customerInfo.address.city);
        billTo.setState(customerInfo.address.state);
        billTo.setZip(customerInfo.address.zip);
        billTo.setCountry('US');
      }

      // Create transaction request for auth+capture
      const transactionRequest = new APIContracts.TransactionRequestType();
      transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
      transactionRequest.setPayment(paymentType);
      transactionRequest.setAmount(amount);
      transactionRequest.setCustomer(customer);
      transactionRequest.setBillTo(billTo);

      // Create the API request
      const createRequest = new APIContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(this.merchantAuth);
      createRequest.setTransactionRequest(transactionRequest);

      // Execute the transaction
      return new Promise((resolve) => {
        const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
        
        ctrl.execute(() => {
          const response = ctrl.getResponse();
          
          if (response && response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
            const transactionResponse = response.getTransactionResponse();
            
            if (transactionResponse.getMessages() !== null) {
              // Success
              const transactionId = transactionResponse.getTransId();
              const authCode = transactionResponse.getAuthCode();
              
              resolve({
                success: true,
                transactionId,
                authCode,
                rawResponse: response,
              });
            } else {
              // Transaction failed
              const errorCode = transactionResponse.getErrors().getError()[0].getErrorCode();
              const errorText = transactionResponse.getErrors().getError()[0].getErrorText();
              
              resolve({
                success: false,
                error: `Transaction failed: ${errorCode} - ${errorText}`,
                rawResponse: response,
              });
            }
          } else {
            // API call failed
            const errorMessages = response.getMessages().getMessage();
            const errorText = errorMessages[0].getText();
            
            resolve({
              success: false,
              error: `API call failed: ${errorText}`,
              rawResponse: response,
            });
          }
        });
      });
    } catch (error: any) {
      return {
        success: false,
        error: `Auth+Capture transaction error: ${error.message}`,
      };
    }
  }
}

// Export singleton instance
export const authorizeNetService = new AuthorizeNetService();