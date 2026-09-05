CREATE TABLE "game_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"is_remote" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" DROP CONSTRAINT "boards_game_id_games_id_fk";
--> statement-breakpoint
ALTER TABLE "boards" DROP CONSTRAINT "boards_player_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "game_membership_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "aborted_at" timestamp;--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "game_memberships" ADD CONSTRAINT "game_memberships_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_memberships" ADD CONSTRAINT "game_memberships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_game_membership_id_game_memberships_id_fk" FOREIGN KEY ("game_membership_id") REFERENCES "public"."game_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" DROP COLUMN "game_id";--> statement-breakpoint
ALTER TABLE "boards" DROP COLUMN "player_id";--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "is_started";--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "is_completed";--> statement-breakpoint
ALTER TABLE "prompts" DROP COLUMN "is_completed";