-- SCHEMA: admin

-- DROP SCHEMA admin ;

CREATE SCHEMA admin AUTHORIZATION postgres;

-- Table: admin.traffic

-- DROP TABLE admin.traffic;

CREATE TABLE admin.traffic
(
    user_name text,
    request_time timestamp with time zone,
    end_point text,
    user_query text
)

TABLESPACE pg_default;

ALTER TABLE admin.traffic OWNER to postgres;
GRANT ALL ON TABLE admin.traffic TO postgres;

-- Table: admin.lease

-- DROP TABLE admin.lease;

CREATE TABLE admin.lease
(
    token text,
    expiration timestamp with time zone
)

TABLESPACE pg_default;

ALTER TABLE admin.lease OWNER to postgres;
GRANT ALL ON TABLE admin.lease TO postgres;

-- Table: admin.user_info

-- DROP TABLE admin.user_info;

CREATE TABLE admin.user_info
(
    user_name text,
    first_name text,
    last_name text,
    password text,
    email text
)

TABLESPACE pg_default;

ALTER TABLE admin.user_info OWNER to postgres;
GRANT ALL ON TABLE admin.user_info TO postgres;