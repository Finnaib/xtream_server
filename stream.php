<?php
require_once 'config.php';

// Get URL parameters - support both PATH_INFO and query string
$username = '';
$password = '';
$streamId = 0;

// Try to get from PATH_INFO first (if .htaccess works)
if (isset($_SERVER['PATH_INFO'])) {
    $pathInfo = $_SERVER['PATH_INFO'];
    $parts = explode('/', trim($pathInfo, '/'));
    
    if (count($parts) >= 3) {
        $username = $parts[0];
        $password = $parts[1];
        $streamId = (int)preg_replace('/\..+$/', '', $parts[2]);
    }
}

// Fallback: try query string parameters
if (empty($username)) {
    $username = $_GET['username'] ?? $_GET['u'] ?? '';
    $password = $_GET['password'] ?? $_GET['p'] ?? '';
    $streamId = (int)($_GET['stream'] ?? $_GET['id'] ?? 0);
}

// If still empty, accept credentials from POST, Basic Auth, JSON body, or alternate param names
function getRequestCredentials() {
    $u = '';
    $p = '';
    $sources = array_merge($_GET ?? [], $_POST ?? []);
    foreach (['username','user','u'] as $key) {
        if (isset($sources[$key]) && $sources[$key] !== '') { $u = $sources[$key]; break; }
    }
    foreach (['password','pass','p'] as $key) {
        if (isset($sources[$key]) && $sources[$key] !== '') { $p = $sources[$key]; break; }
    }
    if (empty($u) && isset($_SERVER['PHP_AUTH_USER'])) $u = $_SERVER['PHP_AUTH_USER'];
    if (empty($p) && isset($_SERVER['PHP_AUTH_PW'])) $p = $_SERVER['PHP_AUTH_PW'];
    if ((empty($u) || empty($p)) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
        if (stripos($auth, 'basic ') === 0) {
            $decoded = base64_decode(substr($auth, 6));
            if ($decoded !== false) {
                $parts = explode(':', $decoded, 2);
                if (count($parts) == 2) {
                    if (empty($u)) $u = $parts[0];
                    if (empty($p)) $p = $parts[1];
                }
            }
        }
    }
    if ((empty($u) || empty($p))) {
        $body = @file_get_contents('php://input');
        if ($body) {
            $json = json_decode($body, true);
            if (is_array($json)) {
                foreach (['username','user','u'] as $key) { if (empty($u) && isset($json[$key])) $u = $json[$key]; }
                foreach (['password','pass','p'] as $key) { if (empty($p) && isset($json[$key])) $p = $json[$key]; }
            }
        }
    }
    return [trim((string)$u), trim((string)$p)];
}

if (empty($username) || empty($password)) {
    list($username, $password) = getRequestCredentials();
}

// Validate input
if (empty($username) || empty($password) || $streamId == 0) {
    http_response_code(400);
    die('Missing parameters. Usage: stream.php?username=USER&password=PASS&stream=ID');
}

// Authenticate user (supports bcrypt hashes and legacy plain-text passwords)
function authenticateUser($username, $password, $users) {
    if (!isset($users[$username])) {
        return false;
    }
    $user = $users[$username];

    if (is_string($user['pass']) && password_verify($password, $user['pass'])) {
        return $user;
    }

    if ($password === $user['pass']) {
        return $user;
    }

    return false;
}

$user = authenticateUser($username, $password, $users);

if (!$user) {
    http_response_code(403);
    die('Authentication failed');
}

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
    die('Stream not found');
}

// Check if user has access to this category
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