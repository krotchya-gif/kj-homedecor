<?php
// ============================================================
// Upload Handler — link.kjhomedecor.com
// Menerima file dari Next.js API upload (/api/upload → proxy)
// Lokasi: public_html/link/upload.php
// ============================================================

// CORS biar bisa dipanggil dari kjhomedecor.com
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Validasi folder (11 folder = sama dengan FolderSchema di Next.js route)
$allowed_folders = ['products','banners','portfolio','evidence','documents','videos','order_progress','returns','qc','install','survey'];
$folder = isset($_POST['folder']) ? $_POST['folder'] : '';

if (!in_array($folder, $allowed_folders)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid folder']);
    exit;
}

// Validasi file
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
$original_name = $file['name'];
$ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));

// Validasi tipe
$allowed_mimes = [
    'image/jpeg' => ['jpg','jpeg'],
    'image/png' => ['png'],
    'image/webp' => ['webp'],
    'application/pdf' => ['pdf'],
    'video/mp4' => ['mp4'],
    'video/webm' => ['webm'],
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detected_mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

// Folder policy must match the Next.js proxy: document/video content must not
// be stored in image-only folders even when the client spoofs its MIME header.
$folder_mimes = [
    'products' => ['image/jpeg','image/png','image/webp'],
    'banners' => ['image/jpeg','image/png','image/webp'],
    'portfolio' => ['image/jpeg','image/png','image/webp'],
    'evidence' => ['image/jpeg','image/png','image/webp','application/pdf'],
    'documents' => ['image/jpeg','image/png','image/webp','application/pdf'],
    'videos' => ['video/mp4','video/webm'],
    'order_progress' => ['image/jpeg','image/png','image/webp'],
    'returns' => ['image/jpeg','image/png','image/webp'],
    'qc' => ['image/jpeg','image/png','image/webp'],
    'install' => ['image/jpeg','image/png','image/webp'],
    'survey' => ['image/jpeg','image/png','image/webp'],
];

if (!in_array($detected_mime, $folder_mimes[$folder], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'File type is not allowed in this folder']);
    exit;
}

$valid_ext = false;
$valid_mime = false;
foreach ($allowed_mimes as $mime => $exts) {
    if (in_array($ext, $exts)) $valid_ext = true;
    if ($detected_mime === $mime) $valid_mime = true;
}

if (!$valid_ext || !$valid_mime) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

// Batas ukuran per folder
$max_sizes = [
    'products' => 5 * 1024 * 1024,
    'banners' => 5 * 1024 * 1024,
    'portfolio' => 2 * 1024 * 1024,
    'evidence' => 2 * 1024 * 1024,
    'documents' => 5 * 1024 * 1024,
    'videos' => 100 * 1024 * 1024,
    'order_progress' => 2 * 1024 * 1024,
    'returns' => 2 * 1024 * 1024,
    'qc' => 2 * 1024 * 1024,
    'install' => 2 * 1024 * 1024,
    'survey' => 5 * 1024 * 1024,
];

if ($file['size'] > $max_sizes[$folder]) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large']);
    exit;
}

// Magic bytes validation
$magic_bytes = [
    'image/jpeg' => ["\xFF\xD8\xFF"],
    'image/png' => ["\x89\x50\x4E\x47"],
    'image/webp' => ["\x52\x49\x46\x46"],
    'application/pdf' => ["\x25\x50\x44\x46"],
    'video/mp4' => ["\x00\x00\x00\x18\x66\x74\x79\x70"],
    'video/webm' => ["\x1A\x45\xDF\xA3"],
];

$fp = fopen($file['tmp_name'], 'rb');
$header = fread($fp, 16);
fclose($fp);

if (isset($magic_bytes[$detected_mime])) {
    // MP4's first box size is variable; `ftyp` is the stable signature.
    $match = $detected_mime === 'video/mp4'
        ? substr($header, 4, 4) === 'ftyp'
        : false;
    if ($detected_mime !== 'video/mp4') foreach ($magic_bytes[$detected_mime] as $magic) {
        if (strpos($header, $magic) === 0) {
            $match = true;
            break;
        }
    }
    if (!$match) {
        http_response_code(400);
        echo json_encode(['error' => 'File content mismatch']);
        exit;
    }
}

// Buat folder kalo belum ada
$upload_dir = __DIR__ . '/uploads/' . $folder;
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Nama file unik
$timestamp = round(microtime(true) * 1000);
$random = substr(str_shuffle('abcdefghijklmnopqrstuvwxyz0123456789'), 0, 6);
$filename = $timestamp . '-' . $random . '.' . $ext;
$filepath = $upload_dir . '/' . $filename;

// Pindahin file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit;
}

// URL publik
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST']; // link.kjhomedecor.com
$url = $protocol . '://' . $host . '/uploads/' . $folder . '/' . $filename;

echo json_encode([
    'success' => true,
    'url' => $url,
    'filename' => $filename,
    'size' => $file['size'],
    'type' => $detected_mime,
]);
