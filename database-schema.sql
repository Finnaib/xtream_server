USE railway;

-- Copy EVERYTHING from database-schema.sql and paste here
-- Or run section by section:

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  active TINYINT(1) DEFAULT 1,
  is_trial TINYINT(1) DEFAULT 0,
  exp_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  max_connections INT DEFAULT 1,
  message TEXT,
  status VARCHAR(50) DEFAULT 'active',
  INDEX idx_username (username),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('live', 'movie', 'series') NOT NULL,
  parent_id INT DEFAULT 0,
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Streams table
CREATE TABLE IF NOT EXISTS streams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('live', 'movie') NOT NULL,
  category_id INT,
  stream_source TEXT,
  icon TEXT,
  epg_channel_id VARCHAR(255),
  tv_archive TINYINT(1) DEFAULT 0,
  tv_archive_duration INT DEFAULT 0,
  direct_source TEXT,
  custom_sid VARCHAR(255),
  rating DECIMAL(3,1) DEFAULT 0,
  container_extension VARCHAR(10) DEFAULT 'mp4',
  tmdb_id VARCHAR(50),
  active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_category (category_id),
  INDEX idx_active (active),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Series table
CREATE TABLE IF NOT EXISTS series (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INT,
  cover TEXT,
  plot TEXT,
  cast TEXT,
  director TEXT,
  genre VARCHAR(255),
  release_date VARCHAR(50),
  last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  rating DECIMAL(3,1) DEFAULT 0,
  backdrop_path JSON,
  youtube_trailer TEXT,
  episode_run_time VARCHAR(50) DEFAULT '45',
  active TINYINT(1) DEFAULT 1,
  INDEX idx_category (category_id),
  INDEX idx_active (active),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Series Episodes table
CREATE TABLE IF NOT EXISTS series_episodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  series_id INT NOT NULL,
  season_num INT NOT NULL,
  episode_num INT NOT NULL,
  title VARCHAR(255),
  container_extension VARCHAR(10) DEFAULT 'mp4',
  tmdb_id VARCHAR(50),
  release_date VARCHAR(50),
  plot TEXT,
  duration_secs INT,
  duration VARCHAR(50),
  bitrate INT,
  custom_sid VARCHAR(255),
  direct_source TEXT,
  added DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_series (series_id),
  INDEX idx_season (season_num),
  FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add users
INSERT INTO users (username, password, email, active, is_trial, exp_date, max_connections, status) 
VALUES 
('finn', 'finn123', 'finn@finntv.com', 1, 0, '2025-12-31 23:59:59', 5, 'active'),
('tabby', 'tabby123', 'tabby@finntv.com', 1, 0, '2025-12-31 23:59:59', 3, 'active');

-- Verify
SELECT username, password, active FROM users;
SHOW TABLES;

# Create database
CREATE DATABASE IF NOT EXISTS xtream_db;
USE xtream_db;

# Exit MySQL
exit