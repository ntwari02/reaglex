import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getBuyers, getUserDetails, updateUserStatus, createUser, updateUser, deleteUser, getUserStats,
  getSellers, getSellerDetails, updateSellerStatus, createSeller, updateSeller, deleteSeller, getSellerStats
} from '../controllers/adminController';

const router = Router();

// All admin routes require authentication only
router.use(authenticate);

// Get user statistics
router.get('/users/stats', getUserStats);

// Get all buyers with statistics
router.get('/buyers', getBuyers);

// Create a new user
router.post('/users', createUser);

// Get user details
router.get('/users/:userId', getUserDetails);

// Update user information
router.put('/users/:userId', updateUser);

// Update user status
router.patch('/users/:userId/status', updateUserStatus);

// Delete user
router.delete('/users/:userId', deleteUser);

// Get seller statistics
router.get('/sellers/stats', getSellerStats);

// Get all sellers with statistics
router.get('/sellers', getSellers);

// Create a new seller
router.post('/sellers', createSeller);

// Get seller details
router.get('/sellers/:sellerId', getSellerDetails);

// Update seller information
router.put('/sellers/:sellerId', updateSeller);

// Update seller status
router.patch('/sellers/:sellerId/status', updateSellerStatus);

// Delete seller
router.delete('/sellers/:sellerId', deleteSeller);

export default router;

