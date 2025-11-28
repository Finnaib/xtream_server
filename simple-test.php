<?php
// Ultra simple test - no dependencies
?>
<!DOCTYPE html>
<html>
<head>
    <title>Hosting Capabilities Test</title>
    <style>
        body {
            font-family: monospace;
            padding: 20px;
            background: #f0f0f0;
        }
        .box {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid #999;
        }
        .pass { border-color: #4CAF50; }
        .fail { border-color: #f44336; }
        h2 { margin: 0 0 10px 0; }
        code { 
            background: #eee; 
            padding: 2px 6px; 
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <h1>🔍 Hosting Capabilities Test</h1>
    <p>Testing what your server allows...</p>
    <hr>

    <!-- Test 1: Basic PHP -->
    <div class="box pass">
        <h2>✅ Test 1: Basic PHP</h2>
        <p>PHP Version: <code><?php echo PHP_VERSION; ?></code></p>
        <p>This test file is working!</p>
    </div>

    <!-- Test 2: allow_url_fopen -->
    <div class="box <?php echo ini_get('allow_url_fopen') ? 'pass' : 'fail'; ?>">
        <h2><?php echo ini_get('allow_url_fopen') ? '✅' : '❌'; ?> Test 2: allow_url_fopen</h2>
        <p>Status: <code><?php echo ini_get('allow_url_fopen') ? 'ENABLED' : 'DISABLED'; ?></code></p>
        <?php if (ini_get('allow_url_fopen')): ?>
            <p>file_get_contents() with URLs is allowed</p>
        <?php else: ?>
            <p>file_get_contents() with URLs is BLOCKED</p>
        <?php endif; ?>
    </div>

    <!-- Test 3: cURL -->
    <div class="box <?php echo function_exists('curl_init') ? 'pass' : 'fail'; ?>">
        <h2><?php echo function_exists('curl_init') ? '✅' : '❌'; ?> Test 3: cURL Extension</h2>
        <p>Status: <code><?php echo function_exists('curl_init') ? 'AVAILABLE' : 'NOT AVAILABLE'; ?></code></p>
        <?php if (function_exists('curl_init')): ?>
            <p>cURL functions can be used</p>
        <?php else: ?>
            <p>cURL is not installed or disabled</p>
        <?php endif; ?>
    </div>

    <!-- Test 4: fsockopen -->
    <div class="box <?php echo function_exists('fsockopen') ? 'pass' : 'fail'; ?>">
        <h2><?php echo function_exists('fsockopen') ? '✅' : '❌'; ?> Test 4: fsockopen</h2>
        <p>Status: <code><?php echo function_exists('fsockopen') ? 'AVAILABLE' : 'NOT AVAILABLE'; ?></code></p>
        <?php if (function_exists('fsockopen')): ?>
            <p>Raw socket connections are allowed</p>
        <?php else: ?>
            <p>Socket connections are disabled</p>
        <?php endif; ?>
    </div>

    <!-- Test 5: stream_socket_client -->
    <div class="box <?php echo function_exists('stream_socket_client') ? 'pass' : 'fail'; ?>">
        <h2><?php echo function_exists('stream_socket_client') ? '✅' : '❌'; ?> Test 5: stream_socket_client</h2>
        <p>Status: <code><?php echo function_exists('stream_socket_client') ? 'AVAILABLE' : 'NOT AVAILABLE'; ?></code></p>
        <?php if (function_exists('stream_socket_client')): ?>
            <p>Stream socket connections are allowed</p>
        <?php else: ?>
            <p>Stream sockets are disabled</p>
        <?php endif; ?>
    </div>

    <hr>

    <!-- Test 6: Actual Connection Test -->
    <div class="box">
        <h2>🔄 Test 6: Real Connection Test</h2>
        <p>Trying to fetch: <code>http://www.google.com/robots.txt</code></p>
        
        <?php
        $testUrl = "http://www.google.com/robots.txt";
        $success = false;
        $method = "NONE";
        $result = "";

        // Try file_get_contents
        if (ini_get('allow_url_fopen')) {
            $ctx = @stream_context_create([
                'http' => [
                    'timeout' => 5,
                    'method' => 'GET'
                ]
            ]);
            $result = @file_get_contents($testUrl, false, $ctx);
            if ($result !== false) {
                $success = true;
                $method = "file_get_contents()";
            }
        }

        // Try cURL if previous failed
        if (!$success && function_exists('curl_init')) {
            $ch = @curl_init();
            @curl_setopt($ch, CURLOPT_URL, $testUrl);
            @curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            @curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $result = @curl_exec($ch);
            @curl_close($ch);
            if ($result !== false && strlen($result) > 0) {
                $success = true;
                $method = "cURL";
            }
        }

        // Try fsockopen if previous failed
        if (!$success && function_exists('fsockopen')) {
            $fp = @fsockopen('www.google.com', 80, $errno, $errstr, 5);
            if ($fp) {
                $out = "GET /robots.txt HTTP/1.1\r\n";
                $out .= "Host: www.google.com\r\n";
                $out .= "Connection: Close\r\n\r\n";
                fwrite($fp, $out);
                $result = '';
                while (!feof($fp)) {
                    $result .= fgets($fp, 128);
                }
                fclose($fp);
                if (strlen($result) > 0) {
                    $success = true;
                    $method = "fsockopen()";
                }
            }
        }
        ?>

        <?php if ($success): ?>
            <p style="color: #4CAF50;">✅ <strong>SUCCESS!</strong></p>
            <p>Method that worked: <code><?php echo $method; ?></code></p>
            <p>Got <?php echo strlen($result); ?> bytes</p>
            <p>First 100 characters:</p>
            <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;"><?php echo htmlspecialchars(substr($result, 0, 100)); ?></pre>
        <?php else: ?>
            <p style="color: #f44336;">❌ <strong>FAILED!</strong></p>
            <p>Could not connect to external URLs using ANY method</p>
            <p><strong>This means your hosting BLOCKS all proxy functionality!</strong></p>
        <?php endif; ?>
    </div>

    <hr>

    <!-- Summary -->
    <div class="box" style="border-color: #2196F3;">
        <h2>📊 Summary & Recommendations</h2>
        
        <?php
        $canProxy = ini_get('allow_url_fopen') || function_exists('curl_init') || function_exists('fsockopen');
        ?>
        
        <?php if ($success): ?>
            <p style="color: #4CAF50; font-weight: bold;">✅ YOUR HOSTING CAN PROXY STREAMS!</p>
            <p>Method to use: <code><?php echo $method; ?></code></p>
            <p><strong>Next step:</strong> I will create a working live.php using this method.</p>
        <?php elseif ($canProxy): ?>
            <p style="color: #ff9800; font-weight: bold;">⚠️ FUNCTIONS AVAILABLE BUT CONNECTION FAILED</p>
            <p>Your hosting may have firewall rules blocking external connections.</p>
            <p><strong>Try:</strong> Contact support to enable outbound HTTP connections.</p>
        <?php else: ?>
            <p style="color: #f44336; font-weight: bold;">❌ YOUR HOSTING CANNOT PROXY</p>
            <p>All proxy methods are disabled or blocked.</p>
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Switch to better hosting (InfinityFree, 000webhost, or paid hosting)</li>
                <li>Use Cloudflare Workers (free tier supports proxying)</li>
                <li>Use the JavaScript CORS proxy workaround I provided</li>
            </ul>
        <?php endif; ?>
    </div>

    <hr>
    <p style="text-align: center; color: #999;">
        <small>Copy ALL results above and send to developer</small>
    </p>

</body>
</html>