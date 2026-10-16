-- 000001_initial_schema.up.sql
-- Attend Ease Schema Definition (MySQL 8.0 InnoDB)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Migration tracker
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version` BIGINT NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. Organizations
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(128) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(64) NOT NULL,
  `address` TEXT NULL,
  `status` ENUM('pending_verification', 'active', 'suspended', 'rejected') NOT NULL DEFAULT 'pending_verification',
  `tier` ENUM('starter', 'professional', 'enterprise') NOT NULL DEFAULT 'starter',
  `initial_admin_email` VARCHAR(255) NOT NULL,
  `initial_admin_name` VARCHAR(255) NOT NULL,
  `is_email_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `setup_completed` BOOLEAN NOT NULL DEFAULT FALSE,
  `setup_step` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Organization Settings
CREATE TABLE IF NOT EXISTS `organization_settings` (
  `organization_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'UTC',
  `date_format` VARCHAR(32) NOT NULL DEFAULT 'YYYY-MM-DD',
  `require_biometric_liveness` BOOLEAN NOT NULL DEFAULT TRUE,
  `require_geofence` BOOLEAN NOT NULL DEFAULT TRUE,
  `allow_offline_attendance` BOOLEAN NOT NULL DEFAULT TRUE,
  `max_offline_hours` INT NOT NULL DEFAULT 48,
  `auto_sync_interval_minutes` INT NOT NULL DEFAULT 5,
  `default_grace_period_minutes` INT NOT NULL DEFAULT 15,
  `auto_checkout_hours` INT NOT NULL DEFAULT 14,
  `allow_early_check_in_minutes` INT NOT NULL DEFAULT 30,
  `strict_shift_enforcement` BOOLEAN NOT NULL DEFAULT TRUE,
  `require_gps_verification` BOOLEAN NOT NULL DEFAULT TRUE,
  `require_wifi_subnet_match` BOOLEAN NOT NULL DEFAULT FALSE,
  `default_geofence_radius_meters` INT NOT NULL DEFAULT 150,
  `allow_mock_location` BOOLEAN NOT NULL DEFAULT FALSE,
  `session_timeout_minutes` INT NOT NULL DEFAULT 60,
  `mfa_enforced_for_admins` BOOLEAN NOT NULL DEFAULT TRUE,
  `biometric_retention_days` INT NOT NULL DEFAULT 90,
  `prevent_formula_injection` BOOLEAN NOT NULL DEFAULT TRUE,
  `notify_late_arrivals` BOOLEAN NOT NULL DEFAULT TRUE,
  `notify_pending_offline_queue` BOOLEAN NOT NULL DEFAULT TRUE,
  `notify_unusual_location_attempts` BOOLEAN NOT NULL DEFAULT TRUE,
  `daily_digest_email` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_settings_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Departments
CREATE TABLE IF NOT EXISTS `departments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_dept_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_dept_org_code` (`organization_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Facilities
CREATE TABLE IF NOT EXISTS `facilities` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `address` TEXT NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `geofence_radius_meters` INT NOT NULL DEFAULT 150,
  `require_network_match` BOOLEAN NOT NULL DEFAULT FALSE,
  `allowed_ssid_prefixes` JSON NULL,
  `allowed_ip_ranges` JSON NULL,
  `network_policy_description TEXT` NULL,
  `allow_offline_attendance` BOOLEAN NOT NULL DEFAULT TRUE,
  `max_offline_hours` INT NOT NULL DEFAULT 48,
  `require_review_threshold_hours` INT NOT NULL DEFAULT 4,
  `offline_policy_description TEXT` NULL,
  `status` ENUM('active', 'maintenance', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_facility_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_fac_org_code` (`organization_id`, `code`),
  INDEX `idx_facility_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Shifts
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `assigned_facility_id` VARCHAR(64) NULL,
  `name` VARCHAR(128) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `start_time` VARCHAR(10) NOT NULL,
  `end_time` VARCHAR(10) NOT NULL,
  `grace_period_minutes` INT NOT NULL DEFAULT 15,
  `assigned_days` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_shift_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_facility` FOREIGN KEY (`assigned_facility_id`) REFERENCES `facilities` (`id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_shift_org_code` (`organization_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Users (Employees & Administrators)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('employee', 'supervisor', 'facility_admin', 'system_admin', 'org_admin') NOT NULL DEFAULT 'employee',
  `department_id` VARCHAR(64) NULL,
  `assigned_facility_id` VARCHAR(64) NULL,
  `avatar_url` VARCHAR(512) NULL,
  `phone` VARCHAR(64) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `biometric_status` ENUM('enrolled', 'pending', 'failed', 'not_enrolled') NOT NULL DEFAULT 'not_enrolled',
  `enrolled_at` DATETIME NULL,
  `joined_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_fac` FOREIGN KEY (`assigned_facility_id`) REFERENCES `facilities` (`id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_user_org_email` (`organization_id`, `email`),
  UNIQUE KEY `uq_user_org_empid` (`organization_id`, `employee_id`),
  INDEX `idx_user_role` (`role`),
  INDEX `idx_user_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Verification Tokens (Email validation)
CREATE TABLE IF NOT EXISTS `verification_tokens` (
  `token` VARCHAR(128) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `organization_id` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `consumed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_token_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  INDEX `idx_token_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. User Sessions (Server-side Session & Bearer Validation)
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `organization_id` VARCHAR(64) NOT NULL,
  `token_hash` VARCHAR(128) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sess_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sess_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  INDEX `idx_sess_user` (`user_id`),
  INDEX `idx_sess_token` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Attendance Records
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `facility_id` VARCHAR(64) NOT NULL,
  `department_id` VARCHAR(64) NULL,
  `date` DATE NOT NULL,
  `check_in_time` DATETIME NULL,
  `check_out_time` DATETIME NULL,
  `status` ENUM('present', 'absent', 'late', 'pending', 'rejected', 'early_departure') NOT NULL DEFAULT 'present',
  `verification_mode` ENUM('face_facility', 'face_only', 'offline_sync', 'manual_override', 'simulated_demo') NOT NULL,
  `sync_status` ENUM('synced', 'pending', 'rejected', 'review_required') NOT NULL DEFAULT 'synced',
  `is_offline_capture` BOOLEAN NOT NULL DEFAULT FALSE,
  `verification_details` JSON NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_att_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_emp` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_fac` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_att_org_emp_date` (`organization_id`, `employee_id`, `date`),
  INDEX `idx_att_org_date` (`organization_id`, `date`),
  INDEX `idx_att_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Attendance Corrections
CREATE TABLE IF NOT EXISTS `attendance_corrections` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `attendance_id` VARCHAR(64) NOT NULL,
  `original_time` VARCHAR(64) NOT NULL,
  `corrected_time` VARCHAR(64) NOT NULL,
  `reason` TEXT NOT NULL,
  `approved_by` VARCHAR(64) NOT NULL,
  `notes` TEXT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_corr_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_corr_att` FOREIGN KEY (`attendance_id`) REFERENCES `attendance_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_corr_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Offline Events (Buffered Records)
CREATE TABLE IF NOT EXISTS `offline_events` (
  `id` VARCHAR(128) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `event_type` ENUM('check_in', 'check_out') NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `facility_id` VARCHAR(64) NOT NULL,
  `device_identifier` VARCHAR(128) NULL,
  `time_source` VARCHAR(64) NULL,
  `captured_at` DATETIME NOT NULL,
  `verification_mode` VARCHAR(64) NOT NULL,
  `verification_result` JSON NULL,
  `status` ENUM('pending', 'syncing', 'synced', 'rejected', 'review_required') NOT NULL DEFAULT 'pending',
  `retry_count` INT NOT NULL DEFAULT 0,
  `error_message` TEXT NULL,
  `requires_review_reason` TEXT NULL,
  `sync_attempted_at` DATETIME NULL,
  `synced_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_off_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_off_emp` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_off_fac` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`id`) ON DELETE CASCADE,
  INDEX `idx_off_org_emp` (`organization_id`, `employee_id`),
  INDEX `idx_off_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Registered Devices
CREATE TABLE IF NOT EXISTS `registered_devices` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `model` VARCHAR(128) NOT NULL,
  `device_type` ENUM('mobile_ios', 'mobile_android', 'tablet_kiosk', 'desktop') NOT NULL,
  `assigned_user_id` VARCHAR(64) NULL,
  `assigned_facility_id` VARCHAR(64) NULL,
  `fingerprint_hash` VARCHAR(128) NOT NULL,
  `registered_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_sync_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('active', 'revoked', 'pending') NOT NULL DEFAULT 'active',
  `app_version` VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  `is_simulated` BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT `fk_dev_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dev_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dev_fac` FOREIGN KEY (`assigned_facility_id`) REFERENCES `facilities` (`id`) ON DELETE SET NULL,
  INDEX `idx_dev_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NULL,
  `actor_id` VARCHAR(64) NOT NULL,
  `actor_name` VARCHAR(255) NOT NULL,
  `actor_role` VARCHAR(64) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `affected_resource` VARCHAR(255) NOT NULL,
  `resource_id` VARCHAR(64) NULL,
  `details` TEXT NOT NULL,
  `outcome` ENUM('success', 'failure', 'warning') NOT NULL DEFAULT 'success',
  `ip_address` VARCHAR(64) NULL,
  `user_agent` TEXT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL,
  INDEX `idx_audit_org_time` (`organization_id`, `timestamp`),
  INDEX `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Biometric Templates (Encrypted vector references)
CREATE TABLE IF NOT EXISTS `biometric_templates` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `organization_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL UNIQUE,
  `algorithm` VARCHAR(64) NOT NULL,
  `template_version` INT NOT NULL DEFAULT 1,
  `encrypted_embedding` VARBINARY(4096) NOT NULL,
  `encryption_key_id` VARCHAR(64) NOT NULL,
  `enrolled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_verified_at` DATETIME NULL,
  CONSTRAINT `fk_bio_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bio_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
