CREATE TABLE "cached_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validity_fingerprint" text NOT NULL,
	"text" text NOT NULL
);
