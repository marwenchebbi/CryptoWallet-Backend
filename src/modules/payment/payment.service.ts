import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-04-30.basil', // Use the required API version
    });
  }

  async createPaymentIntent(amount: number, currency: string, metadata: any) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      if (!paymentIntent.client_secret) {
        throw new InternalServerErrorException('Stripe returned null client_secret');
      }
      return {
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create payment intent: ${error.message}`);
    }
  }

  async confirmPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to confirm payment: ${error.message}`);
    }
  }

  async createPayoutIntent(
    amount: number,
    currency: string,
    metadata: any,
    cardDetails: { paymentMethodId: string; email: string; name: string },
  ) {
    try {
      // Step 1: Retrieve or create a customer
      let customer;
      const existingCustomers = await this.stripe.customers.list({
        email: cardDetails.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await this.stripe.customers.create({
          email: cardDetails.email,
          name: cardDetails.name,
        });
      }

      // Step 2: Attach the payment method to the customer
      await this.stripe.paymentMethods.attach(cardDetails.paymentMethodId, {
        customer: customer.id,
      });

      // Step 3: Create a payment intent (simulating a payout)
      // Note: Direct card payouts require Stripe Connect and special permissions.
      const payoutIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customer.id,
        payment_method: cardDetails.paymentMethodId,
        metadata: {
          ...metadata,
          payoutType: 'sell_crypto',
        },
        confirm: true,
        payment_method_types: ['card'],
        capture_method: 'automatic',
      });

      if (!payoutIntent.client_secret) {
        throw new InternalServerErrorException('Stripe returned null client_secret');
      }

      return {
        clientSecret: payoutIntent.client_secret,
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create payout intent: ${error.message}`);
    }
  }

  async confirmPayoutIntent(payoutIntentId: string) {
    try {
      const payoutIntent = await this.stripe.paymentIntents.retrieve(payoutIntentId);
      return payoutIntent;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to confirm payout: ${error.message}`);
    }
  }
}