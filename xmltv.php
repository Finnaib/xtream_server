<?php
/**
 * XMLTV EPG Export
 * Modern feature for EPG integration with apps
 * URL: xmltv.php?username=XXX&password=XXX
 */

require_once 'config.php';

header('Content-Type: application/xml; charset=utf-8');
header('Content-Disposition: attachment; filename="epg.xml"');

$username = $_GET['username'] ?? '';
$password = $_GET['password'] ?? '';

// Authenticate
function authenticateUser($username, $password, $users) {
    if (!isset($users[$username])) return false;
    $user = $users[$username];
    if (strlen($user['pass']) === 60 && substr($user['pass'], 0, 4) === '$2y$') {
        if (password_verify($password, $user['pass'])) return $user;
    }
    if ($password === $user['pass']) return $user;
    return false;
}

$user = authenticateUser($username, $password, $users);

if (!$user) {
    echo '<?xml version="1.0" encoding="UTF-8"?>';
    echo '<tv></tv>';
    exit;
}

// Get user's allowed categories
$userCategoryIds = [];
foreach ($user['categories'] as $catName) {
    if (isset($category_map[$catName])) {
        $userCategoryIds[] = $category_map[$catName]['id'];
    }
}

// Start XMLTV document
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<!DOCTYPE tv SYSTEM "xmltv.dtd">' . "\n";
echo '<tv generator-info-name="FinnTV EPG Generator">' . "\n";

// Output channel definitions
foreach ($channels as $ch) {
    if (!in_array($ch['category'], $userCategoryIds)) continue;
    
    $channelId = $ch['tvg_id'] ?: 'channel_' . $ch['id'];
    $channelName = htmlspecialchars($ch['name'], ENT_XML1);
    $logo = htmlspecialchars($ch['logo'] ?? '', ENT_XML1);
    
    echo '  <channel id="' . $channelId . '">' . "\n";
    echo '    <display-name>' . $channelName . '</display-name>' . "\n";
    if (!empty($logo)) {
        echo '    <icon src="' . $logo . '" />' . "\n";
    }
    echo '  </channel>' . "\n";
}

// Generate program listings (7 days)
$now = time();
$startDay = strtotime('today', $now);

foreach ($channels as $ch) {
    if (!in_array($ch['category'], $userCategoryIds)) continue;
    
    $channelId = $ch['tvg_id'] ?: 'channel_' . $ch['id'];
    
    // Generate programs for 7 days
    for ($day = 0; $day < 7; $day++) {
        for ($hour = 0; $hour < 24; $hour += 2) { // 2-hour blocks
            $start = $startDay + ($day * 86400) + ($hour * 3600);
            $end = $start + 7200; // 2 hours
            
            $startStr = date('YmdHis O', $start);
            $endStr = date('YmdHis O', $end);
            
            $title = htmlspecialchars($ch['name'] . ' Program ' . date('H:i', $start), ENT_XML1);
            $desc = htmlspecialchars('Program airing on ' . date('l, F j, Y \a\t H:i', $start), ENT_XML1);
            
            echo '  <programme start="' . $startStr . '" stop="' . $endStr . '" channel="' . $channelId . '">' . "\n";
            echo '    <title lang="en">' . $title . '</title>' . "\n";
            echo '    <desc lang="en">' . $desc . '</desc>' . "\n";
            echo '    <category lang="en">Entertainment</category>' . "\n";
            echo '  </programme>' . "\n";
        }
    }
}

echo '</tv>';
?>