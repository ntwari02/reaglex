import { Order } from '../models/Order';

export function buildBnplPlan(params: {
  totalAmount: number;
  installments: number;
  aprPercent?: number;
  provider?: string;
}) {
  const n = Math.max(2, Math.min(24, Number(params.installments) || 6));
  const monthlyRate = (Number(params.aprPercent || 12) / 100) / 12;
  const base = params.totalAmount / n;
  const schedule = [];
  let cursor = new Date();
  for (let i = 0; i < n; i += 1) {
    const interest = base * monthlyRate;
    const amount = Math.round((base + interest) * 100) / 100;
    cursor = new Date(cursor.getTime() + 30 * 24 * 60 * 60 * 1000);
    schedule.push({
      installment: i + 1,
      amount,
      dueDate: cursor.toISOString(),
      status: i === 0 ? 'due_now' : 'scheduled',
    });
  }
  return {
    provider: params.provider || 'KCB',
    installments: n,
    aprPercent: params.aprPercent || 12,
    totalWithInterest: schedule.reduce((s, x) => s + x.amount, 0),
    schedule,
  };
}

export async function attachBnplToOrder(orderId: string, plan: ReturnType<typeof buildBnplPlan>) {
  await Order.findByIdAndUpdate(orderId, {
    $set: {
      'paymentIntelligence.bnpl': {
        ...plan,
        status: 'approved',
        approvedAt: new Date(),
      },
      paymentMethod: 'bnpl',
    },
  });
}
