-- docker/postgres/init.sql
-- Creates commerce_test database for testing environments.
-- The primary dev database (commerce) is automatically created by POSTGRES_DB.

SELECT 'CREATE DATABASE commerce_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'commerce_test')\gexec
