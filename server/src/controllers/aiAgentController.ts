import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { handleAgentChat, AgentContext } from '../services/GeminiAgentService';

function roleFromUser(role?: string) {
  if (role === 'admin') return 'admin';
  if (role === 'seller') return 'seller';
  if (role === 'buyer') return 'buyer';
  return 'guest';
}

/**
 * POST /api/ai/agent
 * Body: { message: string, currentPath?: string }
 *
 * Auth: optional. Tools enforce authorization regardless.
 */
export async function postAiAgent(req: AuthenticatedRequest, res: Response) {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const currentPath = req.body?.currentPath ? String(req.body.currentPath) : req.path;

    const userId = req.user?.id ? String(req.user.id) : null;
    const role = req.user?.role ? (roleFromUser(req.user.role) as AgentContext['role']) : 'guest';

    const ctx: AgentContext = {
      userId,
      role,
      email: req.user?.email,
      fullName: (req.user as any)?.fullName,
      currentPath,
    };

    const result = await handleAgentChat(message, ctx);
    return res.json(result);
  } catch (error: any) {
    const msg = error?.message || 'AI agent failed';
    if (msg.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ message: 'Assistant is not configured. Set GEMINI_API_KEY on the server.' });
    }
    // eslint-disable-next-line no-console
    console.error('postAiAgent error:', error);
    return res.status(500).json({ message: msg });
  }
}

