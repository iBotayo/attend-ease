-- Attend Ease MySQL Database & User Provisioning Script
-- Run this as MySQL root or administrative user:
--   sudo mysql < backend/scripts/setup_db.sql

-- 1. Create development and test databases
CREATE DATABASE IF NOT EXISTS `attend_ease` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `attend_ease_test` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 2. Create dedicated least-privilege application user
CREATE USER IF NOT EXISTS 'attend_ease_user'@'localhost' 
  IDENTIFIED BY 'attend_ease_dev_secret_2026';

-- 3. Grant privileges strictly on application and test databases
GRANT ALL PRIVILEGES ON `attend_ease`.* TO 'attend_ease_user'@'localhost';
GRANT ALL PRIVILEGES ON `attend_ease_test`.* TO 'attend_ease_user'@'localhost';

-- 4. Flush privileges to ensure changes take effect immediately
FLUSH PRIVILEGES;

SELECT 'Attend Ease databases and user configured successfully.' AS Result;
