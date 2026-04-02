export async function initializePayment(orderId: string, buyer: InitializePaymentInput['buyer']) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const siteBase = getClientUrl();
  if (!siteBase) {
    throw new Error('CLIENT_URL is not set; cannot build payment redirect URL');
  }

  const txRef = `REAGLEX-${order._id}-${Date.now()}`;

  const payload: any = {
    tx_ref: txRef,
    amount: order.total,
    currency: order.paymentMethod === 'RWF' ? 'RWF' : 'USD',
    redirect_url: `${siteBase}/payment/verify`,
    customer: {
      email: buyer.email,
      phonenumber: buyer.phone,
      name: buyer.fullName,
    },
    customizations: {
      title: 'Reaglex Payment',
      description: `Order ${order._id}`,
      logo: `${siteBase}/logo.jpg`,
    },
    meta: {
      order_id: order._id.toString(),
      buyer_id: buyer._id.toString(),
      seller_id: order.sellerId.toString(),
    },
  };

  // ✅ Check niba flw.Payment iriho mbere yo guhamagara
  if (!flw.Payment || typeof flw.Payment.initiate !== 'function') {
    throw new Error(
      'Flutterwave is not configured properly. Please check FLW_PUBLIC_KEY and FLW_SECRET_KEY in your .env'
    );
  }

  const response = await flw.Payment.initiate(payload as any);

  if (response.status === 'success') {
    await Order.findByIdAndUpdate(order._id, {
      'payment.flutterwaveReference': txRef,
      'escrow.status': 'PENDING',
    });

    return {
      paymentLink: response.data.link,
      txRef,
      amount: order.total,
    };
  }

  throw new Error(response.message || 'Failed to initialize payment');
}
