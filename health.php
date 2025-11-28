<?php
// Simple health/diagnostic endpoint for local testing
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

$totalChannels = isset($channels) ? count($channels) : 0;
$totalUsers = isset($users) ? count($users) : 0;
$categoriesCount = isset($categories) ? count($categories) : 0;

echo json_encode([
    'status' => 'ok',
    'base_url' => $server_config['base_url'] ?? null,
    'domain' => $server_config['domain'] ?? null,
    'total_channels' => $totalChannels,
    'total_users' => $totalUsers,
    'categories' => $categoriesCount
], JSON_PRETTY_PRINT);

?>
