<?php
/**
 * Xtream Codes API - player_api.php
 * Based on phpXtreamCodes reference implementation
 */

error_reporting(0);
ini_set('display_errors', 0);
set_time_limit(0);

// Load config
require_once __DIR__ . '/config.php';

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get parameters
$username = $_GET['username'] ?? $_POST['username'] ?? '';
$password = $_GET['password'] ?? $_POST['password'] ?? '';
$action = $_GET['action'] ?? '';

// Authenticate
$authenticated = false;
$user = null;

if (!empty($username) && !empty($password) && isset($users[$username])) {
    $user = $users[$username];
    if ($user['pass'] === $password || password_verify($password, $user['pass'])) {
        $authenticated = true;
    }
}

// Check expiration
$expired = false;
if ($authenticated && isset($user['exp_date']) && time() > $user['exp_date']) {
    $expired = true;
}

// Helper function
function outputJSON($data) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Build server URL
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$serverUrl = $server_config['base_url'] ?? ($protocol . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/'));

// Handle unauthenticated
if (!$authenticated) {
    outputJSON([
        'user_info' => [
            'username' => '',
            'password' => '',
            'message' => 'Invalid username or password',
            'auth' => 0,
            'status' => 'Disabled',
            'exp_date' => null,
            'is_trial' => '0',
            'active_cons' => '0',
            'created_at' => null,
            'max_connections' => '0',
            'allowed_output_formats' => []
        ],
        'server_info' => [
            'url' => $serverUrl,
            'port' => '80',
            'https_port' => '443',
            'server_protocol' => $protocol,
            'rtmp_port' => '1935',
            'timezone' => 'UTC',
            'timestamp_now' => time(),
            'time_now' => date('Y-m-d H:i:s')
        ]
    ]);
}

// Process action
switch ($action) {
    
    // Default - Get account info
    case '':
        outputJSON([
            'user_info' => [
                'username' => $username,
                'password' => $password,
                'message' => '',
                'auth' => $expired ? 0 : 1,
                'status' => $expired ? 'Expired' : 'Active',
                'exp_date' => isset($user['exp_date']) ? $user['exp_date'] : null,
                'is_trial' => '0',
                'active_cons' => '0',
                'created_at' => time() - 2592000,
                'max_connections' => (string)($user['max_conn'] ?? 1),
                'allowed_output_formats' => ['m3u8', 'ts']
            ],
            'server_info' => [
                'url' => $serverUrl,
                'port' => '80',
                'https_port' => '443',
                'server_protocol' => $protocol,
                'rtmp_port' => '1935',
                'timezone' => 'UTC',
                'timestamp_now' => time(),
                'time_now' => date('Y-m-d H:i:s')
            ]
        ]);
        break;
    
    // Get live categories
    case 'get_live_categories':
        $cats = [];
        foreach ($categories as $cat) {
            $cats[] = [
                'category_id' => (string)$cat['category_id'],
                'category_name' => $cat['category_name'],
                'parent_id' => (int)$cat['parent_id']
            ];
        }
        outputJSON($cats);
        break;
    
    // Get live streams
    case 'get_live_streams':
        $catId = $_GET['category_id'] ?? null;
        
        // Get allowed categories
        $allowed = [];
        foreach ($user['categories'] as $c) {
            if (isset($category_map[$c])) {
                $allowed[] = $category_map[$c]['id'];
            }
        }
        
        $streams = [];
        foreach ($channels as $ch) {
            if (!in_array($ch['category'], $allowed)) continue;
            if ($catId !== null && $ch['category'] != $catId) continue;
            
            $streams[] = [
                'num' => $ch['id'],
                'name' => $ch['name'],
                'stream_type' => 'live',
                'stream_id' => $ch['id'],
                'stream_icon' => $ch['logo'] ?? '',
                'epg_channel_id' => $ch['tvg_id'] ?? '',
                'added' => (string)(time() - 604800),
                'is_adult' => '0',
                'category_id' => (string)$ch['category'],
                'category_ids' => [(string)$ch['category']],
                'custom_sid' => '',
                'tv_archive' => 0,
                'direct_source' => '',
                'tv_archive_duration' => 0
            ];
        }
        outputJSON($streams);
        break;
    
    // Get VOD categories
    case 'get_vod_categories':
        outputJSON([]);
        break;
    
    // Get VOD streams
    case 'get_vod_streams':
        outputJSON([]);
        break;
    
    // Get VOD info
    case 'get_vod_info':
        outputJSON(['info' => [], 'movie_data' => []]);
        break;
    
    // Get series categories
    case 'get_series_categories':
        outputJSON([]);
        break;
    
    // Get series
    case 'get_series':
        outputJSON([]);
        break;
    
    // Get series info
    case 'get_series_info':
        outputJSON(['info' => [], 'episodes' => [], 'seasons' => []]);
        break;
    
    // Get short EPG
    case 'get_short_epg':
        outputJSON(['epg_listings' => []]);
        break;
    
    // Get simple data table
    case 'get_simple_data_table':
        outputJSON(['epg_listings' => []]);
        break;
    
    // XMLtv
    case 'xmltv.php':
        header('Content-Type: application/xml; charset=utf-8');
        echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        echo '<tv generator-info-name="FinnTV">' . "\n";
        echo '</tv>' . "\n";
        exit;
        break;
    
    default:
        outputJSON(['error' => 'Unknown action']);
}
?>