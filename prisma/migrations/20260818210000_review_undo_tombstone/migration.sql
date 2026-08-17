-- Keep idempotency keys after undo. Deleting the ReviewLog would allow a
-- delayed retry of the original request to apply the same rating again.
ALTER TABLE "ReviewLog"
ADD COLUMN "undoneAt" TIMESTAMP(3);
