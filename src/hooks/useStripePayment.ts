import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const useStripePayment = () => {
  const handlePayment = async (sessionId: string) => {
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe failed to initialize.');

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      console.error('Stripe checkout error:', error);
    }
  };

  return { handlePayment };
};

export default useStripePayment; 