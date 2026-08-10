PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `questionnaire_session` (
	`id` text PRIMARY KEY NOT NULL,
	`flow_questionnaire_id` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`answers` text NOT NULL,
	`report` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
