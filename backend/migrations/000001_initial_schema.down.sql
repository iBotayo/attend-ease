-- 000001_initial_schema.down.sql
-- Reversible rollback script

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `biometric_templates`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `registered_devices`;
DROP TABLE IF EXISTS `offline_events`;
DROP TABLE IF EXISTS `attendance_corrections`;
DROP TABLE IF EXISTS `attendance_records`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `verification_tokens`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `shifts`;
DROP TABLE IF EXISTS `facilities`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `organization_settings`;
DROP TABLE IF EXISTS `organizations`;
DROP TABLE IF EXISTS `schema_migrations`;

SET FOREIGN_KEY_CHECKS = 1;
