CREATE DATABASE gatekeeper OWNER web;

CREATE TABLE public.history (
	"id" serial NOT NULL,
	"timestamp" timestamp NOT NULL,
	cpu int4 NOT NULL,
	memory int4 NOT NULL,
	connected_users int4 NOT NULL,
	running_realms int4 NOT NULL,
	server_id int4 NOT NULL,
	PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX history_pkey ON history USING btree (id);