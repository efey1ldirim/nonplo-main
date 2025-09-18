// Test script for Agent Creation Wizard
import { storage } from './server/database/storage.js';

async function testWizardAgentCreation() {
  const userId = "a8792bca-7f95-4bb8-bc70-2c1e11d94548"; // From logs
  
  // Mock wizard session data for "Deneme Başarılı" agent
  const mockWizardData = {
    // Step 1: Business Name & Industry
    businessName: "Deneme Başarılı",
    industry: "Test",
    sector: "Test Sektörü",
    
    // Step 2: Address Info
    address: "Test Adresi, İstanbul",
    location: "İstanbul",
    
    // Step 3: Working Hours
    workingHours: {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
      wednesday: { open: "09:00", close: "18:00" },
      thursday: { open: "09:00", close: "18:00" },
      friday: { open: "09:00", close: "18:00" },
      saturday: { closed: true },
      sunday: { closed: true }
    },
    
    // Step 4: Social Media & Website
    website: "https://test.com",
    socialMedia: {
      instagram: "@test",
      facebook: "test"
    },
    
    // Step 5: FAQ
    faq: "Test FAQ soruları ve cevapları",
    
    // Step 6: Product/Service Description
    productServiceDescription: "Test ürün ve hizmet açıklaması",
    taskDescription: "Test görevleri ve sorumluluklarını yerine getirir",
    serviceType: "Müşteri Hizmetleri",
    
    // Step 8: Employee Name & Role
    employeeName: "Deneme Başarılı",
    employeeRole: "Test Uzmanı",
    
    // Step 9: Personality & Tone
    personality: {
      style: "friendly",
      language: "tr",
      temperature: 0.7
    },
    
    // Step 10: Tools
    tools: ["chat"],
    integrations: []
  };
  
  try {
    console.log("🧪 Testing wizard agent creation...");
    console.log("📝 Creating agent:", mockWizardData.businessName);
    
    const createdAgent = await storage.createAgentFromWizard(userId, mockWizardData);
    
    console.log("✅ Agent created successfully!");
    console.log("🆔 Agent ID:", createdAgent.id);
    console.log("👤 Agent Name:", createdAgent.name);
    console.log("🎭 Agent Role:", createdAgent.role);
    
    return createdAgent;
  } catch (error) {
    console.error("❌ Error creating agent:", error);
    throw error;
  }
}

// Run the test
testWizardAgentCreation()
  .then((agent) => {
    console.log("🎉 Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });