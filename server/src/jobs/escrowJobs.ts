import cron from 'node-cron';
import { Order } from '../models/Order';
import { EscrowWallet } from '../models/EscrowWallet';
import { autoReleaseEscrow } from '../services/escrowService';
import { sendAdminReport } from '../services/notificationService';

// Run every hour — check for eligible auto-releases
cron.schedule('0 * * * *', async () => {
  // eslint-disable-next-line no-console
  console.log('Running escrow auto-release check...');

  const eligibleOrders = await Order.find({
    'escrow.status': 'SHIPPED',
    'escrow.releaseEligibleAt': { $lte: new Date() },
    'escrow.disputeRaisedAt': { $exists: false },
    'escrow.autoReleaseScheduled': true,
  });

  for (const order of eligibleOrders) {
    try {
      await autoReleaseEscrow(order._id.toString());
      // eslint-disable-next-line no-console
      console.log(`Auto-released order: ${order._id}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Auto-release failed for ${order._id}:`, err);
    }
  }
});

// Daily summary report at 09:00
cron.schedule('0 9 * * *', async () => {
  const wallet = await EscrowWallet.findOne();
  if (!wallet) return;

  await sendAdminReport({
    totalHeld: wallet.totalHeld,
    totalReleased: wallet.totalReleased,
    totalFees: wallet.totalFees,
  });
});

