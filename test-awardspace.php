<?php
/**
 * AwardSpace Proxy Test
 * Upload this to your AwardSpace hosting
 */

header('Content-Type: text/html; charset=utf-8');
error_reporting(0);
?>
<!DOCTYPE html>
<html>
<head>
    <title>AwardSpace Proxy Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { border-left: 5px solid #4CAF50; }
        .fail { border-left: 5px solid #f44336; }
        .warning { border-left: 5px solid #ff9800; }
        h2 { margin-top: 0; }
        code { background: #eee; padding: 3px 6px; border-radius: 3px; font-size: 14px; }
        pre { background: #f9f9f9; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 AwardSpace Proxy Capability Test</h1>

    <!-- Server Info -->
    <div class="box">
        <h2>📊 Server Information</h2>
        <p><strong>PHP Version:</strong> <code><?php echo PHP_VERSION; ?></code></p>
        <p><strong>Server:</strong> <code><?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?></code></p>
        <p><strong>Host:</strong> <code><?php echo $_SERVER['HTTP_HOST'] ?? 'Unknown'; ?></code></p>
    </div>

    <!-- Test 1: PHP Functions -->
    <div class="box <?php echo (ini_get('allow_url_fopen') && function_exists('curl_init')) ? 'success' : 'fail'; ?>">
        <h2>Test 1: Required PHP Functions</h2>
        <p>allow_url_fopen: <code><?php echo ini_get('allow_url_fopen') ? '✅ ENABLED' : '❌ DISABLED'; ?></code></p>
        <p>cURL Extension: <code><?php echo function_exists('curl_init') ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'; ?></code></p>
        <p>fsockopen: <code><?php echo function_exists('fsockopen') ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'; ?></code></p>
    </div>

    <!-- Test 2: External Connection with cURL -->
    <div class="box">
        <h2>Test 2: cURL External Connection</h2>
        <?php
        $curlWorks = false;
        $curlError = '';
        $curlData = '';
        
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => 'http://www.google.com/robots.txt',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_USERAGENT => 'Mozilla/5.0'
            ]);
            
            $curlData = @curl_exec($ch);
            $curlError = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($curlData !== false && strlen($curlData) > 0 && $httpCode == 200) {
                $curlWorks = true;
            }
        }
        ?>
        
        <?php if ($curlWorks): ?>
            <p style="color: #4CAF50; font-weight: bold;">✅ SUCCESS! cURL can connect to external URLs</p>
            <p>Got <strong><?php echo strlen($curlData); ?> bytes</strong> from Google</p>
            <details>
                <summary>Show response preview</summary>
                <pre><?php echo htmlspecialchars(substr($curlData, 0, 200)); ?>...</pre>
            </details>
        <?php else: ?>
            <p style="color: #f44336; font-weight: bold;">❌ FAILED! cURL cannot connect</p>
            <p>Error: <code><?php echo htmlspecialchars($curlError); ?></code></p>
        <?php endif; ?>
    </div>

    <!-- Test 3: file_get_contents -->
    <div class="box">
        <h2>Test 3: file_get_contents External Connection</h2>
        <?php
        $fgcWorks = false;
        $fgcData = '';
        
        if (ini_get('allow_url_fopen')) {
            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'method' => 'GET',
                    'header' => "User-Agent: Mozilla/5.0\r\n"
                ]
            ]);
            
            $fgcData = @file_get_contents('http://www.google.com/robots.txt', false, $ctx);
            
            if ($fgcData !== false && strlen($fgcData) > 0) {
                $fgcWorks = true;
            }
        }
        ?>
        
        <?php if ($fgcWorks): ?>
            <p style="color: #4CAF50; font-weight: bold;">✅ SUCCESS! file_get_contents can connect</p>
            <p>Got <strong><?php echo strlen($fgcData); ?> bytes</strong> from Google</p>
        <?php else: ?>
            <p style="color: #f44336; font-weight: bold;">❌ FAILED! file_get_contents cannot connect</p>
        <?php endif; ?>
    </div>

    <!-- Test 4: IPTV Stream Test -->
    <div class="box">
        <h2>Test 4: ACTUAL IPTV Stream Test</h2>
        <p>Testing: <code>http://66.102.120.18:8000/play/a008/index.m3u8</code></p>
        
        <?php
        $streamWorks = false;
        $streamMethod = '';
        $streamData = '';
        $streamUrl = 'http://66.102.120.18:8000/play/a008/index.m3u8';
        
        // Try cURL first
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $streamUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_USERAGENT => 'VLC/3.0.0'
            ]);
            
            $streamData = @curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($streamData !== false && strlen($streamData) > 0) {
                $streamWorks = true;
                $streamMethod = 'cURL';
            }
        }
        
        // Try file_get_contents if cURL failed
        if (!$streamWorks && ini_get('allow_url_fopen')) {
            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'method' => 'GET',
                    'header' => "User-Agent: VLC/3.0.0\r\n"
                ]
            ]);
            
            $streamData = @file_get_contents($streamUrl, false, $ctx);
            
            if ($streamData !== false && strlen($streamData) > 0) {
                $streamWorks = true;
                $streamMethod = 'file_get_contents()';
            }
        }
        ?>
        
        <?php if ($streamWorks): ?>
            <p style="color: #4CAF50; font-weight: bold; font-size: 18px;">🎉 SUCCESS! YOUR IPTV STREAM WORKS!</p>
            <p>Method: <code><?php echo $streamMethod; ?></code></p>
            <p>Got <strong><?php echo strlen($streamData); ?> bytes</strong></p>
            <details>
                <summary>Show M3U8 content</summary>
                <pre><?php echo htmlspecialchars($streamData); ?></pre>
            </details>
            <p style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 15px;">
                <strong>✅ YOUR AWARDSPACE HOSTING CAN PROXY STREAMS!</strong><br>
                I will now create a working live.php for you.
            </p>
        <?php else: ?>
            <p style="color: #f44336; font-weight: bold;">❌ Cannot connect to IPTV stream</p>
            <p>Your AwardSpace hosting may have firewall restrictions.</p>
        <?php endif; ?>
    </div>

    <!-- Summary -->
    <div class="box <?php echo ($curlWorks || $fgcWorks) ? 'success' : 'fail'; ?>">
        <h2>📊 Final Summary</h2>
        
        <?php if ($streamWorks): ?>
            <h3 style="color: #4CAF50;">✅ EXCELLENT NEWS!</h3>
            <p><strong>Your AwardSpace hosting CAN proxy IPTV streams!</strong></p>
            <p>Best method to use: <code><?php echo $streamMethod; ?></code></p>
            <hr>
            <h4>Next Steps:</h4>
            <ol>
                <li>Copy these test results</li>
                <li>Send them to your developer</li>
                <li>They will create a working <code>live.php</code> using <strong><?php echo $streamMethod; ?></strong></li>
            </ol>
        <?php elseif ($curlWorks || $fgcWorks): ?>
            <h3 style="color: #ff9800;">⚠️ PARTIAL SUCCESS</h3>
            <p>External connections work, but IPTV stream test failed.</p>
            <p>Possible reasons:</p>
            <ul>
                <li>The stream server is down</li>
                <li>The stream URL is incorrect</li>
                <li>Firewall blocks specific ports (8000)</li>
            </ul>
        <?php else: ?>
            <h3 style="color: #f44336;">❌ HOSTING RESTRICTIONS</h3>
            <p>AwardSpace blocks ALL external connections from PHP.</p>
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Contact AwardSpace support to enable outbound connections</li>
                <li>Upgrade to paid plan (they usually allow it)</li>
                <li>Use Cloudflare Workers instead</li>
            </ul>
        <?php endif; ?>
    </div>

</body>
</html>