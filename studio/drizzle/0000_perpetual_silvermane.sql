CREATE TABLE `blueprint_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`block_count` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_blueprint_shares_owner_created` ON `blueprint_shares` (`owner_id`,`created_at`);