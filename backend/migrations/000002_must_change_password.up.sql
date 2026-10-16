-- Attend Ease: force users created with a shared default password to set their own.

ALTER TABLE `users`
  ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT FALSE AFTER `password_hash`;

-- Org admins choose their own password at registration. Every other existing account
-- was provisioned (setup wizard or Add Employee) with a shared default password.
UPDATE `users` SET `must_change_password` = TRUE WHERE `role` <> 'org_admin';
