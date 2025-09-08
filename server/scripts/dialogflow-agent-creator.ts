import { SessionsClient, AgentsClient } from '@google-cloud/dialogflow-cx';
import { storage } from '../database/storage';

// Dialogflow CX configuration
const projectId = process.env.CX_LOCATION || "nonplo-auth2";
const location = process.env.CX_PROJECT_ID || "europe-west3";

async function createDialogflowAgents() {
  try {
    // Parse Google Cloud credentials
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      console.log('❌ GOOGLE_APPLICATION_CREDENTIALS_JSON not found');
      return;
    }

    const credentials = JSON.parse(credentialsJson);
    
    // Initialize Dialogflow CX Agents Client
    const agentsClient = new AgentsClient({
      projectId: projectId,
      apiEndpoint: `${location}-dialogflow.googleapis.com`,
      credentials: credentials,
    });

    console.log(`✅ Dialogflow CX Agents client initialized for project: ${projectId}, location: ${location}`);

    // List existing agents in Dialogflow CX
    const parent = `projects/${projectId}/locations/${location}`;
    const [agents] = await agentsClient.listAgents({ parent });
    
    console.log(`📋 Mevcut Dialogflow CX agents:`);
    agents.forEach((agent, index) => {
      console.log(`  ${index + 1}. ${agent.displayName} (ID: ${agent.name?.split('/').pop()})`);
    });

    // Get database agents
    const dbAgents = await storage.getAgentsByUserId('d59a0ba4-c16e-49c5-8e10-54e6f6d15d1f');
    console.log(`\n📊 Database'de ${dbAgents.length} agent var:`);
    
    dbAgents.forEach((agent, index) => {
      console.log(`  ${index + 1}. ${agent.name} (DB ID: ${agent.id})`);
    });

    // Create missing agents in Dialogflow CX
    for (const dbAgent of dbAgents) {
      const existingAgent = agents.find(cxAgent => 
        cxAgent.displayName === dbAgent.name
      );

      if (!existingAgent) {
        console.log(`\n🔄 Creating agent in Dialogflow CX: ${dbAgent.name}`);
        
        const request = {
          parent: parent,
          agent: {
            displayName: dbAgent.name,
            description: `Restoran AI asistanı - ${dbAgent.role}`,
            defaultLanguageCode: 'tr',
            timeZone: 'Europe/Istanbul',
            startFlow: `projects/${projectId}/locations/${location}/agents/[AGENT_ID]/flows/00000000-0000-0000-0000-000000000000`,
          },
        };

        try {
          const [operation] = await agentsClient.createAgent(request);
          const [response] = await operation.promise();
          const newAgentId = response.name?.split('/').pop();
          
          console.log(`✅ Agent created: ${dbAgent.name} (CX ID: ${newAgentId})`);
          console.log(`🔄 Database'de ${dbAgent.id} -> ${newAgentId} mapping yapılmalı`);
          
        } catch (error: any) {
          console.log(`❌ Agent creation failed for ${dbAgent.name}:`, error.message);
        }
      } else {
        const cxAgentId = existingAgent.name?.split('/').pop();
        console.log(`✅ Agent already exists: ${dbAgent.name} (CX ID: ${cxAgentId})`);
      }
    }

  } catch (error: any) {
    console.log('❌ Dialogflow CX operation failed:', error.message);
  }
}

// Run the script
createDialogflowAgents().then(() => {
  console.log('\n🏁 Agent sync completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});