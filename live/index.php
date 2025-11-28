<?php
// TiviMate Stream Handler
// Save as: xtream_server/live.php (NOT in a folder, in the main xtream_server folder)

require_once 'config.php';

// Get the full request path
$requestUri = $_SERVER['REQUEST_URI'];

// Parse different URL formats TiviMate might use:
// Format 1: /xtream_server/live/username/password/streamid.ts
// Format 2: /xtream_server/live.php/username/password/streamid.ts
// Format 3: /xtream_server/live.php?username=X&password=Y&stream=Z

$username = '';
$password = '';
$streamId = 0;

// Try to parse from PATH
if (preg_match('/\/live(?:\.php)?\/([^\/]+)\/([^\/]+)\/(\d+)\.(ts|m3u8)/', $requestUri, $matches)) {
    $username = $matches[1];
    $password = $matches[2];
    $streamId = (int)$matches[3];
}
// Try PATH_INFO
else if (isset($_SERVER['PATH_INFO'])) {
    $parts = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    if (count($parts) >= 3) {
        $username = $parts[0];
        $password = $parts[1];
        $streamId = (int)preg_replace('/\.(ts|m3u8)$/', '', $parts[2]);
    }
}
// Try query parameters
else {
    $username = $_GET['username'] ?? $_GET['u'] ?? '';
    $password = $_GET['password'] ?? $_GET['p'] ?? '';
    $streamId = (int)($_GET['stream'] ?? $_GET['id'] ?? 0);
}

// Debug info if no parameters found
if (empty($username) || empty($password) || $streamId == 0) {
    http_response_code(400);
    echo "Debug Info:\n";
    echo "REQUEST_URI: " . $requestUri . "\n";
    echo "PATH_INFO: " . ($_SERVER['PATH_INFO'] ?? 'not set') . "\n";
    echo "Username: " . $username . "\n";
    echo "Password: " . $password . "\n";
    echo "Stream ID: " . $streamId . "\n";
    exit;
}

// Authenticate
if (!isset($users[$username]) || $users[$username]['pass'] !== $password) {
    http_response_code(403);
    die('Authentication failed');
}

$user = $users[$username];

// Find the channel
$channel = null;
foreach ($channels as $ch) {
    if ($ch['id'] == $streamId) {
        $channel = $ch;
        break;
    }
}

if (!$channel) {
    http_response_code(404);
    die('Stream not found - ID: ' . $streamId);
}

// Check category access
$userCategoryIds = [];
foreach ($user['categories'] as $cat) {
    if (isset($category_map[$cat])) {
        $userCategoryIds[] = $category_map[$cat]['id'];
    }
}

if (!in_array($channel['category'], $userCategoryIds)) {
    http_response_code(403);
    die('Access denied to this channel');
}

// Redirect to actual stream URL
header('Location: ' . $channel['url']);
exit;
?>