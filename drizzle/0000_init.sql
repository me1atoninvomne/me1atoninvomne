CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` text NOT NULL,
	`at` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`document_id` text,
	`email_id` text,
	`params` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_ws` ON `audit_events` (`workspace_id`,`id`);--> statement-breakpoint
CREATE INDEX `audit_doc` ON `audit_events` (`document_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email_id` text NOT NULL,
	`file_name` text,
	`mime_type` text,
	`file` blob,
	`text_content` text,
	`doc_type` text,
	`status` text NOT NULL,
	`extraction` text,
	`issues` text,
	`routing` text,
	`facts` text,
	`route` text,
	`required_role` text,
	`department` text,
	`priority` text,
	`workflow_id` text,
	`party_number` text,
	`party_name` text,
	`document_number` text,
	`net_amount` real,
	`gross_amount` real,
	`assignee_id` text,
	`due_at` text,
	`created_at` text NOT NULL,
	`processed_at` text,
	`decided_at` text,
	`decided_by` text,
	`review_seconds` integer,
	`export_ref` text,
	`content_deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `documents_ws` ON `documents` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `documents_email` ON `documents` (`email_id`);--> statement-breakpoint
CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`source` text NOT NULL,
	`demo_key` text,
	`from_name` text NOT NULL,
	`from_email` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`received_at` text NOT NULL,
	`status` text NOT NULL,
	`summary` text,
	`next_action` text,
	`priority` text,
	`department` text,
	`processed_at` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `emails_ws` ON `emails` (`workspace_id`,`received_at`);--> statement-breakpoint
CREATE TABLE `erp_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`document_id` text NOT NULL,
	`connector` text NOT NULL,
	`kind` text NOT NULL,
	`external_ref` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`employees` text,
	`process` text,
	`message` text,
	`source` text
);
--> statement-breakpoint
CREATE TABLE `master_data` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metric_weeks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`week_start` text NOT NULL,
	`documents` integer NOT NULL,
	`automated` integer NOT NULL,
	`reviewed` integer NOT NULL,
	`hours_freed` real NOT NULL,
	`corrections` integer DEFAULT 0 NOT NULL,
	`fields_extracted` integer DEFAULT 0 NOT NULL,
	`synthetic` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`at` text NOT NULL,
	`department` text,
	`user_id` text,
	`document_id` text,
	`kind` text NOT NULL,
	`params` text NOT NULL,
	`read` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_ws` ON `notifications` (`workspace_id`,`at`);--> statement-breakpoint
CREATE TABLE `rules` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`enabled` integer NOT NULL,
	`doc_types` text NOT NULL,
	`conditions` text NOT NULL,
	`action` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`document_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`assignee_id` text,
	`department` text NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`due_at` text,
	`note` text,
	`created_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `tasks_ws` ON `tasks` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`department` text NOT NULL,
	`title` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `users_ws` ON `users` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`doc_types` text NOT NULL,
	`active` integer NOT NULL,
	`params` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`industry` text NOT NULL,
	`is_demo` integer DEFAULT true NOT NULL,
	`base_date` text NOT NULL,
	`settings` text NOT NULL,
	`simulation_cursor` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`last_activity_at` text NOT NULL
);
