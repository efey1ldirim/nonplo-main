import { Request, Response } from 'express';
import { CalendarService } from '../services/CalendarService';

const calendarService = new CalendarService();

// Webhook endpoint for creating calendar events from DialogFlow CX
export async function createCalendarEvent(req: Request, res: Response) {
  try {
    console.log('\n🚀 ===== GOOGLE CALENDAR WEBHOOK - CREATE EVENT STARTED =====');
    console.log('🕒 Timestamp:', new Date().toISOString());
    console.log('📋 Full Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📋 Full Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Request Method:', req.method);
    
    // Extract parameters from PLAYBOOK ONLY request
    const { 
      userId,
      agentId,
      summary,
      startDateTime, 
      endDateTime,
      description,
      attendees
    } = req.body;

    // PLAYBOOK ONLY mode - direct user and agent info
    console.log('🔍 PLAYBOOK Request Analysis:');
    console.log('  📍 User ID:', userId);
    console.log('  📍 Agent ID:', agentId);
    
    // Session format: projects/PROJECT_ID/locations/LOCATION/agents/AGENT_ID/sessions/SESSION_ID
    let agentId = null;
    let userId = null;
    
    // Extract DialogFlow CX agent ID from session path
    const cxAgentIndex = pathParts.findIndex(part => part === 'agents');
    console.log('  📍 Agent index in path:', cxAgentIndex);
    
    if (cxAgentIndex !== -1 && pathParts[cxAgentIndex + 1]) {
      const cxAgentId = pathParts[cxAgentIndex + 1];
      console.log('🔍 DialogFlow CX Agent ID:', cxAgentId);
      console.log('🔍 Agent ID length:', cxAgentId.length);
      console.log('🔍 Agent ID format check:', /^[a-f0-9-]+$/.test(cxAgentId));
      
      // Find our local agent that corresponds to this CX agent
      console.log('🔍 Looking up local agent for CX Agent ID:', cxAgentId);
      const { storage } = await import('../storage');
      
      console.log('📊 Getting all agents from database...');
      const allAgents = await storage.getAllAgents();
      console.log('📊 Total agents in database:', allAgents.length);
      
      console.log('📊 All agents in database:');
      allAgents.forEach((agent, index) => {
        console.log(`  ${index + 1}. ID: ${agent.id}, Name: ${agent.name}, CX ID: ${agent.dialogflowCxAgentId || 'NULL'}`);
      });
      
      console.log('🔍 Searching for matching CX Agent ID:', cxAgentId);
      // PLAYBOOK ONLY mode - direct agent lookup by ID
      const matchingAgent = allAgents.find(agent => agent.id === cxAgentId);
      
      if (matchingAgent) {
        agentId = matchingAgent.id;
        userId = matchingAgent.userId;
        console.log('✅ MATCHING AGENT FOUND!');
        console.log('  📍 Local Agent ID:', agentId);
        console.log('  📍 User ID:', userId);
        console.log('  📍 Agent Name:', matchingAgent.name);
        console.log('  📍 CX Agent ID matches:', matchingAgent.dialogflowCxAgentId === cxAgentId);
      } else {
        console.log('❌ NO MATCHING AGENT FOUND!');
        console.log('  📍 Looking for CX Agent ID:', cxAgentId);
        console.log('  📍 Available CX Agent IDs in DB:');
        allAgents.forEach((agent, index) => {
          if (agent.dialogflowCxAgentId) {
            console.log(`    ${index + 1}. ${agent.dialogflowCxAgentId} (${agent.name})`);
          }
        });
      }
    }

    // Also try to get user/agent from parameters if not found in session
    if (!userId || !agentId) {
      userId = parameters?.userId || sessionInfo?.parameters?.userId;
      agentId = parameters?.agentId || sessionInfo?.parameters?.agentId;
    }

    if (!userId || !agentId) {
      console.error('❌ CRITICAL ERROR: Missing user or agent ID');
      console.error('  📍 User ID:', userId);
      console.error('  📍 Agent ID:', agentId);
      console.error('  📍 Session path was:', sessionPath);
      console.error('  📍 Parameters were:', parameters);
      
      return res.status(400).json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Google Calendar bağlantısı bulunamadı. Lütfen önce calendar\'ınızı bağlayın.']
            }
          }]
        }
      });
    }

    console.log('🎯 Creating calendar event for user:', userId, 'agent:', agentId);

    // Use parameters from DialogFlow CX
    const sessionParams = sessionInfo?.parameters || {};
    const eventData = {
      title: summary || parameters?.summary || sessionParams?.appointment_description || 'Randevu',
      startTime: startDateTime || parameters?.startDateTime || sessionParams?.appointment_datetime,
      endTime: endDateTime || parameters?.endDateTime || sessionParams?.appointment_end_time,
      description: description || parameters?.description || sessionParams?.appointment_description,
      attendees: attendees ? [attendees] : parameters?.attendees ? [parameters.attendees] : sessionParams?.contact_email ? [sessionParams.contact_email] : undefined
    };

    console.log('📋 Event data:', eventData);

    // Validate required fields
    if (!eventData.startTime || !eventData.endTime) {
      return res.status(400).json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Randevu tarihi ve saati belirtilmelidir.']
            }
          }]
        }
      });
    }

    // Create the calendar event
    const result = await calendarService.createEvent(userId, agentId, eventData);

    if (result.success) {
      return res.json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: [`✅ ${result.message}\n🔗 Randevu linki: ${result.calendarLink || 'N/A'}`]
            }
          }]
        }
      });
    } else {
      return res.json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: [`❌ ${result.message || 'Randevu oluşturulamadı.'}`]
            }
          }]
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Calendar webhook error:', error);
    return res.status(500).json({
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Google Calendar randevu oluşturulurken bir hata oluştu.']
          }
        }]
      }
    });
  }
}

// Webhook endpoint for checking calendar availability
export async function checkCalendarAvailability(req: Request, res: Response) {
  try {
    console.log('📅 Calendar webhook - Check Availability called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    const { 
      sessionInfo,
      parameters,
      timeMin,
      timeMax
    } = req.body;

    // Extract user and agent info (same logic as above)
    const sessionPath = sessionInfo?.session || '';
    const pathParts = sessionPath.split('/');
    
    let agentId = null;
    let userId = null;
    
    const cxAgentIndex = pathParts.findIndex(part => part === 'agents');
    if (cxAgentIndex !== -1 && pathParts[cxAgentIndex + 1]) {
      const cxAgentId = pathParts[cxAgentIndex + 1];
      
      const { storage } = await import('../storage');
      const allAgents = await storage.getAllAgents();
      // PLAYBOOK ONLY mode - direct agent lookup by ID
      const matchingAgent = allAgents.find(agent => agent.id === cxAgentId);
      
      if (matchingAgent) {
        agentId = matchingAgent.id;
        userId = matchingAgent.userId;
      }
    }

    if (!userId || !agentId) {
      userId = parameters?.userId || sessionInfo?.parameters?.userId;
      agentId = parameters?.agentId || sessionInfo?.parameters?.agentId;
    }

    if (!userId || !agentId) {
      return res.status(400).json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Google Calendar bağlantısı bulunamadı.']
            }
          }]
        }
      });
    }

    const startTime = timeMin || parameters?.timeMin;
    const endTime = timeMax || parameters?.timeMax;

    if (!startTime || !endTime) {
      return res.status(400).json({
        fulfillmentResponse: {
          messages: [{
            text: {
              text: ['Kontrol edilecek zaman aralığı belirtilmelidir.']
            }
          }]
        }
      });
    }

    const result = await calendarService.checkAvailability(userId, agentId, startTime, endTime);

    const availabilityMessage = result.isAvailable 
      ? '✅ Bu saatte müsaitsiniz!' 
      : `❌ Bu saatte müsait değilsiniz. Çakışan randevular: ${result.busyTimes.length}`;

    return res.json({
      fulfillmentResponse: {
        messages: [{
          text: {
            text: [availabilityMessage]
          }
        }]
      }
    });

  } catch (error: any) {
    console.error('❌ Calendar availability webhook error:', error);
    return res.status(500).json({
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ['Müsaitlik kontrolü sırasında bir hata oluştu.']
          }
        }]
      }
    });
  }
}