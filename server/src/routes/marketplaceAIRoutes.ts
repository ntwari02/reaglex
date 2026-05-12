import { Router } from 'express';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth';
import {
  getHomeFeed,
  getHomeFeedSection,
  postBehaviorTrack,
  getAIConfig,
  updateAIConfig,
  applyAIPreset,
  recomputeAI,
  refreshSellerTrustOne,
  getAIDiagnostics,
  getRulesList,
  getSessionInspect,
  getRelatedProducts,
  recomputeAdjacencyMatrix,
  getAdjacency,
  putAdjacencyManual,
  getMarketplaceDirectivePreview,
  getHealthSnapshot,
  postRunStabilityTick,
  postRecomputeEconomy,
  getLifecycleOverview,
  postRefreshLifecycle,
  postRefreshLifecycleBatch,
  getBuyerTrustOverview,
  postRefreshBuyerTrust,
  postRefreshBuyerTrustBatch,
  getRuleEffectiveness,
  postRecomputeRuleEffectiveness,
  postResetRule,
  postSimulate,
  getProductNeighboursController,
  getRecommendationsForUser,
  getCollusionClustersController,
} from '../controllers/marketplaceAIController';

/**
 * Two routers, mounted separately:
 *  - `publicHomeRouter`   → mounted at /api/home    (anonymous-friendly)
 *  - `adminAIRouter`      → mounted at /api/admin/marketplace-ai
 */

export const publicHomeRouter = Router();
publicHomeRouter.get('/feed', optionalAuthenticate, getHomeFeed);
publicHomeRouter.get('/section/:section', optionalAuthenticate, getHomeFeedSection);
publicHomeRouter.post('/track', optionalAuthenticate, postBehaviorTrack);
publicHomeRouter.get('/related/:productId', optionalAuthenticate, getRelatedProducts);

export const adminAIRouter = Router();
adminAIRouter.use(authenticate);
adminAIRouter.use(authorize('admin'));
adminAIRouter.get('/config', getAIConfig);
adminAIRouter.put('/config', updateAIConfig);
adminAIRouter.post('/preset', applyAIPreset);
adminAIRouter.post('/recompute', recomputeAI);
adminAIRouter.post('/sellers/:sellerId/trust', refreshSellerTrustOne);
adminAIRouter.get('/diagnostics', getAIDiagnostics);
adminAIRouter.get('/rules', getRulesList);
adminAIRouter.get('/sessions/:sessionId', getSessionInspect);
adminAIRouter.get('/adjacency', getAdjacency);
adminAIRouter.put('/adjacency', putAdjacencyManual);
adminAIRouter.post('/adjacency/recompute', recomputeAdjacencyMatrix);

// Orchestrator + market health
adminAIRouter.get('/directive', getMarketplaceDirectivePreview);
adminAIRouter.get('/health', getHealthSnapshot);
adminAIRouter.post('/health/stability/tick', postRunStabilityTick);
adminAIRouter.post('/health/economy/recompute', postRecomputeEconomy);

// Lifecycle
adminAIRouter.get('/lifecycle/overview', getLifecycleOverview);
adminAIRouter.post('/lifecycle/refresh', postRefreshLifecycleBatch);
adminAIRouter.post('/lifecycle/refresh/:userId', postRefreshLifecycle);

// Buyer trust
adminAIRouter.get('/buyer-trust/overview', getBuyerTrustOverview);
adminAIRouter.post('/buyer-trust/refresh', postRefreshBuyerTrustBatch);
adminAIRouter.post('/buyer-trust/refresh/:userId', postRefreshBuyerTrust);

// Rule effectiveness
adminAIRouter.get('/rule-effectiveness', getRuleEffectiveness);
adminAIRouter.post('/rule-effectiveness/recompute', postRecomputeRuleEffectiveness);
adminAIRouter.post('/rule-effectiveness/:ruleId/reset', postResetRule);

// Simulation
adminAIRouter.post('/simulate', postSimulate);

// Graph
adminAIRouter.get('/graph/related/:productId', getProductNeighboursController);
adminAIRouter.get('/graph/recommend', getRecommendationsForUser);
adminAIRouter.get('/graph/collusion', getCollusionClustersController);
