import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, MapPin, Truck, CreditCard, CheckCircle, Lock, ShoppingBag, ArrowLeft } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { useBuyerCart } from '../stores/buyerCartStore';
import { paymentAPI } from '../services/api';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const resolveImg = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
  return src.startsWith('http') ? src : `${SERVER_URL}${src}`;
};

const STEPS = [
  { id: 1, label: 'Address',  icon: MapPin },
  { id: 2, label: 'Delivery', icon: Truck },
  { id: 3, label: 'Payment',  icon: CreditCard },
  { id: 4, label: 'Confirm',  icon: CheckCircle },
];

const inp = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none border bg-[var(--card-bg)] placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition';
const inpStyle = { borderColor: '#e5e7eb' };

const DELIVERY_OPTIONS = [
  { id: 'standard', label: 'Standard Shipping', sub: '5–7 business days', price: 4.99, icon: '📦' },
  { id: 'express',  label: 'Express Shipping',  sub: '2–3 business days', price: 12.99, icon: '⚡' },
  { id: 'overnight',label: 'Overnight Delivery', sub: 'Next business day', price: 24.99, icon: '🚀' },
];

const PAYMENT_METHODS = [
  { id: 'card',         label: 'Credit / Debit Card',  icon: '💳' },
  { id: 'paypal',       label: 'PayPal',               icon: '🅿️' },
  { id: 'mobile_money', label: 'Mobile Money',         icon: '📱' },
  { id: 'crypto',       label: 'Cryptocurrency',       icon: '₿' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const items    = useBuyerCart(s => s.items);
  const clearCart = useBuyerCart(s => s.clearCart);

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({ fullName: '', email: '', phone: '', street: '', city: '', state: '', zip: '', country: '' });
  const [delivery, setDelivery]   = useState('standard');
  const [payment,  setPayment]    = useState('card');
  const [cardInfo, setCardInfo]   = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [placing, setPlacing] = useState(false);

  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingCost = DELIVERY_OPTIONS.find(d => d.id === delivery)?.price || 4.99;
  const tax       = subtotal * 0.1;
  const total     = subtotal + shippingCost + tax;

  const nextStep  = () => setStep(s => Math.min(4, s + 1));
  const prevStep  = () => setStep(s => Math.max(1, s - 1));

  const placeOrder = async () => {
    if (!agreedTerms) return alert('Please agree to the terms.');
    setPlacing(true);
    try {
      // TODO: Replace with real order creation call.
      const fakeOrderId = 'ORD-' + Date.now();
      const init = await paymentAPI.initialize(fakeOrderId);
      if (init?.paymentLink) {
        window.location.href = init.paymentLink;
      } else {
        setPlacing(false);
        alert('Failed to initialize payment');
      }
    } catch (err) {
      console.error('Payment init failed', err);
      setPlacing(false);
      alert('Payment initialization failed');
    }
  };

  if (items.length === 0) return (
    <BuyerLayout>
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <ShoppingBag className="w-14 h-14" style={{ color: '#e5e7eb' }} />
        <h2 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>Your cart is empty</h2>
        <Link to="/">
          <button className="px-6 py-2.5 rounded-2xl text-white font-semibold"
            style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)' }}>Shop Now</button>
        </Link>
      </div>
    </BuyerLayout>
  );

  return (
    <BuyerLayout>
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-8">

        {/* Back */}
        <motion.button whileHover={{ x: -3 }} onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-sm font-semibold" style={{ color: '#6b7280' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </motion.button>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <button onClick={() => s.id < step && setStep(s.id)}
                className="flex flex-col items-center gap-1 group">
                <motion.div
                  animate={{ background: step >= s.id ? '#ff8c42' : step === s.id ? '#ff8c42' : '#e5e7eb' }}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: step >= s.id ? '#ff8c42' : '#e5e7eb' }}>
                  {step > s.id
                    ? <CheckCircle className="w-4 h-4 text-white" />
                    : <s.icon className="w-4 h-4" style={{ color: step >= s.id ? 'white' : '#9ca3af' }} />
                  }
                </motion.div>
                <span className="text-xs font-semibold hidden sm:block"
                  style={{ color: step >= s.id ? '#ff8c42' : '#9ca3af' }}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2" style={{ background: step > s.id ? '#ff8c42' : '#e5e7eb' }} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main form area ── */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                className="rounded-2xl p-6" style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>

                {/* Step 1: Address */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-black mb-4" style={{ color: '#1a1a1a' }}>📍 Shipping Address</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[['fullName','Full Name'],['email','Email Address'],['phone','Phone Number'],['street','Street Address'],['city','City'],['state','State / Province'],['zip','ZIP / Postal Code'],['country','Country']].map(([f, ph]) => (
                        <input key={f} type="text" placeholder={ph} value={address[f]}
                          onChange={e => setAddress({ ...address, [f]: e.target.value })}
                          className={`${inp} ${f === 'street' ? 'sm:col-span-2' : ''}`} style={inpStyle} />
                      ))}
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={nextStep}
                      className="w-full py-3 rounded-2xl text-white font-bold text-sm mt-2"
                      style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}>
                      Continue to Delivery →
                    </motion.button>
                  </div>
                )}

                {/* Step 2: Delivery */}
                {step === 2 && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-black mb-4" style={{ color: '#1a1a1a' }}>🚚 Delivery Method</h2>
                    {DELIVERY_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => setDelivery(opt.id)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 transition"
                        style={{ borderColor: delivery === opt.id ? '#ff8c42' : '#e5e7eb', background: delivery === opt.id ? 'rgba(255,140,66,0.05)' : 'white' }}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{opt.icon}</span>
                          <div className="text-left">
                            <p className="font-semibold text-sm" style={{ color: '#1a1a1a' }}>{opt.label}</p>
                            <p className="text-xs" style={{ color: '#9ca3af' }}>{opt.sub}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm" style={{ color: '#ff8c42' }}>${opt.price.toFixed(2)}</p>
                          <div className="w-4 h-4 rounded-full border-2 mt-1 mx-auto flex items-center justify-center"
                            style={{ borderColor: delivery === opt.id ? '#ff8c42' : '#d1d5db' }}>
                            {delivery === opt.id && <div className="w-2 h-2 rounded-full" style={{ background: '#ff8c42' }} />}
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="flex gap-3 pt-2">
                      <button onClick={prevStep} className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                        style={{ background: '#f3f4f6', color: '#374151' }}>← Back</button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={nextStep} className="flex-1 py-3 rounded-2xl text-white font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}>
                        Continue to Payment →
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Step 3: Payment */}
                {step === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-black mb-4" style={{ color: '#1a1a1a' }}>💳 Payment Method</h2>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {PAYMENT_METHODS.map(pm => (
                        <button key={pm.id} onClick={() => setPayment(pm.id)}
                          className="flex items-center gap-2 p-3 rounded-2xl border-2 transition"
                          style={{ borderColor: payment === pm.id ? '#ff8c42' : '#e5e7eb', background: payment === pm.id ? 'rgba(255,140,66,0.05)' : 'white' }}>
                          <span className="text-xl">{pm.icon}</span>
                          <span className="text-xs font-semibold" style={{ color: payment === pm.id ? '#ff8c42' : '#374151' }}>{pm.label}</span>
                        </button>
                      ))}
                    </div>
                    {payment === 'card' && (
                      <div className="space-y-3 p-4 rounded-2xl" style={{ background: '#fafafa', border: '1px solid #f3f4f6' }}>
                        <input placeholder="Cardholder Name" value={cardInfo.name}
                          onChange={e => setCardInfo({ ...cardInfo, name: e.target.value })} className={inp} style={inpStyle} />
                        <input placeholder="Card Number (1234 5678 9012 3456)" value={cardInfo.number}
                          onChange={e => setCardInfo({ ...cardInfo, number: e.target.value })} className={inp} style={inpStyle} />
                        <div className="grid grid-cols-2 gap-3">
                          <input placeholder="MM / YY" value={cardInfo.expiry}
                            onChange={e => setCardInfo({ ...cardInfo, expiry: e.target.value })} className={inp} style={inpStyle} />
                          <input placeholder="CVV" value={cardInfo.cvv}
                            onChange={e => setCardInfo({ ...cardInfo, cvv: e.target.value })} className={inp} style={inpStyle} />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button onClick={prevStep} className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                        style={{ background: '#f3f4f6', color: '#374151' }}>← Back</button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={nextStep} className="flex-1 py-3 rounded-2xl text-white font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}>
                        Review Order →
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Confirm */}
                {step === 4 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-black mb-4" style={{ color: '#1a1a1a' }}>✅ Review Your Order</h2>
                    <div className="space-y-2 mb-4">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: '#fafafa' }}>
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#f3f4f6' }}>
                            <img src={resolveImg(item.image)} alt={item.title} className="w-full h-full object-cover"
                              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'; }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>{item.title}</p>
                            <p className="text-xs" style={{ color: '#9ca3af' }}>Qty: {item.quantity}</p>
                          </div>
                          <span className="font-bold text-sm" style={{ color: '#ff8c42' }}>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
                      <span className="text-xs" style={{ color: '#6b7280' }}>
                        I agree to the <span style={{ color: '#ff8c42' }}>Terms of Service</span> and understand the <span style={{ color: '#ff8c42' }}>Refund Policy</span>
                      </span>
                    </label>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <Lock className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                      <span className="text-xs" style={{ color: '#16a34a' }}>Your payment is protected by escrow. Funds are released to the seller only after you confirm delivery.</span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={prevStep} className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                        style={{ background: '#f3f4f6', color: '#374151' }}>← Back</button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={placeOrder} disabled={placing || !agreedTerms}
                        className="flex-1 py-3 rounded-2xl text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}>
                        {placing ? '⏳ Placing Order…' : `Place Order · $${total.toFixed(2)}`}
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Order summary sidebar ── */}
          <div className="rounded-2xl p-5 h-fit sticky top-20 space-y-4"
            style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <h3 className="font-black text-sm" style={{ color: '#1a1a1a' }}>Order Summary</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#f3f4f6' }}>
                    <img src={resolveImg(item.image)} alt={item.title} className="w-full h-full object-cover"
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80'; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#1a1a1a' }}>{item.title}</p>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>×{item.quantity}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#1a1a1a' }}>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2">
              {[['Subtotal', `$${subtotal.toFixed(2)}`], ['Shipping', `$${shippingCost.toFixed(2)}`], ['Tax (10%)', `$${tax.toFixed(2)}`]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs" style={{ color: '#6b7280' }}>
                  <span>{l}</span><span className="font-semibold" style={{ color: '#1a1a1a' }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between font-black pt-2 border-t" style={{ borderColor: '#f3f4f6' }}>
                <span style={{ color: '#1a1a1a' }}>Total</span>
                <span style={{ color: '#ff8c42', fontSize: '1.1rem' }}>${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-xl text-xs" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Lock className="w-3.5 h-3.5 flex-shrink-0" /> Escrow-protected checkout
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
