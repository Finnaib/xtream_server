<?php
/**
 * Proxy Method Diagnostic Tool
 * Upload this as test-proxy.php and visit it in your browser
 */

header('Content-Type: text/html; charset=utf-8');

echo "<h1>🔍 Proxy Capability Test</h1>";
echo "<p>Testing what your hosting allows...</p><hr>";

$testUrl = "http://66.102.120.18:8000/play/a008/index.m3u8";

// ===========================
// TEST 1: allow_url_fopen
// ===========================
echo "<h2>Test 1: allow_url_fopen</h2>";
if (ini_get('allow_url_fopen')) {
    echo "✅ <strong>ENABLED</strong> - file_get_contents() may work<br>";
    
    echo "Testing file_get_contents()... ";
    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 5,
            'header' => "User-Agent: TestBot\r\n"
        ]
    ]);
    
    $result = @file_get_contents($testUrl, false, $ctx);
    if ($result !== false) {
        echo "✅ <strong>SUCCESS!</strong> Got " . strlen($result) . " bytes<br>";
    } else {
        echo "❌ <strong>FAILED</strong> - Blocked by hosting<br>";
    }
} else {
    echo "❌ <strong>DISABLED</strong> - file_get_contents() won't work<br>";
}

echo "<hr>";

// ===========================
// TEST 2: cURL
// ===========================
echo "<h2>Test 2: cURL Extension</h2>";
if (function_exists('curl_init')) {
    echo "✅ <strong>ENABLED</strong> - cURL available<br>";
    
    echo "Testing cURL request... ";
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $testUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT => 'TestBot',
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    $result = @curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($result !== false && $httpCode == 200) {
        echo "✅ <strong>SUCCESS!</strong> Got " . strlen($result) . " bytes (HTTP {$httpCode})<br>";
    } else {
        echo "❌ <strong>FAILED</strong> - Error: {$error} (HTTP {$httpCode})<br>";
    }
} else {
    echo "❌ <strong>DISABLED</strong> - cURL not available<br>";
}

echo "<hr>";

// ===========================
// TEST 3: fsockopen
// ===========================
echo "<h2>Test 3: fsockopen (Raw Sockets)</h2>";
if (function_exists('fsockopen')) {
    echo "✅ <strong>ENABLED</strong> - fsockopen available<br>";
    
    echo "Testing fsockopen request... ";
    $fp = @fsockopen('66.102.120.18', 8000, $errno, $errstr, 5);
    if ($fp) {
        $request = "GET /play/a008/index.m3u8 HTTP/1.1\r\n";
        $request .= "Host: 66.102.120.18:8000\r\n";
        $request .= "User-Agent: TestBot\r\n";
        $request .= "Connection: close\r\n\r\n";
        
        fwrite($fp, $request);
        $response = '';
        while (!feof($fp)) {
            $response .= fgets($fp, 128);
        }
        fclose($fp);
        
        if (strpos($response, '200 OK') !== false) {
            echo "✅ <strong>SUCCESS!</strong> Got " . strlen($response) . " bytes<br>";
        } else {
            echo "⚠️ <strong>PARTIAL</strong> - Connected but got: " . substr($response, 0, 100) . "...<br>";
        }
    } else {
        echo "❌ <strong>FAILED</strong> - Cannot connect: {$errstr} ({$errno})<br>";
    }
} else {
    echo "❌ <strong>DISABLED</strong> - fsockopen not available<br>";
}

echo "<hr>";

// ===========================
// TEST 4: PHP Stream Sockets
// ===========================
echo "<h2>Test 4: stream_socket_client</h2>";
if (function_exists('stream_socket_client')) {
    echo "✅ <strong>ENABLED</strong> - stream_socket_client available<br>";
    
    echo "Testing stream socket... ";
    $socket = @stream_socket_client('tcp://66.102.120.18:8000', $errno, $errstr, 5);
    if ($socket) {
        $request = "GET /play/a008/index.m3u8 HTTP/1.1\r\n";
        $request .= "Host: 66.102.120.18:8000\r\n";
        $request .= "Connection: close\r\n\r\n";
        
        fwrite($socket, $request);
        $response = stream_get_contents($socket);
        fclose($socket);
        
        if (strlen($response) > 0) {
            echo "✅ <strong>SUCCESS!</strong> Got " . strlen($response) . " bytes<br>";
        } else {
            echo "❌ <strong>FAILED</strong> - Empty response<br>";
        }
    } else {
        echo "❌ <strong>FAILED</strong> - Cannot connect: {$errstr} ({$errno})<br>";
    }
} else {
    echo "❌ <strong>DISABLED</strong> - stream_socket_client not available<br>";
}

echo "<hr>";

// ===========================
// SUMMARY
// ===========================
echo "<h2>📊 Summary</h2>";
echo "<p><strong>If ALL tests failed:</strong> Your hosting blocks ALL proxy methods. You need different hosting.</p>";
echo "<p><strong>If ANY test succeeded:</strong> I'll create a working live.php using that method!</p>";
echo "<hr>";
echo "<p>Copy these results and share them with me.</p>";
?>