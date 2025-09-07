// Email notification automation using Supabase Edge Functions
import { createClient } from '@supabase/supabase-js';

// Fix dashboard URL to API URL format
let supabaseUrl = process.env.SUPABASE_URL!;
if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
  const projectId = supabaseUrl.split('/').pop();
  supabaseUrl = `https://${projectId}.supabase.co`;
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmailTemplate {
  type: 'welcome' | 'agent_created' | 'performance_report' | 'system_alert';
  subject: string;
  htmlContent: string;
  textContent: string;
}

interface EmailJob {
  id: string;
  to: string;
  template: EmailTemplate;
  variables: Record<string, any>;
  scheduledFor?: string;
  status: 'pending' | 'sent' | 'failed';
}

class EmailNotificationService {
  private templates: Record<string, EmailTemplate> = {
    welcome: {
      type: 'welcome',
      subject: 'Welcome to Nonplo - Your AI Agent Platform',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Nonplo!</h1>
          <p>Hi {{userName}},</p>
          <p>Welcome to Nonplo, your AI agent creation platform. We're excited to help you build powerful AI assistants for your business.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Getting Started:</h3>
            <ol>
              <li>Create your first AI agent</li>
              <li>Customize its personality and knowledge</li>
              <li>Deploy and start chatting</li>
            </ol>
          </div>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>The Nonplo Team</p>
        </div>
      `,
      textContent: `Welcome to Nonplo! 
      
Hi {{userName}},

Welcome to Nonplo, your AI agent creation platform. We're excited to help you build powerful AI assistants for your business.

Getting Started:
1. Create your first AI agent
2. Customize its personality and knowledge  
3. Deploy and start chatting

If you have any questions, feel free to reach out to our support team.

Best regards,
The Nonplo Team`
    },

    agent_created: {
      type: 'agent_created',
      subject: 'Your AI Agent "{{agentName}}" is Ready!',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">🎉 Your AI Agent is Ready!</h1>
          <p>Hi {{userName}},</p>
          <p>Great news! Your AI agent <strong>{{agentName}}</strong> has been successfully created and is now live.</p>
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Agent Details:</h3>
            <ul>
              <li><strong>Name:</strong> {{agentName}}</li>
              <li><strong>Role:</strong> {{agentRole}}</li>
              <li><strong>Sector:</strong> {{agentSector}}</li>
              <li><strong>Status:</strong> Active & Ready</li>
            </ul>
          </div>
          <p><a href="{{dashboardUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Your Agent</a></p>
          <p>Your agent is now ready to assist customers and handle inquiries 24/7.</p>
          <p>Best regards,<br>The Nonplo Team</p>
        </div>
      `,
      textContent: `🎉 Your AI Agent is Ready!

Hi {{userName}},

Great news! Your AI agent {{agentName}} has been successfully created and is now live.

Agent Details:
- Name: {{agentName}}
- Role: {{agentRole}}
- Sector: {{agentSector}}
- Status: Active & Ready

View your agent: {{dashboardUrl}}

Your agent is now ready to assist customers and handle inquiries 24/7.

Best regards,
The Nonplo Team`
    }
  };

  async sendEmail(job: EmailJob): Promise<boolean> {
    try {
      // In a real implementation, you'd integrate with an email service like:
      // - Resend
      // - SendGrid
      // - AWS SES
      // - Postmark

      console.log(`Sending email: ${job.template.subject} to ${job.to}`);
      console.log('Email content:', this.renderTemplate(job.template.htmlContent, job.variables));

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update job status
      await supabase
        .from('email_jobs')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', job.id);

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      
      // Update job status to failed
      await supabase
        .from('email_jobs')
        .update({ 
          status: 'failed', 
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', job.id);

      return false;
    }
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return rendered;
  }

  async queueWelcomeEmail(userEmail: string, userName: string) {
    const job: Omit<EmailJob, 'id'> = {
      to: userEmail,
      template: this.templates.welcome,
      variables: { userName },
      status: 'pending'
    };

    const { data } = await supabase
      .from('email_jobs')
      .insert(job)
      .select()
      .single();

    return data;
  }

  async queueAgentCreatedEmail(userEmail: string, agentData: any) {
    const job: Omit<EmailJob, 'id'> = {
      to: userEmail,
      template: this.templates.agent_created,
      variables: {
        userName: agentData.userName,
        agentName: agentData.name,
        agentRole: agentData.role,
        agentSector: agentData.sector,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/agents/${agentData.id}`
      },
      status: 'pending'
    };

    const { data } = await supabase
      .from('email_jobs')
      .insert(job)
      .select()
      .single();

    return data;
  }

  async processEmailQueue() {
    // Get pending emails
    const { data: pendingJobs } = await supabase
      .from('email_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10);

    if (!pendingJobs?.length) {
      console.log('No pending emails to process');
      return;
    }

    console.log(`Processing ${pendingJobs.length} email jobs`);

    for (const job of pendingJobs) {
      await this.sendEmail(job);
      // Add small delay between emails
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

export const emailService = new EmailNotificationService();