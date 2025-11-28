<?php
/**
 * Xtream Codes Live Stream Handler
 * Based on phpXtreamCodes reference
 */

error_reporting(0);
ini_set('display_errors', 0);
set_time_limit(0);
ini_set('memory_limit', '256M');

require_once __DIR__ . '/config.php';

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Parse request
$username = '';
$password = '';
$streamId = 0;
$extension = 'm3u8';

// Method 1: /live/username/password/streamid.ext
if (isset($_SERVER['PATH_INFO'])) {
    if (preg_match('#/([^/]+)/([^/]+)/(\d+)\.(m3u8|ts)#', $_SERVER['PATH_INFO'], $m)) {
        list(, $username, $password, $streamId, $extension) = $m;
        $streamId = (int)$streamId;
    }
}

// Method 2: Full URI parse
if (empty($username) && isset($_SERVER['REQUEST_URI'])) {
    if (preg_match('#/live/([^/]+)/([^/]+)/(\d+)\.(m3u8|ts)#', $_SERVER['REQUEST_URI'], $m)) {
        list(, $username, $password, $streamId, $extension) = $m;
        $streamId = (int)$streamId;
    }
}

// Method 3: Query string
if (empty($username)) {
    $username = $_GET['username'] ?? $_GET['u'] ?? '';
    $password = $_GET['password'] ?? $_GET['p'] ?? '';
    $streamId = (int)($_GET['stream'] ?? $_GET['id'] ?? 0);
    $extension = $_GET['extension'] ?? 'm3u8';
}

// Proxy mode for nested M3U8/TS
if (isset($_GET['proxy_url'])) {
    proxyContent($_GET['proxy_url']);
    exit;
}

// Validate
if (empty($username) || empty($password) || $streamId == 0) {
    http_response_code(400);
    die('Invalid request');
}

// Authenticate
if (!isset($users[$username])) {
    http_response_code(403);
    die('User not found');
}

$user = $users[$username];
if ($user['pass'] !== $password && !password_verify($password, $user['pass'])) {
    http_response_code(403);
    die('Invalid password');
}

// Check expiration
if (isset($user['exp_date']) && time() > $user['exp_date']) {
    http_response_code(403);
    die('Account expired');
}

// Find channel
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

// Check access
$allowed = [];
foreach ($user['categories'] as $cat) {
    if (isset($category_map[$cat])) {
        $allowed[] = $category_map[$cat]['id'];
    }
}

if (!in_array($channel['category'], $allowed)) {
    http_response_code(403);
    die('Access denied');
}

// Stream the content
streamChannel($channel['url'], $extension);

// ========================================
// PROXY FUNCTION
// ========================================
function proxyContent($url) {
    $allowedHosts = ['66.102.120.18', '45.86.229.120', '82.80.249.221'];
    $host = parse_url($url, PHP_URL_HOST);
    
    if (!in_array($host, $allowedHosts)) {
        http_response_code(403);
        die('Host not allowed');
    }
    
    $isM3U8 = strpos($url, '.m3u8') !== false;
    
    header('Content-Type: ' . ($isM3U8 ? 'application/vnd.apple.mpegurl' : 'video/mp2t'));
    header('Cache-Control: ' . ($isM3U8 ? 'no-cache' : 'public, max-age=3600'));
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => 'Mozilla/5.0'
    ]);
    
    $content = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if (!$content || $code != 200) {
        http_response_code(502);
        die('Cannot fetch content');
    }
    
    if ($isM3U8) {
        echo rewriteM3U8($content, $url);
    } else {
        echo $content;
    }
}

// ========================================
// STREAM CHANNEL
// ========================================
function streamChannel($sourceUrl, $ext) {
    header('Content-Type: application/vnd.apple.mpegurl');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $sourceUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => 'Mozilla/5.0'
    ]);
    
    $m3u8 = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if (!$m3u8 || $code != 200) {
        http_response_code(502);
        echo "#EXTM3U\n# ERROR\n";
        exit;
    }
    
    echo rewriteM3U8($m3u8, $sourceUrl);
}

// ========================================
// REWRITE M3U8
// ========================================
function rewriteM3U8($content, $sourceUrl) {
    $parts = parse_url($sourceUrl);
    $base = $parts['scheme'] . '://' . $parts['host'];
    if (isset($parts['port']) && $parts['port'] != 80 && $parts['port'] != 443) {
        $base .= ':' . $parts['port'];
    }
    $dir = dirname($parts['path']);
    
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $proxy = $proto . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['SCRIPT_NAME'];
    
    $out = '';
    foreach (explode("\n", $content) as $line) {
        $line = trim($line);
        
        if (empty($line) || $line[0] === '#') {
            $out .= $line . "\n";
            continue;
        }
        
        if (strpos($line, 'http') === 0) {
            $full = $line;
        } elseif ($line[0] === '/') {
            $full = $base . $line;
        } else {
            $full = $base . $dir . '/' . $line;
        }
        
        $out .= $proxy . '?proxy_url=' . urlencode($full) . "\n";
    }
    
    return $out;
}
?>