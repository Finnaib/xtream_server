<?php
/**
 * M3U Playlist Generator
 * Based on phpXtreamCodes reference
 * 
 * URL: http://domain/get.php?username=X&password=Y&type=m3u_plus&output=m3u8
 */

error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/config.php';

// Get params
$username = $_GET['username'] ?? '';
$password = $_GET['password'] ?? '';
$type = $_GET['type'] ?? 'm3u_plus';
$output = $_GET['output'] ?? 'm3u8';

// Auth
if (empty($username) || !isset($users[$username])) {
    die("#EXTM3U\n#EXTINF:-1,ERROR\nhttp://\n");
}

$user = $users[$username];
if ($user['pass'] !== $password && !password_verify($password, $user['pass'])) {
    die("#EXTM3U\n#EXTINF:-1,Invalid credentials\nhttp://\n");
}

if (isset($user['exp_date']) && time() > $user['exp_date']) {
    die("#EXTM3U\n#EXTINF:-1,Expired\nhttp://\n");
}

// Headers
$filename = "playlist_{$username}.m3u8";
header('Content-Type: audio/x-mpegurl; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

// Base URL
$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base = $server_config['base_url'] ?? ($proto . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/'));

// Output
echo "#EXTM3U\n";

// Get allowed cats
$allowed = [];
foreach ($user['categories'] as $c) {
    if (isset($category_map[$c])) {
        $allowed[] = $category_map[$c]['id'];
    }
}

// Group by category
$grouped = [];
foreach ($channels as $ch) {
    if (!in_array($ch['category'], $allowed)) continue;
    $grouped[$ch['category']][] = $ch;
}

// Output channels
foreach ($grouped as $catId => $chans) {
    $catName = 'Unknown';
    foreach ($category_map as $n => $i) {
        if ($i['id'] == $catId) {
            $catName = ucfirst($n);
            break;
        }
    }
    
    foreach ($chans as $ch) {
        $url = "{$base}/live/{$username}/{$password}/{$ch['id']}.{$output}";
        
        $extinf = "#EXTINF:-1";
        if (!empty($ch['tvg_id'])) $extinf .= " tvg-id=\"{$ch['tvg_id']}\"";
        if (!empty($ch['logo'])) $extinf .= " tvg-logo=\"{$ch['logo']}\"";
        $extinf .= " group-title=\"{$catName}\"";
        $extinf .= ",{$ch['name']}";
        
        echo $extinf . "\n";
        echo $url . "\n";
    }
}
?>