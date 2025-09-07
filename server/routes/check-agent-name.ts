import { Request, Response } from 'express';
import { db } from '../storage';
import { agents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { containsProfanity, getProfanityMessage, sanitizeBusinessName } from '../utils/profanity-filter';

interface CheckAgentNameRequest {
  name: string;
  userId: string;
}

interface CheckAgentNameResponse {
  available: boolean;
  message: string;
}

export const checkAgentName = async (req: Request, res: Response<CheckAgentNameResponse>) => {
  try {
    const { name, userId } = req.query as { name?: string; userId?: string };

    if (!name || !userId) {
      return res.status(400).json({
        available: false,
        message: 'İsim ve kullanıcı ID gerekli'
      });
    }

    // Check for profanity first
    if (containsProfanity(name)) {
      return res.status(400).json({
        available: false,
        message: getProfanityMessage()
      });
    }

    // Sanitize name the same way as in create-agent
    const sanitizedName = sanitizeBusinessName(name);

    if (sanitizedName.length === 0) {
      return res.status(400).json({
        available: false,
        message: 'Geçersiz isim'
      });
    }

    // Check if user already has an agent with this name
    const existingAgent = await db.select().from(agents)
      .where(eq(agents.userId, userId))
      .where(eq(agents.name, sanitizedName))
      .limit(1);

    if (existingAgent && existingAgent.length > 0) {
      return res.status(200).json({
        available: false,
        message: `"${sanitizedName}" adında bir AI asistanınız zaten mevcut`
      });
    }

    return res.status(200).json({
      available: true,
      message: `"${sanitizedName}" adı kullanılabilir`
    });

  } catch (error: any) {
    console.error('Check agent name error:', error);
    return res.status(500).json({
      available: false,
      message: 'İsim kontrolünde hata oluştu'
    });
  }
};