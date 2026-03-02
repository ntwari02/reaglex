import { Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Dispute } from '../models/Dispute';
import { SupportTicket } from '../models/SupportTicket';
import { SellerSettings } from '../models/SellerSettings';

/**
 * Get user statistics for dashboard
 * GET /api/admin/users/stats
 */
export async function getUserStats(req: AuthenticatedRequest, res: Response) {
  try {
    // Get total customers count
    const totalCustomers = await User.countDocuments({ role: 'buyer' });

    // Get all buyers with their order counts
    const buyers = await User.find({ role: 'buyer' }).select('_id').lean();
    const buyerIds = buyers.map((b) => b._id);

    // Get total orders and calculate average
    const orderStats = await Order.aggregate([
      { $match: { buyerId: { $in: buyerIds } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          uniqueBuyers: { $addToSet: '$buyerId' },
        },
      },
    ]);

    const stats = orderStats[0] || { totalOrders: 0, uniqueBuyers: [] };
    const avgOrdersPerCustomer = totalCustomers > 0 
      ? (stats.totalOrders / totalCustomers).toFixed(1)
      : '0.0';

    // Get risk accounts (warned, banned, or inactive users)
    const riskAccounts = await User.countDocuments({
      role: 'buyer',
      accountStatus: { $in: ['warned', 'banned', 'inactive'] },
    });

    // Get verified KYC count (for now, we'll use active users as verified since KYC field doesn't exist yet)
    // In the future, you can add a KYC field to the User model
    const verifiedKYC = await User.countDocuments({
      role: 'buyer',
      accountStatus: 'active',
    });
    const kycPercentage = totalCustomers > 0 
      ? Math.round((verifiedKYC / totalCustomers) * 100)
      : 0;

    // Calculate change from previous month (simplified - you can enhance this)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const previousMonthCustomers = await User.countDocuments({
      role: 'buyer',
      createdAt: { $lt: oneMonthAgo },
    });
    const customerChange = previousMonthCustomers > 0
      ? (((totalCustomers - previousMonthCustomers) / previousMonthCustomers) * 100).toFixed(1)
      : '0.0';

    return res.json({
      totalCustomers,
      avgOrdersPerCustomer: parseFloat(avgOrdersPerCustomer),
      riskAccounts,
      verifiedKYC: kycPercentage,
      customerChange: parseFloat(customerChange),
    });
  } catch (error: any) {
    console.error('Get user stats error:', error);
    return res.status(500).json({
      message: 'Failed to fetch user statistics',
      error: error.message,
    });
  }
}

/**
 * Get all buyers with their statistics
 * GET /api/admin/buyers
 */
export async function getBuyers(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, search, page = '1', limit = '50' } = req.query as {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    // Build filter for buyers
    const filter: any = { role: 'buyer' };
    
    // Add status filter if provided
    if (status && status !== 'all') {
      filter.accountStatus = status;
    }

    // Add search filter
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Get buyers
    const buyers = await User.find(filter)
      .select('_id fullName email phone location createdAt accountStatus warningCount avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get statistics for each buyer
    const buyersWithStats = await Promise.all(
      buyers.map(async (buyer: any) => {
        const buyerId = buyer._id;

        // Get order statistics
        const orderStats = await Order.aggregate([
          { $match: { buyerId: new mongoose.Types.ObjectId(buyerId) } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$total' },
              lastOrderDate: { $max: '$createdAt' },
            },
          },
        ]);

        const stats = orderStats[0] || {
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
        };

        // Get ticket count (open tickets) - SupportTicket is for sellers
        // For buyers, we'll set it to 0 for now
        // You can implement buyer tickets later if needed
        const ticketCount = 0;

        // Format last order date
        let lastOrder = 'No orders';
        if (stats.lastOrderDate) {
          const date = new Date(stats.lastOrderDate);
          lastOrder = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }

        // Use accountStatus from user model, default to active if not set
        let accountStatus: 'active' | 'pending' | 'banned' | 'warned' | 'inactive' = (buyer.accountStatus as any) || 'active';
        // If status is not set and user has orders, mark as active
        if (!buyer.accountStatus && stats.totalOrders > 0) {
          accountStatus = 'active';
        } else if (!buyer.accountStatus) {
          accountStatus = 'pending';
        }

        // Determine KYC status (you may need to add KYC field to User model)
        // For now, we'll default to pending
        let kycStatus: 'verified' | 'pending' | 'rejected' = 'pending';

        // Generate customer ID from MongoDB _id
        const customerId = `CUS-${buyer._id.toString().slice(-6).toUpperCase()}`;

        return {
          id: customerId,
          name: buyer.fullName || 'Unknown',
          email: buyer.email || '',
          phone: buyer.phone || 'N/A',
          avatarUrl: buyer.avatarUrl || '',
          status: accountStatus,
          kyc: kycStatus,
          orders: stats.totalOrders || 0,
          totalSpent: stats.totalSpent || 0,
          lastOrder,
          tickets: ticketCount,
          notes: buyer.location ? `${buyer.location}` : '',
          userId: buyer._id.toString(), // Add userId for API calls
        };
      })
    );

    const total = await User.countDocuments(filter);

    return res.json({
      customers: buyersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get buyers error:', error);
    return res.status(500).json({
      message: 'Failed to fetch buyers',
      error: error.message,
    });
  }
}

/**
 * Get user details by ID
 * GET /api/admin/users/:userId
 */
export async function getUserDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('_id fullName email phone location createdAt accountStatus warningCount role avatarUrl')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { buyerId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: null,
    };

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.fullName || 'Unknown',
        email: user.email || '',
        phone: user.phone || 'N/A',
        location: user.location || '',
        avatarUrl: user.avatarUrl || '',
        status: user.accountStatus || 'active',
        warningCount: user.warningCount || 0,
        role: user.role,
        createdAt: user.createdAt,
        orders: stats.totalOrders || 0,
        totalSpent: stats.totalSpent || 0,
        lastOrder: stats.lastOrderDate
          ? new Date(stats.lastOrderDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'No orders',
      },
    });
  } catch (error: any) {
    console.error('Get user details error:', error);
    return res.status(500).json({
      message: 'Failed to fetch user details',
      error: error.message,
    });
  }
}

/**
 * Update user status (ban, warn, activate)
 * PATCH /api/admin/users/:userId/status
 */
export async function updateUserStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'pending', 'banned', 'warned', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.accountStatus = status as 'active' | 'pending' | 'banned' | 'warned' | 'inactive';
    
    // Increment warning count if warning
    if (status === 'warned') {
      user.warningCount = (user.warningCount || 0) + 1;
    }

    await user.save();

    return res.json({
      message: `User status updated to ${status}`,
      user: {
        id: user._id.toString(),
        status: user.accountStatus,
        warningCount: user.warningCount || 0,
      },
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    return res.status(500).json({
      message: 'Failed to update user status',
      error: error.message,
    });
  }
}

/**
 * Create a new user
 * POST /api/admin/users
 */
export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { fullName, email, phone, role, password, location } = req.body;

    // Validation
    if (!fullName || !email) {
      return res.status(400).json({ message: 'Full name and email are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create user
    const userData: any = {
      fullName,
      email: email.toLowerCase(),
      phone,
      role: role || 'buyer',
      location,
      accountStatus: 'active',
      warningCount: 0,
    };

    // If password is provided, hash it
    if (password) {
      userData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = new User(userData);
    await user.save();

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.accountStatus,
      },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({
      message: 'Failed to create user',
      error: error.message,
    });
  }
}

/**
 * Update user information
 * PUT /api/admin/users/:userId
 */
export async function updateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { fullName, email, phone, role, location, accountStatus, password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken by another user' });
      }
      user.email = email.toLowerCase();
    }
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) {
      if (!['buyer', 'seller', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      user.role = role;
    }
    if (location !== undefined) user.location = location;
    if (accountStatus !== undefined) {
      if (!['active', 'pending', 'banned', 'warned', 'inactive'].includes(accountStatus)) {
        return res.status(400).json({ message: 'Invalid account status' });
      }
      user.accountStatus = accountStatus;
    }
    if (password !== undefined && password.trim() !== '') {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    return res.json({
      message: 'User updated successfully',
      user: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        status: user.accountStatus,
        warningCount: user.warningCount,
      },
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return res.status(500).json({
      message: 'Failed to update user',
      error: error.message,
    });
  }
}

/**
 * Delete a user
 * DELETE /api/admin/users/:userId
 */
export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has orders (optional: prevent deletion if they have orders)
    const orderCount = await Order.countDocuments({ buyerId: userId } as any);
    
    // Delete user
    await User.findByIdAndDelete(userId);

    return res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        ordersCount: orderCount,
      },
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      message: 'Failed to delete user',
      error: error.message,
    });
  }
}

/**
 * Get seller statistics for dashboard
 * GET /api/admin/sellers/stats
 */
export async function getSellerStats(req: AuthenticatedRequest, res: Response) {
  try {
    const totalSellers = await User.countDocuments({ role: 'seller' });
    
    const sellers = await User.find({ role: 'seller' }).select('_id').lean();
    const sellerIds = sellers.map((s) => s._id);

    // Get total products and orders
    const productStats = await Product.aggregate([
      { $match: { sellerId: { $in: sellerIds } } },
      { $group: { _id: null, totalProducts: { $sum: 1 } } },
    ]);

    const orderStats = await Order.aggregate([
      { $match: { sellerId: { $in: sellerIds } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalEarnings: { $sum: '$total' },
        },
      },
    ]);

    const totalProducts = productStats[0]?.totalProducts || 0;
    const totalOrders = orderStats[0]?.totalOrders || 0;
    const totalEarnings = orderStats[0]?.totalEarnings || 0;
    const avgProductsPerSeller = totalSellers > 0 ? (totalProducts / totalSellers).toFixed(1) : '0.0';

    // Get pending sellers
    const pendingSellers = await User.countDocuments({
      role: 'seller',
      sellerVerificationStatus: 'pending',
    });

    // Get sellers with issues (disputes or support tickets)
    const sellersWithDisputes = await Dispute.distinct('sellerId', {
      status: { $in: ['new', 'under_review', 'seller_response', 'buyer_response'] },
    });
    const sellersWithTickets = await SupportTicket.distinct('sellerId', {
      status: { $in: ['open', 'in_progress'] },
    });
    const sellersWithIssues = new Set([
      ...sellersWithDisputes.map((id) => id.toString()),
      ...sellersWithTickets.map((id) => id.toString()),
    ]).size;

    // Calculate seller change (current month vs previous month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthSellers = await User.countDocuments({
      role: 'seller',
      createdAt: { $gte: currentMonthStart, $lte: now },
    });
    const previousMonthSellers = await User.countDocuments({
      role: 'seller',
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });

    let sellerChange = 0;
    if (previousMonthSellers > 0) {
      sellerChange = ((currentMonthSellers - previousMonthSellers) / previousMonthSellers) * 100;
    } else if (currentMonthSellers > 0) {
      sellerChange = 100;
    }

    return res.json({
      totalSellers,
      avgProductsPerSeller: parseFloat(avgProductsPerSeller),
      pendingSellers,
      sellersWithIssues,
      sellerChange: parseFloat(sellerChange.toFixed(1)),
    });
  } catch (error: any) {
    console.error('Get seller stats error:', error);
    return res.status(500).json({
      message: 'Failed to fetch seller statistics',
      error: error.message,
    });
  }
}

/**
 * Get all sellers with their statistics
 * GET /api/admin/sellers
 */
export async function getSellers(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, verificationStatus, search, page = '1', limit = '50' } = req.query as {
      status?: string;
      verificationStatus?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    // Build filter for sellers
    const filter: any = { role: 'seller' };
    
    // Add status filter if provided
    if (status && status !== 'all') {
      filter.accountStatus = status;
    }

    // Add verification status filter
    if (verificationStatus && verificationStatus !== 'all') {
      filter.sellerVerificationStatus = verificationStatus;
    }

    // Add search filter
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Get sellers
    const sellers = await User.find(filter)
      .select('_id fullName email phone location createdAt accountStatus warningCount avatarUrl sellerVerificationStatus isSellerVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get statistics for each seller
    const sellersWithStats = await Promise.all(
      sellers.map(async (seller: any) => {
        const sellerId = seller._id;

        // Get product count
        const productCount = await Product.countDocuments({ sellerId });

        // Get order statistics
        const orderStats = await Order.aggregate([
          { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalEarnings: { $sum: '$total' },
              lastOrderDate: { $max: '$createdAt' },
            },
          },
        ]);

        const stats = orderStats[0] || {
          totalOrders: 0,
          totalEarnings: 0,
          lastOrderDate: null,
        };

        // Get dispute count
        const disputeCount = await Dispute.countDocuments({
          sellerId: new mongoose.Types.ObjectId(sellerId),
          status: { $in: ['new', 'under_review', 'seller_response', 'buyer_response'] },
        });

        // Get support ticket count
        const ticketCount = await SupportTicket.countDocuments({
          sellerId: new mongoose.Types.ObjectId(sellerId),
          status: { $in: ['open', 'in_progress'] },
        });

        // Format last order date
        let lastOrder = 'No orders';
        if (stats.lastOrderDate) {
          const date = new Date(stats.lastOrderDate);
          lastOrder = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }

        // Determine status
        let accountStatus: 'active' | 'pending' | 'banned' | 'warned' | 'inactive' | 'suspended' = 
          (seller.accountStatus as any) || 'active';
        if (!seller.accountStatus) {
          accountStatus = seller.sellerVerificationStatus === 'approved' ? 'active' : 'pending';
        }

        // Determine KYC/Verification status
        let kycStatus: 'verified' | 'pending' | 'rejected' = 'pending';
        if (seller.sellerVerificationStatus === 'approved' || seller.isSellerVerified) {
          kycStatus = 'verified';
        } else if (seller.sellerVerificationStatus === 'rejected') {
          kycStatus = 'rejected';
        }

        // Generate seller ID
        const sellerIdFormatted = `SELL-${seller._id.toString().slice(-6).toUpperCase()}`;

        return {
          id: sellerIdFormatted,
          sellerName: seller.fullName || 'Unknown',
          storeName: seller.fullName || 'Unknown Store', // You might want to add a storeName field to User model
          email: seller.email || '',
          phone: seller.phone || 'N/A',
          avatarUrl: seller.avatarUrl || '',
          status: accountStatus,
          kycStatus,
          totalProducts: productCount,
          totalOrders: stats.totalOrders || 0,
          earnings: stats.totalEarnings || 0,
          joinDate: seller.createdAt ? new Date(seller.createdAt).toISOString().split('T')[0] : '',
          country: seller.location || 'N/A',
          hasDisputes: disputeCount > 0,
          hasPayoutIssues: false, // You can implement this based on payout status
          userId: seller._id.toString(),
          warningCount: seller.warningCount || 0,
        };
      })
    );

    const total = await User.countDocuments(filter);

    return res.json({
      sellers: sellersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get sellers error:', error);
    return res.status(500).json({
      message: 'Failed to fetch sellers',
      error: error.message,
    });
  }
}

/**
 * Get seller details by ID
 * GET /api/admin/sellers/:sellerId
 */
export async function getSellerDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const { sellerId } = req.params;

    const seller = await User.findById(sellerId)
      .select('_id fullName email phone location createdAt accountStatus warningCount role avatarUrl sellerVerificationStatus isSellerVerified')
      .lean();

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    if (seller.role !== 'seller') {
      return res.status(400).json({ message: 'User is not a seller' });
    }

    // Get product count
    const productCount = await Product.countDocuments({ sellerId: new mongoose.Types.ObjectId(sellerId) });

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalEarnings: { $sum: '$total' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalEarnings: 0,
      lastOrderDate: null,
    };

    // Get dispute count
    const disputeCount = await Dispute.countDocuments({
      sellerId: new mongoose.Types.ObjectId(sellerId),
    });

    // Get support ticket count
    const ticketCount = await SupportTicket.countDocuments({
      sellerId: new mongoose.Types.ObjectId(sellerId),
    });

    // Get seller settings including business documents
    const sellerSettings = await SellerSettings.findOne({
      sellerId: new mongoose.Types.ObjectId(sellerId),
    }).lean();

    return res.json({
      seller: {
        id: seller._id.toString(),
        sellerName: seller.fullName || 'Unknown',
        storeName: sellerSettings?.storeName || seller.fullName || 'Unknown Store',
        email: seller.email || '',
        phone: seller.phone || 'N/A',
        location: seller.location || '',
        avatarUrl: seller.avatarUrl || '',
        status: seller.accountStatus || 'active',
        warningCount: seller.warningCount || 0,
        verificationStatus: seller.sellerVerificationStatus || 'pending',
        isVerified: seller.isSellerVerified || false,
        role: seller.role,
        createdAt: seller.createdAt,
        totalProducts: productCount,
        totalOrders: stats.totalOrders || 0,
        earnings: stats.totalEarnings || 0,
        disputes: disputeCount,
        tickets: ticketCount,
        lastOrder: stats.lastOrderDate
          ? new Date(stats.lastOrderDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'No orders',
        // Business information
        businessName: sellerSettings?.businessName || '',
        businessType: sellerSettings?.businessType || '',
        taxId: sellerSettings?.taxId || '',
        registrationNumber: sellerSettings?.registrationNumber || '',
        businessAddress: sellerSettings?.businessAddress || null,
        businessPhone: sellerSettings?.businessPhone || '',
        businessEmail: sellerSettings?.businessEmail || '',
        // Verification documents - ensure we return the actual document paths
        verificationDocuments: sellerSettings?.verificationDocuments ? {
          businessLicense: sellerSettings.verificationDocuments.businessLicense || null,
          isoCert: sellerSettings.verificationDocuments.isoCert || null,
          auditReport: sellerSettings.verificationDocuments.auditReport || null,
          uploadedAt: sellerSettings.verificationDocuments.uploadedAt || null,
        } : {
          businessLicense: null,
          isoCert: null,
          auditReport: null,
          uploadedAt: null,
        },
        // Verification status details
        verificationStatusDetails: sellerSettings?.verificationStatus || {
          status: 'pending',
          verifiedAt: null,
          verifiedBy: null,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
          reviewedBy: null,
          lastReviewedAt: null,
        },
      },
    });
  } catch (error: any) {
    console.error('Get seller details error:', error);
    return res.status(500).json({
      message: 'Failed to fetch seller details',
      error: error.message,
    });
  }
}

/**
 * Update seller status (approve, reject, suspend, warn, activate/deactivate)
 * PATCH /api/admin/sellers/:sellerId/status
 */
export async function updateSellerStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { sellerId } = req.params;
    const { status, verificationStatus, reason } = req.body;

    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    if (seller.role !== 'seller') {
      return res.status(400).json({ message: 'User is not a seller' });
    }

    // Update account status if provided
    if (status && ['active', 'pending', 'banned', 'warned', 'inactive', 'suspended'].includes(status)) {
      seller.accountStatus = status as any;
      
      // Increment warning count if warning
      if (status === 'warned') {
        seller.warningCount = (seller.warningCount || 0) + 1;
      }
    }

    // Update verification status if provided
    if (verificationStatus && ['pending', 'approved', 'rejected'].includes(verificationStatus)) {
      seller.sellerVerificationStatus = verificationStatus;
      seller.isSellerVerified = verificationStatus === 'approved';

      // Update SellerSettings verification status
      const sellerSettings = await SellerSettings.findOne({ sellerId: new mongoose.Types.ObjectId(sellerId) });
      if (sellerSettings) {
        if (!sellerSettings.verificationStatus) {
          sellerSettings.verificationStatus = {
            status: verificationStatus,
            verifiedAt: undefined,
            verifiedBy: undefined,
            rejectedAt: undefined,
            rejectedBy: undefined,
            rejectionReason: undefined,
            reviewedBy: undefined,
            lastReviewedAt: undefined,
          };
        }

        const verificationStatusObj = sellerSettings.verificationStatus;
        if (verificationStatus === 'approved') {
          verificationStatusObj.status = 'verified';
          verificationStatusObj.verifiedAt = new Date();
          verificationStatusObj.verifiedBy = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
          verificationStatusObj.rejectedAt = undefined;
          verificationStatusObj.rejectedBy = undefined;
          verificationStatusObj.rejectionReason = undefined;
        } else if (verificationStatus === 'rejected') {
          verificationStatusObj.status = 'rejected';
          verificationStatusObj.rejectedAt = new Date();
          verificationStatusObj.rejectedBy = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
          verificationStatusObj.rejectionReason = reason || 'No reason provided';
          verificationStatusObj.verifiedAt = undefined;
          verificationStatusObj.verifiedBy = undefined;
        } else {
          verificationStatusObj.status = 'pending';
        }

        verificationStatusObj.lastReviewedAt = new Date();
        verificationStatusObj.reviewedBy = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
        await sellerSettings.save();
      }
    }

    await seller.save();

    return res.json({
      message: 'Seller status updated successfully',
      seller: {
        id: seller._id.toString(),
        status: seller.accountStatus,
        verificationStatus: seller.sellerVerificationStatus,
        warningCount: seller.warningCount || 0,
      },
    });
  } catch (error: any) {
    console.error('Update seller status error:', error);
    return res.status(500).json({
      message: 'Failed to update seller status',
      error: error.message,
    });
  }
}

/**
 * Create a new seller
 * POST /api/admin/sellers
 */
export async function createSeller(req: AuthenticatedRequest, res: Response) {
  try {
    const { fullName, email, phone, location, password, accountStatus, sellerVerificationStatus } = req.body;

    // Validation
    if (!fullName || !email) {
      return res.status(400).json({ message: 'Full name and email are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create seller
    const sellerData: any = {
      fullName,
      email: email.toLowerCase(),
      phone,
      role: 'seller',
      location,
      accountStatus: accountStatus || 'active',
      sellerVerificationStatus: sellerVerificationStatus || 'pending',
      isSellerVerified: sellerVerificationStatus === 'approved',
      warningCount: 0,
    };

    // If password is provided, hash it
    if (password) {
      sellerData.passwordHash = await bcrypt.hash(password, 10);
    }

    const seller = new User(sellerData);
    await seller.save();

    return res.status(201).json({
      message: 'Seller created successfully',
      seller: {
        id: seller._id.toString(),
        sellerName: seller.fullName,
        email: seller.email,
        phone: seller.phone,
        status: seller.accountStatus,
        verificationStatus: seller.sellerVerificationStatus,
      },
    });
  } catch (error: any) {
    console.error('Create seller error:', error);
    return res.status(500).json({
      message: 'Failed to create seller',
      error: error.message,
    });
  }
}

/**
 * Update seller information
 * PUT /api/admin/sellers/:sellerId
 */
export async function updateSeller(req: AuthenticatedRequest, res: Response) {
  try {
    const { sellerId } = req.params;
    const { fullName, email, phone, location, accountStatus, sellerVerificationStatus, password } = req.body;

    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    if (seller.role !== 'seller') {
      return res.status(400).json({ message: 'User is not a seller' });
    }

    // Update fields if provided
    if (fullName !== undefined) seller.fullName = fullName;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: sellerId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken by another user' });
      }
      seller.email = email.toLowerCase();
    }
    if (phone !== undefined) seller.phone = phone;
    if (location !== undefined) seller.location = location;
    if (accountStatus !== undefined) {
      if (!['active', 'pending', 'banned', 'warned', 'inactive', 'suspended'].includes(accountStatus)) {
        return res.status(400).json({ message: 'Invalid account status' });
      }
      seller.accountStatus = accountStatus as any;
    }
    if (sellerVerificationStatus !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(sellerVerificationStatus)) {
        return res.status(400).json({ message: 'Invalid verification status' });
      }
      seller.sellerVerificationStatus = sellerVerificationStatus;
      seller.isSellerVerified = sellerVerificationStatus === 'approved';
    }
    if (password !== undefined && password.trim() !== '') {
      seller.passwordHash = await bcrypt.hash(password, 10);
    }

    await seller.save();

    return res.json({
      message: 'Seller updated successfully',
      seller: {
        id: seller._id.toString(),
        sellerName: seller.fullName,
        email: seller.email,
        phone: seller.phone,
        location: seller.location,
        status: seller.accountStatus,
        verificationStatus: seller.sellerVerificationStatus,
        warningCount: seller.warningCount,
      },
    });
  } catch (error: any) {
    console.error('Update seller error:', error);
    return res.status(500).json({
      message: 'Failed to update seller',
      error: error.message,
    });
  }
}

/**
 * Delete a seller
 * DELETE /api/admin/sellers/:sellerId
 */
export async function deleteSeller(req: AuthenticatedRequest, res: Response) {
  try {
    const { sellerId } = req.params;

    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    if (seller.role !== 'seller') {
      return res.status(400).json({ message: 'User is not a seller' });
    }

    // Check if seller has products or orders
    const productCount = await Product.countDocuments({ sellerId: new mongoose.Types.ObjectId(sellerId) });
    const orderCount = await Order.countDocuments({ sellerId: new mongoose.Types.ObjectId(sellerId) } as any);
    
    // Delete seller
    await User.findByIdAndDelete(sellerId);

    return res.json({
      message: 'Seller deleted successfully',
      deletedSeller: {
        id: seller._id.toString(),
        sellerName: seller.fullName,
        email: seller.email,
        productsCount: productCount,
        ordersCount: orderCount,
      },
    });
  } catch (error: any) {
    console.error('Delete seller error:', error);
    return res.status(500).json({
      message: 'Failed to delete seller',
      error: error.message,
    });
  }
}

