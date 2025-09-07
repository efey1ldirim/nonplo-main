import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// Google Cloud access token helper
async function getAccessToken() {
  try {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not set');
    }

    const credentials = JSON.parse(credentialsJson);
    // GoogleAuth already imported above

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();

    if (!accessTokenResponse.token) {
      throw new Error('Failed to get access token');
    }

    return accessTokenResponse.token;
  } catch (error) {
    throw new Error(`Google Cloud authentication failed: ${error.message}`);
  }
}

async function listCXAgents() {
  try {
    console.log('🔍 Checking CX Console agents...');
    
    const projectId = process.env.CX_LOCATION || 'nonplo-auth2';
    const location = process.env.CX_PROJECT_ID || 'europe-west3';
    
    console.log('Project:', projectId);
    console.log('Location:', location);
    
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained');
    
    const listUrl = `https://${location}-dialogflow.googleapis.com/v3/projects/${projectId}/locations/${location}/agents`;
    console.log('API URL:', listUrl);
    
    const response = await axios.get(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
    
    if (response.data && response.data.agents) {
      const agents = response.data.agents;
      console.log(`\n📋 CX Console'da ${agents.length} agent bulundu:`);
      
      agents.forEach((agent, index) => {
        const agentId = agent.name?.split('/').pop();
        console.log(`  ${index + 1}. ${agent.displayName} (ID: ${agentId})`);
        console.log(`     Created: ${agent.createTime || 'Unknown'}`);
        console.log(`     Language: ${agent.defaultLanguageCode}`);
        console.log('');
      });
    } else {
      console.log('❌ No agents found or invalid response');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log('❌ Error listing CX agents:', error.message);
    if (error.response?.data) {
      console.log('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

listCXAgents();