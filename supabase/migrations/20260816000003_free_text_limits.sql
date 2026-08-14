-- The last uncapped free-text fields, and the voice bucket.
--
-- prayers.text (280), dreams.text (4000), verse_notes.text (2000),
-- verse_note_responses.body (1000) and couples.farewell_note (1000) all carry a
-- length check. entries.text_content, entries.transcript and
-- entry_responses.body carry none, and the journal is the largest writing
-- surface in the app: the TextInput had no maxLength either, so nothing at any
-- layer bounded it. transcript joins them because it sits in the same
-- client-writable column grant (20260810000001) with the same gap.
--
-- These are abuse ceilings, not editorial ones. The longest text_content on
-- hosted today is 510 characters, the longest transcript 322 and the longest
-- response body 258, so every real reflection written so far clears the lowest
-- of these by more than an order of magnitude. Nobody meets them by writing.

alter table public.entries drop constraint if exists entries_text_content_length;
alter table public.entries add constraint entries_text_content_length
  check (text_content is null or char_length(text_content) <= 10000);

-- Five minutes of speech is roughly 5,000 characters; this is generous headroom
-- over the recorder's own 300 second ceiling.
alter table public.entries drop constraint if exists entries_transcript_length;
alter table public.entries add constraint entries_transcript_length
  check (transcript is null or char_length(transcript) <= 20000);

-- Replies are capped at 280 in the UI, but a 'quote' is a kept line lifted out
-- of a partner's reflection and has never been bounded anywhere. It has to stay
-- comfortably above the longest line a long reflection could hold.
alter table public.entry_responses drop constraint if exists entry_responses_body_length;
alter table public.entry_responses add constraint entry_responses_body_length
  check (body is null or char_length(body) <= 4000);

-- The voice bucket was created (20260607000000) with id, name and public only,
-- so file_size_limit and allowed_mime_types have been null the whole time: any
-- signed-in user could put an arbitrarily large blob of any type at their own
-- path. RLS was never the gap, storage cost was.
--
-- The recorder writes mono 64 kbps AAC capped at 300 seconds, about 2.4 MB.
-- Builds before 2026-08-07 recorded stereo 128 kbps, about 4.8 MB for the same
-- five minutes, so the ceiling has to clear THAT rather than the current
-- setting or an old client re-sending a saved take would start failing.
--
-- audio/m4a is what src/lib/entries.ts actually sends. It is not a registered
-- type, so the standard spellings ride along with it; sending only the
-- registered ones would break the upload path that exists.
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac']
 where id = 'voice-entries';
