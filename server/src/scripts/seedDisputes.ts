import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Dispute } from '../models/Dispute';
import { Order } from '../models/Order';
import { User } from '../models/User';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env file');
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const seedDisputes = async () => {
  try {
    console.log('🌱 Starting dispute seed...');

    // Get seller ID from command line argument or find first seller
    const sellerIdArg = process.argv[2];
    let seller;

    if (sellerIdArg) {
      // If seller ID provided as argument
      if (mongoose.Types.ObjectId.isValid(sellerIdArg)) {
        seller = await User.findById(sellerIdArg);
        if (!seller || seller.role !== 'seller') {
          console.log('❌ Invalid seller ID or user is not a seller');
          process.exit(1);
        }
        console.log('✅ Using provided seller ID:', seller._id, 'Email:', seller.email);
      } else {
        // If email provided
        seller = await User.findOne({ email: sellerIdArg, role: 'seller' });
        if (!seller) {
          console.log('❌ Seller not found with email:', sellerIdArg);
          process.exit(1);
        }
        console.log('✅ Using seller by email:', seller._id, 'Email:', seller.email);
      }
    } else {
      // Find or get a seller user - try to find the first approved seller, or any seller
      seller = await User.findOne({ 
        role: 'seller',
        sellerVerificationStatus: 'approved'
      });
      
      if (!seller) {
        seller = await User.findOne({ role: 'seller' });
      }
      
      if (!seller) {
        console.log('⚠️  No seller found. Creating a test seller...');
        seller = await User.create({
          fullName: 'Test Seller',
          email: 'seller@test.com',
          passwordHash: 'dummy', // Not used for disputes
          role: 'seller',
          sellerVerificationStatus: 'approved',
          isSellerVerified: true,
        });
        console.log('✅ Created test seller:', seller._id);
      } else {
        console.log('✅ Found seller:', seller._id, 'Email:', seller.email);
        console.log('📝 Note: Disputes will be created for this seller.');
        console.log('💡 Tip: To create disputes for a specific seller, run: npm run seed:disputes -- <sellerId or email>');
      }
    }

    // Find or create buyer users
    let buyer1 = await User.findOne({ role: 'buyer', email: 'buyer1@test.com' });
    if (!buyer1) {
      buyer1 = await User.create({
        fullName: 'John Buyer',
        email: 'buyer1@test.com',
        passwordHash: 'dummy',
        role: 'buyer',
      });
      console.log('✅ Created buyer1:', buyer1._id);
    }

    let buyer2 = await User.findOne({ role: 'buyer', email: 'buyer2@test.com' });
    if (!buyer2) {
      buyer2 = await User.create({
        fullName: 'Jane Customer',
        email: 'buyer2@test.com',
        passwordHash: 'dummy',
        role: 'buyer',
      });
      console.log('✅ Created buyer2:', buyer2._id);
    }

    // Find or create test orders
    let order1: any = await Order.findOne({ orderNumber: 'ORD-TEST-001' } as any);
    if (!order1) {
      order1 = await Order.create({
        sellerId: seller._id,
        buyerId: buyer1._id,
        orderNumber: 'ORD-TEST-001',
        customer: buyer1.fullName,
        customerEmail: buyer1.email,
        customerPhone: '+1234567890',
        items: [
          {
            productId: new mongoose.Types.ObjectId() as any,
            name: 'Test Product 1',
            quantity: 2,
            price: 29.99,
            variant: 'Blue, Large',
          },
        ] as any,
        subtotal: 59.98,
        shipping: 5.00,
        tax: 6.00,
        total: 70.98,
        status: 'delivered',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        shippingAddress: {
          name: buyer1.fullName,
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'USA',
        },
        paymentMethod: 'Credit Card',
        timeline: [],
      } as any);
      console.log('✅ Created order1:', order1._id);
    }

    let order2: any = await Order.findOne({ orderNumber: 'ORD-TEST-002' } as any);
    if (!order2) {
      order2 = await Order.create({
        sellerId: seller._id,
        buyerId: buyer2._id,
        orderNumber: 'ORD-TEST-002',
        customer: buyer2.fullName,
        customerEmail: buyer2.email,
        customerPhone: '+1234567891',
        items: [
          {
            productId: new mongoose.Types.ObjectId() as any,
            name: 'Test Product 2',
            quantity: 1,
            price: 49.99,
          },
          {
            productId: new mongoose.Types.ObjectId() as any,
            name: 'Test Product 3',
            quantity: 3,
            price: 19.99,
          },
        ] as any,
        subtotal: 109.96,
        shipping: 8.00,
        tax: 11.80,
        total: 129.76,
        status: 'shipped',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        shippingAddress: {
          name: buyer2.fullName,
          street: '456 Test Ave',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'USA',
        },
        paymentMethod: 'PayPal',
        timeline: [],
      } as any);
      console.log('✅ Created order2:', order2._id);
    }

    let order3: any = await Order.findOne({ orderNumber: 'ORD-TEST-003' } as any);
    if (!order3) {
      order3 = await Order.create({
        sellerId: seller._id,
        buyerId: buyer1._id,
        orderNumber: 'ORD-TEST-003',
        customer: buyer1.fullName,
        customerEmail: buyer1.email,
        customerPhone: '+1234567890',
        items: [
          {
            productId: new mongoose.Types.ObjectId() as any,
            name: 'Premium Product',
            quantity: 1,
            price: 99.99,
            variant: 'Gold',
          },
        ] as any,
        subtotal: 99.99,
        shipping: 10.00,
        tax: 11.00,
        total: 120.99,
        status: 'delivered',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        shippingAddress: {
          name: buyer1.fullName,
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'USA',
        },
        paymentMethod: 'Credit Card',
        timeline: [],
      } as any);
      console.log('✅ Created order3:', order3._id);
    }

    // Clear existing test disputes (we'll identify by order numbers)
    await Dispute.deleteMany({
      orderId: { $in: [order1._id, order2._id, order3._id] },
    } as any);
    console.log('🧹 Cleared existing test disputes');

    // Create sample disputes with different statuses
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Helper function to generate dispute number
    const generateDisputeNumber = () => {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `DSP-${timestamp}-${random}`;
    };

    // 1. New dispute - requires seller response
    const dispute1 = new Dispute({
      disputeNumber: generateDisputeNumber(),
      orderId: order1._id,
      sellerId: seller._id,
      buyerId: buyer1._id,
      type: 'quality',
      reason: 'Item not as described',
      description: 'The product I received does not match the description. The color is different and the quality is lower than expected. I would like a refund or replacement.',
      status: 'new',
      priority: 'high',
      evidence: [],
      responseDeadline: tomorrow,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    });
    await dispute1.save();
    console.log('✅ Created dispute 1 (new):', dispute1.disputeNumber);

    // 2. Dispute awaiting buyer response (seller has responded)
    const dispute2 = new Dispute({
      disputeNumber: generateDisputeNumber(),
      orderId: order2._id as any,
      sellerId: seller._id as any,
      buyerId: buyer2._id as any,
      type: 'delivery',
      reason: 'Late delivery',
      description: 'My order was supposed to arrive on January 10th but it arrived on January 14th, 4 days late. This caused inconvenience.',
      status: 'seller_response',
      priority: 'medium',
      evidence: [],
      sellerResponse: 'We apologize for the delay. We are investigating with the shipping carrier. We have contacted them and they confirmed there was a delay in their sorting facility. We will ensure this does not happen again.',
      sellerResponseAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    });
    await dispute2.save();
    console.log('✅ Created dispute 2 (seller_response):', dispute2.disputeNumber);

    // 3. Dispute awaiting seller response (buyer has responded)
    const dispute3 = new Dispute({
      disputeNumber: generateDisputeNumber(),
      orderId: order3._id as any,
      sellerId: seller._id as any,
      buyerId: buyer1._id as any,
      type: 'refund',
      reason: 'Damaged item',
      description: 'The item arrived damaged. The packaging was torn and the product inside was broken. I need a full refund.',
      status: 'buyer_response',
      priority: 'high',
      evidence: [
        {
          type: 'photo',
          url: '/uploads/disputes/sample-damage.jpg',
          description: 'Photo showing damaged packaging',
          uploadedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        },
      ],
      buyerResponse: 'I have provided photos of the damage. The product is completely unusable. I expect a full refund including shipping costs.',
      buyerResponseAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      responseDeadline: tomorrow,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    });
    await dispute3.save();
    console.log('✅ Created dispute 3 (buyer_response):', dispute3.disputeNumber);

    // 4. Dispute under review
    const dispute4 = new Dispute({
      disputeNumber: generateDisputeNumber(),
      orderId: order1._id as any,
      sellerId: seller._id as any,
      buyerId: buyer1._id as any,
      type: 'return',
      reason: 'Wrong item received',
      description: 'I ordered a blue shirt but received a red one. I want to return it and get the correct item.',
      status: 'under_review',
      priority: 'medium',
      evidence: [],
      sellerResponse: 'We apologize for the mix-up. We have checked our inventory and confirmed the error. We are processing a replacement order immediately.',
      sellerResponseAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    });
    await dispute4.save();
    console.log('✅ Created dispute 4 (under_review):', dispute4.disputeNumber);

    // 5. Resolved dispute
    const dispute5 = new Dispute({
      disputeNumber: generateDisputeNumber(),
      orderId: order2._id as any,
      sellerId: seller._id as any,
      buyerId: buyer2._id as any,
      type: 'quality',
      reason: 'Product defect',
      description: 'The product has a manufacturing defect. The zipper is broken and cannot be used.',
      status: 'resolved',
      priority: 'high',
      evidence: [
        {
          type: 'photo',
          url: '/uploads/disputes/sample-defect.jpg',
          description: 'Photo showing broken zipper',
          uploadedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
      ],
      sellerResponse: 'We apologize for the defect. We will send a replacement immediately at no cost to you.',
      sellerResponseAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      resolution: 'Dispute resolved in favor of buyer. Replacement sent and tracking number provided.',
      resolvedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    });
    await dispute5.save();
    console.log('✅ Created dispute 5 (resolved):', dispute5.disputeNumber);

    // 6. Approved dispute
    const dispute6 = new Dispute({
      disputeNumber: generateDisputeNumber(),
      orderId: order3._id as any,
      sellerId: seller._id as any,
      buyerId: buyer1._id as any,
      type: 'refund',
      reason: 'Item not received',
      description: 'I never received my order. The tracking shows delivered but I was home all day and nothing arrived.',
      status: 'approved',
      priority: 'urgent',
      evidence: [],
      sellerResponse: 'We have investigated and confirmed the delivery issue. We will process a full refund.',
      sellerResponseAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      adminDecision: 'Refund approved. Full amount including shipping will be refunded within 5-7 business days.',
      adminDecisionAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    });
    await dispute6.save();
    console.log('✅ Created dispute 6 (approved):', dispute6.disputeNumber);

    console.log('\n✅ Successfully seeded 6 test disputes!');
    console.log('\n📊 Dispute Summary:');
    console.log(`   - New (requires response): 1`);
    console.log(`   - Awaiting buyer response: 1`);
    console.log(`   - Awaiting seller response: 1`);
    console.log(`   - Under review: 1`);
    console.log(`   - Resolved: 1`);
    console.log(`   - Approved: 1`);
    console.log('\n🎯 You can now test the disputes page at http://localhost:5173/seller/disputes');

  } catch (error: any) {
    console.error('❌ Error seeding disputes:', error);
    throw error;
  }
};

const run = async () => {
  await connectDB();
  await seedDisputes();
  await mongoose.connection.close();
  console.log('\n✅ Seed completed. Database connection closed.');
  process.exit(0);
};

run().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

