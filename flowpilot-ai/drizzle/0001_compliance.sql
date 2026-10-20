CREATE TABLE `consent_records` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`created_at` text NOT NULL,
	`purpose` text NOT NULL,
	`granted` integer NOT NULL,
	`version` text NOT NULL,
	`text` text NOT NULL,
	`lang` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `consent_subject_idx` ON `consent_records` (`subject_type`,`subject_id`);--> statement-breakpoint
CREATE TABLE `privacy_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`message` text,
	`status` text NOT NULL,
	`due_at` text NOT NULL,
	`completed_at` text,
	`result` text
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `consent_version` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `b2b_confirmed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `marketing_email` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `phone_callback` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `access_token` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `unsubscribed_at` text;--> statement-breakpoint
CREATE INDEX `leads_token_idx` ON `leads` (`access_token`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);