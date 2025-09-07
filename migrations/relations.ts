import { relations } from "drizzle-orm/relations";
import { agents, playbookBackups, playbooks, userGoogleCalendars } from "./schema";

export const playbookBackupsRelations = relations(playbookBackups, ({one}) => ({
	agent: one(agents, {
		fields: [playbookBackups.agentId],
		references: [agents.id]
	}),
}));

export const agentsRelations = relations(agents, ({many}) => ({
	playbookBackups: many(playbookBackups),
	playbooks: many(playbooks),
	userGoogleCalendars: many(userGoogleCalendars),
}));

export const playbooksRelations = relations(playbooks, ({one}) => ({
	agent: one(agents, {
		fields: [playbooks.agentId],
		references: [agents.id]
	}),
}));

export const userGoogleCalendarsRelations = relations(userGoogleCalendars, ({one}) => ({
	agent: one(agents, {
		fields: [userGoogleCalendars.agentId],
		references: [agents.id]
	}),
}));