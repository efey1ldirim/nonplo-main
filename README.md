# Nonplo - AI Agent Development Platform

Nonplo is an advanced AI-powered development platform that enables businesses to create, customize, and deploy AI agents (virtual employees) without coding knowledge. The platform streamlines workflow automation and enhances developer productivity through intelligent technologies and conversational AI integration.

## Features

- 🤖 **AI Agent Creation**: Create custom AI agents for customer support, lead qualification, and business automation
- 🎨 **Visual Wizard**: No-code agent creation with intuitive visual interface
- 📚 **Pre-built Templates**: Ready-to-use agent templates for common business scenarios
- 🔧 **Advanced Playbook System**: Dynamic agent creation with intelligent playbook management
- 💬 **Conversational AI**: Powered by Google Dialogflow CX and Gemini 2.0 Flash
- 📊 **Comprehensive Dashboard**: Monitor and manage all your AI agents from one place
- 🔐 **Secure Authentication**: Supabase-powered authentication system
- 📱 **Responsive Design**: Works seamlessly across desktop and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive design
- **Shadcn UI** component library
- **React Router v6** for navigation
- **TanStack Query** for server state management
- **Vite** as build tool

### Backend
- **Express.js** API server
- **Supabase PostgreSQL** database with Drizzle ORM
- **Supabase** for authentication, database, and real-time features
- **Node.js** runtime environment

### AI & Integrations
- **Google Dialogflow CX** for conversational AI
- **Google Gemini 2.0 Flash** for intelligent agent interactions
- **Advanced Playbook System** for dynamic agent creation

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account (includes PostgreSQL database)
- Google Cloud account (for Dialogflow CX)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/nonplo.git
cd nonplo
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```bash
# Supabase Database
SUPABASE_DB_PASSWORD=your_supabase_database_password

# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account_json
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Other configurations
NODE_ENV=development
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and API clients
│   │   └── types/         # TypeScript type definitions
├── server/                 # Backend Express server
│   ├── routes/            # API route handlers
│   ├── scripts/           # Utility scripts
│   ├── storage.ts         # Database access layer
│   └── index.ts           # Server entry point
├── shared/                 # Shared code between frontend and backend
│   └── schema.ts          # Database schema definitions
└── supabase/              # Supabase configurations
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes

## Features Overview

### Agent Creation
- Visual wizard for creating AI agents
- Customizable agent roles and personalities
- Business-specific configuration options
- Integration with existing workflows

### Playbook System
- Dynamic playbook creation with AI assistance
- Conflict resolution for playbook settings
- "Prompt" mode for enhanced flexibility
- No-flow architecture for streamlined operation

### Dashboard
- Real-time agent monitoring
- Message history and analytics
- Integration management
- User settings and preferences

### Chat Interface
- Direct communication with AI agents
- Session management for conversation continuity
- Debug logging for troubleshooting
- Responsive design for all devices

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@nonplo.com or create an issue in this repository.

## Acknowledgments

- Built with ❤️ for businesses looking to automate with AI
- Powered by cutting-edge AI technologies from Google
- Designed for scalability and ease of use