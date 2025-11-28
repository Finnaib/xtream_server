<?php
// Proxy endpoint: fetches the channel's direct URL and streams it through the server.
// Usage (PATH_INFO): /proxy.php/username/password/STREAMID.m3u8
// Usage (query): proxy.php?username=USER&password=PASS&id=STREAMID

require_once __DIR__ . '/config.php';

// Lightweight request logging for debugging clients (e.g., IPTV Smarters Pro)
function log_request_proxy($note = '') {
    $logDir = __DIR__ . '/data';
    if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
    $logFile = $logDir . '/requests.log';
    $entry = [
        'time' => time(),
        'remote' => $_SERVER['REMOTE_ADDR'] ?? '',
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
        'uri' => $_SERVER['REQUEST_URI'] ?? '',
        'note' => $note,
        'headers' => [],
        'body' => null
    ];
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) { $entry['headers'][$k] = $v; }
    }
    $body = @file_get_contents('php://input');
    if ($body) $entry['body'] = (strlen($body) > 2000) ? substr($body,0,2000) . '...' : $body;
    @file_put_contents($logFile, json_encode($entry) . "\n", FILE_APPEND | LOCK_EX);
}
// log this proxy request
log_request_proxy('proxy');

// Helper to get credentials like other endpoints
function getRequestCredentials() {
    $u = '';
    $p = '';
    $sources = array_merge($_GET ?? [], $_POST ?? []);
    foreach (['username','user','u'] as $key) { if (isset($sources[$key]) && $sources[$key] !== '') { $u = $sources[$key]; break; } }
    foreach (['password','pass','p'] as $key) { if (isset($sources[$key]) && $sources[$key] !== '') { $p = $sources[$key]; break; } }
    if (empty($u) && isset($_SERVER['PHP_AUTH_USER'])) $u = $_SERVER['PHP_AUTH_USER'];
    if (empty($p) && isset($_SERVER['PHP_AUTH_PW'])) $p = $_SERVER['PHP_AUTH_PW'];
    if ((empty($u) || empty($p)) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
        if (stripos($auth, 'basic ') === 0) {
            $decoded = base64_decode(substr($auth, 6));
            if ($decoded !== false) {
                $parts = explode(':', $decoded, 2);
                if (count($parts) == 2) { if (empty($u)) $u = $parts[0]; if (empty($p)) $p = $parts[1]; }
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

// Parse stream id from PATH_INFO or query
$streamId = 0;
if (isset($_SERVER['PATH_INFO']) && preg_match('#^/([^/]+)/([^/]+)/(\d+)\.(ts|m3u8)$#', $_SERVER['PATH_INFO'], $m)) {
    $username = $m[1];
    $password = $m[2];
    $streamId = (int)$m[3];
} else if (preg_match('#/proxy.php/([^/]+)/([^/]+)/(\d+)\.(ts|m3u8)#', $_SERVER['REQUEST_URI'], $m2)) {
    $username = $m2[1];
    $password = $m2[2];
    $streamId = (int)$m2[3];
} else {
    list($username, $password) = getRequestCredentials();
    $streamId = (int)($_GET['id'] ?? $_GET['stream'] ?? 0);
}

if (empty($username) || empty($password) || $streamId == 0) {
    http_response_code(400);
    echo "Missing parameters\n";
    exit;
}

// Authenticate (support bcrypt + plain)
function authenticateUserLocal($username, $password, $users) {
    if (!isset($users[$username])) return false;
    $user = $users[$username];
    if (is_string($user['pass']) && password_verify($password, $user['pass'])) return $user;
    if ($password === $user['pass']) return $user;
    return false;
}

$user = authenticateUserLocal($username, $password, $users);
if (!$user) {
    http_response_code(403);
    echo "Auth failed\n";
    exit;
}

// Find channel
$channel = null;
foreach ($channels as $ch) { if ($ch['id'] == $streamId) { $channel = $ch; break; } }
if (!$channel) { http_response_code(404); echo "Stream not found\n"; exit; }

// Check access
$userCategoryIds = [];
foreach ($user['categories'] as $cat) { if (isset($category_map[$cat])) $userCategoryIds[] = $category_map[$cat]['id']; }
if (!in_array($channel['category'], $userCategoryIds)) { http_response_code(403); echo "Access denied\n"; exit; }

$remote = $channel['url'];

// Prepare cURL
// Use cURL when available, otherwise fall back to PHP streams
$use_curl = function_exists('curl_init');
$isHead = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD';

if ($isHead) {
    if ($use_curl) {
        $ch = curl_init($remote);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 0);
        curl_setopt($ch, CURLOPT_BUFFERSIZE, 8192);
        curl_setopt($ch, CURLOPT_NOPROGRESS, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        if (!empty($_SERVER['HTTP_RANGE'])) curl_setopt($ch, CURLOPT_HTTPHEADER, ['Range: ' . $_SERVER['HTTP_RANGE']]);
        $resp = curl_exec($ch);
        if (curl_errno($ch)) { http_response_code(502); echo "Upstream error\n"; }
        else {
            $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $header_text = substr($resp, 0, $header_size);
            $lines = explode("\r\n", $header_text);
            foreach ($lines as $line) {
                if (stripos($line, 'Content-Type:') === 0 || stripos($line, 'Content-Length:') === 0 || stripos($line, 'Accept-Ranges:') === 0 || stripos($line, 'Content-Range:') === 0) {
                    header($line);
                }
            }
        }
        curl_close($ch);
    } else {
        // fallback: perform a HEAD via stream context or get_headers
        $headers = @get_headers($remote, 1);
        if ($headers !== false) {
            // get_headers can return an indexed array when multiple headers with same name
            if (isset($headers['Content-Type'])) header('Content-Type: ' . (is_array($headers['Content-Type']) ? end($headers['Content-Type']) : $headers['Content-Type']));
            if (isset($headers['Content-Length'])) header('Content-Length: ' . (is_array($headers['Content-Length']) ? end($headers['Content-Length']) : $headers['Content-Length']));
            if (isset($headers['Accept-Ranges'])) header('Accept-Ranges: ' . (is_array($headers['Accept-Ranges']) ? end($headers['Accept-Ranges']) : $headers['Accept-Ranges']));
            if (isset($headers['Content-Range'])) header('Content-Range: ' . (is_array($headers['Content-Range']) ? end($headers['Content-Range']) : $headers['Content-Range']));
        } else {
            // cannot HEAD upstream, fallback to redirect
            header('Location: ' . $remote);
        }
    }
    exit;
}

// Stream the response
set_time_limit(0);
ob_implicit_flush(true);

if ($use_curl) {
    $ch = curl_init($remote);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 0);
    curl_setopt($ch, CURLOPT_BUFFERSIZE, 8192);
    curl_setopt($ch, CURLOPT_NOPROGRESS, true);
    if (!empty($_SERVER['HTTP_RANGE'])) curl_setopt($ch, CURLOPT_HTTPHEADER, ['Range: ' . $_SERVER['HTTP_RANGE']]);

    // Header function to forward some headers
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) {
        $len = strlen($header);
        $parts = explode(':', $header, 2);
        if (count($parts) == 2) {
            $name = trim($parts[0]);
            $value = trim($parts[1]);
            $lower = strtolower($name);
            if (in_array($lower, ['content-type','content-length','accept-ranges','content-range','cache-control'])) {
                header("$name: $value");
            }
        }
        return $len;
    });

    // Write function to flush chunks
    curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($curl, $data) {
        echo $data;
        if (function_exists('ob_flush')) { @ob_flush(); }
        flush();
        return strlen($data);
    });

    curl_exec($ch);
    if (curl_errno($ch)) {
        http_response_code(502);
        echo "Upstream error: " . curl_error($ch);
    }
    curl_close($ch);
    exit;
} else {
    // Fallback to PHP streams (fopen)
    $opts = [ 'http' => [ 'method' => 'GET', 'header' => "User-Agent: Mozilla/5.0\r\n" ], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false] ];
    if (!empty($_SERVER['HTTP_RANGE'])) $opts['http']['header'] .= 'Range: ' . $_SERVER['HTTP_RANGE'] . "\r\n";
    $context = stream_context_create($opts);
    $fp = @fopen($remote, 'rb', false, $context);
    if (!$fp) { http_response_code(502); echo "Upstream fetch failed\n"; exit; }
    // forward headers from $http_response_header if present
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $h) {
            if (stripos($h, 'Content-Type:') === 0 || stripos($h, 'Content-Length:') === 0 || stripos($h, 'Accept-Ranges:') === 0 || stripos($h, 'Content-Range:') === 0 || stripos($h, 'Cache-Control:') === 0) {
                header($h);
            }
        }
    }
    // stream to client
    while (!feof($fp)) { echo fread($fp, 8192); flush(); }
    fclose($fp);
    exit;
}
