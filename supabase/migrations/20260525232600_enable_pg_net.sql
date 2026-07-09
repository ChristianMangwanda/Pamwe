-- pg_net powers net.http_post in the notify webhooks (20260526000000 trigger
-- onward). Enabled by default on the local stack; hosted projects need it
-- enabled explicitly.
create extension if not exists pg_net;
