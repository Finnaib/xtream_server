<?php
// Session/Connection Management
// This tracks active connections per user

$sessionsFile = __DIR__ . '/data/sessions.json';
$sessionsDir = dirname($sessionsFile);

// Create data directory if not exists
if (!is_dir($sessionsDir)) {
    @mkdir($sessionsDir, 0755, true);
}

// Initialize sessions file
if (!file_exists($sessionsFile)) {
    file_put_contents($sessionsFile, json_encode([]));
}

// Clean expired sessions (older than 5 minutes)
function cleanExpiredSessions() {
    global $sessionsFile;
    
    $sessions = json_decode(file_get_contents($sessionsFile), true);
    $now = time();
    $timeout = 300; // 5 minutes
    
    foreach ($sessions as $username => $userSessions) {
        foreach ($userSessions as $sessionId => $lastActive) {
            if ($now - $lastActive > $timeout) {
                unset($sessions[$username][$sessionId]);
            }
        }
        
        // Remove user entry if no active sessions
        if (empty($sessions[$username])) {
            unset($sessions[$username]);
        }
    }
    
    file_put_contents($sessionsFile, json_encode($sessions));
}

// Register a new session
function registerSession($username, $sessionId) {
    global $sessionsFile;
    
    cleanExpiredSessions();
    
    $sessions = json_decode(file_get_contents($sessionsFile), true);
    
    if (!isset($sessions[$username])) {
        $sessions[$username] = [];
    }
    
    $sessions[$username][$sessionId] = time();
    
    file_put_contents($sessionsFile, json_encode($sessions));
}

// Update session activity
function updateSession($username, $sessionId) {
    global $sessionsFile;
    
    $sessions = json_decode(file_get_contents($sessionsFile), true);
    
    if (isset($sessions[$username][$sessionId])) {
        $sessions[$username][$sessionId] = time();
        file_put_contents($sessionsFile, json_encode($sessions));
    }
}

// Get active connection count for user
function getActiveConnections($username) {
    global $sessionsFile;
    
    cleanExpiredSessions();
    
    $sessions = json_decode(file_get_contents($sessionsFile), true);
    
    return isset($sessions[$username]) ? count($sessions[$username]) : 0;
}

// Check if user can connect (within max connections limit)
function canConnect($username, $maxConnections, $sessionId) {
    $activeConnections = getActiveConnections($username);
    
    // If this session already exists, allow it
    $sessions = json_decode(file_get_contents($GLOBALS['sessionsFile']), true);
    if (isset($sessions[$username][$sessionId])) {
        return true;
    }
    
    // Check if under limit
    return $activeConnections < $maxConnections;
}

// Remove a session
function removeSession($username, $sessionId) {
    global $sessionsFile;
    
    $sessions = json_decode(file_get_contents($sessionsFile), true);
    
    if (isset($sessions[$username][$sessionId])) {
        unset($sessions[$username][$sessionId]);
        
        if (empty($sessions[$username])) {
            unset($sessions[$username]);
        }
        
        file_put_contents($sessionsFile, json_encode($sessions));
    }
}
?>