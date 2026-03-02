/**
 * Seed Inbox Test Data
 * Run this script to populate the database with test inbox threads and messages
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { MessageThread, Message } from '../models/MessageThread';
import { User } from '../models/User';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function seedInboxData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Hash password for test users
    const testPasswordHash = await bcrypt.hash('test123', 10);

    // Find or create test users
    let seller = await User.findOne({ email: 'seller@test.com' });
    if (!seller) {
      seller = await User.create({
        fullName: 'Test Seller',
        email: 'seller@test.com',
        passwordHash: testPasswordHash,
        role: 'seller',
        sellerVerificationStatus: 'approved',
        isSellerVerified: true,
      });
      console.log('✅ Created test seller (email: seller@test.com, password: test123)');
    } else {
      console.log('✅ Found existing seller');
    }

    let buyer1 = await User.findOne({ email: 'buyer1@test.com' });
    if (!buyer1) {
      buyer1 = await User.create({
        fullName: 'Acme Corp',
        email: 'buyer1@test.com',
        passwordHash: testPasswordHash,
        role: 'buyer',
      });
      console.log('✅ Created test buyer 1');
    } else {
      console.log('✅ Found existing buyer 1');
    }

    let buyer2 = await User.findOne({ email: 'buyer2@test.com' });
    if (!buyer2) {
      buyer2 = await User.create({
        fullName: 'Global Retailers Ltd',
        email: 'buyer2@test.com',
        passwordHash: testPasswordHash,
        role: 'buyer',
      });
      console.log('✅ Created test buyer 2');
    } else {
      console.log('✅ Found existing buyer 2');
    }

    let buyer3 = await User.findOne({ email: 'buyer3@test.com' });
    if (!buyer3) {
      buyer3 = await User.create({
        fullName: 'Startup Hub',
        email: 'buyer3@test.com',
        passwordHash: testPasswordHash,
        role: 'buyer',
      });
      console.log('✅ Created test buyer 3');
    } else {
      console.log('✅ Found existing buyer 3');
    }

    // Clear existing test threads
    await MessageThread.deleteMany({ sellerId: seller._id });
    await Message.deleteMany({});
    console.log('✅ Cleared existing test data');

    // Create Thread 1: RFQ
    const thread1 = await MessageThread.create({
      sellerId: seller._id,
      buyerId: buyer1._id,
      subject: 'RFQ: 500 units of Wireless Headphones',
      type: 'rfq',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      lastMessagePreview: 'Can you confirm lead time to EU warehouse?',
      sellerUnreadCount: 1,
      buyerUnreadCount: 0,
    });

    await Message.create({
      threadId: thread1._id,
      senderId: buyer1._id,
      senderType: 'buyer',
      content: 'Hi, we\'re interested in a quote for 500 units shipped to the EU. Can you share lead times and payment terms?',
      status: 'read',
      readBy: [seller._id],
    });

    await Message.create({
      threadId: thread1._id,
      senderId: seller._id,
      senderType: 'seller',
      content: 'Thanks for reaching out—standard lead time is 10–14 days. For this volume we can offer Net 30 terms for approved enterprise buyers.',
      status: 'read',
      readBy: [buyer1._id, seller._id],
    });

    await Message.create({
      threadId: thread1._id,
      senderId: buyer1._id,
      senderType: 'buyer',
      content: 'Can you confirm lead time to EU warehouse?',
      status: 'sent',
      readBy: [],
    });

    console.log('✅ Created thread 1 (RFQ)');

    // Create Thread 2: Order Message
    const thread2 = await MessageThread.create({
      sellerId: seller._id,
      buyerId: buyer2._id,
      subject: 'Order #ORD-2847 – Shipping address clarification',
      type: 'order',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      lastMessagePreview: 'We need to update the delivery contact.',
      sellerUnreadCount: 0,
      buyerUnreadCount: 1,
    });

    await Message.create({
      threadId: thread2._id,
      senderId: buyer2._id,
      senderType: 'buyer',
      content: 'We need to update the delivery contact for order #ORD-2847. The contact person has changed.',
      status: 'read',
      readBy: [seller._id],
    });

    await Message.create({
      threadId: thread2._id,
      senderId: seller._id,
      senderType: 'seller',
      content: 'No problem! Please provide the new contact details and I\'ll update the order immediately.',
      status: 'read',
      readBy: [buyer2._id, seller._id],
    });

    await Message.create({
      threadId: thread2._id,
      senderId: buyer2._id,
      senderType: 'buyer',
      content: 'We need to update the delivery contact.',
      status: 'sent',
      readBy: [],
    });

    console.log('✅ Created thread 2 (Order)');

    // Create Thread 3: RFQ
    const thread3 = await MessageThread.create({
      sellerId: seller._id,
      buyerId: buyer3._id,
      subject: 'RFQ: Annual subscription & support',
      type: 'rfq',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      lastMessagePreview: 'Can you share enterprise pricing for 3 regions?',
      sellerUnreadCount: 0,
      buyerUnreadCount: 0,
    });

    await Message.create({
      threadId: thread3._id,
      senderId: buyer3._id,
      senderType: 'buyer',
      content: 'Can you share enterprise pricing for 3 regions? We\'re looking at expanding our operations.',
      status: 'read',
      readBy: [seller._id],
    });

    await Message.create({
      threadId: thread3._id,
      senderId: seller._id,
      senderType: 'seller',
      content: 'I\'ll prepare a comprehensive quote for all 3 regions. Should I include volume discounts?',
      status: 'read',
      readBy: [buyer3._id, seller._id],
    });

    console.log('✅ Created thread 3 (RFQ)');

    // Create Thread 4: General Message
    const thread4 = await MessageThread.create({
      sellerId: seller._id,
      buyerId: buyer1._id,
      subject: 'Product inquiry - Wireless Earbuds',
      type: 'message',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      lastMessagePreview: 'What colors are available?',
      sellerUnreadCount: 0,
      buyerUnreadCount: 0,
    });

    await Message.create({
      threadId: thread4._id,
      senderId: buyer1._id,
      senderType: 'buyer',
      content: 'I\'m interested in your wireless earbuds. What colors are available?',
      status: 'read',
      readBy: [seller._id],
    });

    await Message.create({
      threadId: thread4._id,
      senderId: seller._id,
      senderType: 'seller',
      content: 'We have black, white, blue, and red available. All colors are in stock and ready to ship.',
      status: 'read',
      readBy: [buyer1._id, seller._id],
    });

    await Message.create({
      threadId: thread4._id,
      senderId: buyer1._id,
      senderType: 'buyer',
      content: 'What colors are available?',
      status: 'read',
      readBy: [seller._id],
    });

    console.log('✅ Created thread 4 (Message)');

    console.log('\n✅ Successfully seeded inbox test data!');
    console.log(`\nTest Seller ID: ${seller._id}`);
    console.log(`Created ${await MessageThread.countDocuments({ sellerId: seller._id })} threads`);
    console.log(`Created ${await Message.countDocuments({})} messages`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedInboxData();

