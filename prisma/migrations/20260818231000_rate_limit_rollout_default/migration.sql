-- The previous deployment can still create rows between migration and traffic
-- promotion. Its insert does not know expiresAt yet, so keep that version
-- compatible throughout the rollout.
ALTER TABLE "RateLimit"
ALTER COLUMN "expiresAt"
SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');
