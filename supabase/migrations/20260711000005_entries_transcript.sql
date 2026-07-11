-- On-device transcript for voice reflections. Written by the recorder's owner
-- alongside the audio upload; readable under the exact same locked-reveal RLS
-- as the rest of the entry row (it is just another column on entries).
-- Nullable: transcription is best-effort and the entry never depends on it.
alter table public.entries add column if not exists transcript text;
