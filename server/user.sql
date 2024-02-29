-- Restricted User to run users' queries on database
CREATE USER IF NOT EXISTS 'sqluser'@'%' IDENTIFIED BY '<password>';
REVOKE ALL PRIVILEGES ON *.* FROM 'sqluser'@'%';

-- Only allow to perform SELECT queries on the following databases/tables
GRANT SELECT ON `test`.* TO 'sqluser'@'%';

FLUSH PRIVILEGES;
