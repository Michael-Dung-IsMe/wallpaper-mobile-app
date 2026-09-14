package com.wallpaperapp

import android.app.WallpaperManager
import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class WallpaperModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WallpaperModule"

    /**
     * Mở InputStream từ đường dẫn URL mạng (HTTP/HTTPS) hoặc tệp cục bộ
     */
    @Throws(IOException::class)
    private fun openInputStream(source: String): InputStream {
        return if (source.startsWith("http://") || source.startsWith("https://")) {
            val url = URL(source)
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 20000
            conn.readTimeout = 30000
            conn.instanceFollowRedirects = true
            conn.setRequestProperty("User-Agent", "WallpaperHD-Mobile/1.0")
            conn.requestMethod = "GET"
            conn.connect()
            val code = conn.responseCode
            if (code !in 200..299) {
                throw IOException("Tải ảnh thất bại: HTTP $code")
            }
            conn.inputStream
        } else {
            val file = File(source)
            if (!file.exists() || file.length() == 0L) {
                throw IOException("Tệp không tồn tại hoặc rỗng: $source")
            }
            FileInputStream(file)
        }
    }

    /**
     * Cài đặt ảnh trực tiếp làm Hình nền màn hình chính hoặc màn hình khóa trên Android.
     * Hỗ trợ nhận trực tiếp URL đám mây (R2) hoặc đường dẫn tệp cục bộ, xử lý tải ngầm trên Thread riêng.
     */
    @ReactMethod
    fun setWallpaper(source: String, promise: Promise) {
        Thread {
            try {
                val inputStream = try {
                    openInputStream(source)
                } catch (e: Exception) {
                    promise.reject("FETCH_ERROR", e.message ?: "Không thể kết nối tải ảnh", e)
                    return@Thread
                }

                val options = BitmapFactory.Options().apply {
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                }
                val bitmap = inputStream.use { stream ->
                    BitmapFactory.decodeStream(stream, null, options)
                }

                if (bitmap == null) {
                    promise.reject("DECODE_ERROR", "Không thể giải mã định dạng hình ảnh")
                    return@Thread
                }

                val wallpaperManager = WallpaperManager.getInstance(reactContext)
                var applied = false

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    // Thử 1: Đặt cho cả Home Screen và Lock Screen
                    try {
                        wallpaperManager.setBitmap(
                            bitmap,
                            null,
                            true,
                            WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
                        )
                        applied = true
                    } catch (_: Exception) {
                        // Fallback 1: Trên thiết bị Xiaomi HyperOS / MIUI, quyền lock screen bị khóa
                        try {
                            wallpaperManager.setBitmap(
                                bitmap,
                                null,
                                true,
                                WallpaperManager.FLAG_SYSTEM
                            )
                            applied = true
                        } catch (_: Exception) {
                            // Fallback 2: Gọi setBitmap mặc định không tham số cờ
                            wallpaperManager.setBitmap(bitmap)
                            applied = true
                        }
                    }
                } else {
                    wallpaperManager.setBitmap(bitmap)
                    applied = true
                }

                if (applied) {
                    promise.resolve(true)
                } else {
                    promise.reject("SET_WALLPAPER_FAILED", "Không thể áp dụng hình nền hệ thống")
                }
            } catch (e: Exception) {
                promise.reject("SET_WALLPAPER_ERROR", e.message ?: "Lỗi cài đặt hình nền Android", e)
            }
        }.start()
    }

    /**
     * Lưu ảnh vào Thư viện Photos/Gallery của thiết bị Android (Thư mục Pictures/WallpaperHD).
     * Hỗ trợ nhận trực tiếp URL đám mây (R2) hoặc đường dẫn tệp cục bộ, stream trực tiếp vào MediaStore.
     */
    @ReactMethod
    fun saveToGallery(source: String, filename: String, promise: Promise) {
        Thread {
            try {
                // Nhận diện đuôi tệp & MIME type chuẩn xác
                val lowerName = filename.lowercase()
                val (imageName, mimeType) = when {
                    lowerName.endsWith(".webp") -> filename to "image/webp"
                    lowerName.endsWith(".png") -> filename to "image/png"
                    lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") -> filename to "image/jpeg"
                    else -> "$filename.jpg" to "image/jpeg"
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val resolver = reactContext.contentResolver
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, imageName)
                        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/WallpaperHD")
                        put(MediaStore.MediaColumns.IS_PENDING, 1)
                    }

                    val imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                    if (imageUri != null) {
                        resolver.openOutputStream(imageUri)?.use { outputStream ->
                            openInputStream(source).use { inputStream ->
                                inputStream.copyTo(outputStream)
                            }
                        }

                        // Hoàn tất ghi -> đánh dấu IS_PENDING = 0
                        contentValues.clear()
                        contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                        resolver.update(imageUri, contentValues, null, null)

                        promise.resolve(imageUri.toString())
                    } else {
                        promise.reject("SAVE_FAILED", "Không thể tạo bản ghi MediaStore")
                    }
                } else {
                    val picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                    val targetDir = File(picturesDir, "WallpaperHD")
                    if (!targetDir.exists()) {
                        targetDir.mkdirs()
                    }

                    val targetFile = File(targetDir, imageName)
                    FileOutputStream(targetFile).use { outputStream ->
                        openInputStream(source).use { inputStream ->
                            inputStream.copyTo(outputStream)
                        }
                    }

                    // Thông báo MediaScanner cho Android 9 trở xuống
                    MediaScannerConnection.scanFile(
                        reactContext,
                        arrayOf(targetFile.absolutePath),
                        arrayOf(mimeType),
                        null
                    )

                    promise.resolve(targetFile.absolutePath)
                }
            } catch (e: Exception) {
                promise.reject("SAVE_GALLERY_ERROR", e.message ?: "Lỗi lưu ảnh vào thư viện", e)
            }
        }.start()
    }

    /**
     * Mở trực tiếp ứng dụng Thư viện hình ảnh (Gallery / Photos App) trên thiết bị,
     * khởi chạy ứng dụng thay vì trỏ vào đường dẫn URI tệp cụ thể.
     */
    @ReactMethod
    fun openGallery(promise: Promise) {
        try {
            val packageManager = reactContext.packageManager

            // Danh sách package ứng dụng Thư viện/Photos phổ biến trên các hãng Android
            val galleryPackages = listOf(
                "com.google.android.apps.photos",  // Google Photos
                "com.sec.android.gallery3d",       // Samsung Gallery
                "com.miui.gallery",                // Xiaomi Gallery
                "com.android.gallery3d",           // AOSP Gallery
                "com.coloros.gallery3d",           // OPPO / Realme Gallery
                "com.vivo.gallery",                // Vivo Gallery
                "com.huawei.photos",               // Huawei Gallery
                "com.oneplus.gallery",             // OnePlus Gallery
                "com.motorola.cn.gallery"          // Motorola Gallery
            )

            // 1. Khởi chạy trực tiếp App Thư viện cài trên máy
            for (pkg in galleryPackages) {
                val launchIntent = packageManager.getLaunchIntentForPackage(pkg)
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactContext.startActivity(launchIntent)
                    promise.resolve(true)
                    return
                }
            }

            // 2. Fallback: Khởi chạy bằng Intent Category App Gallery chính thống của Android
            val galleryIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_APP_GALLERY)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            if (galleryIntent.resolveActivity(packageManager) != null) {
                reactContext.startActivity(galleryIntent)
                promise.resolve(true)
                return
            }

            // 3. Fallback: Mở giao diện xem ảnh (type image/* không gắn URI đường dẫn cụ thể)
            val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                type = "image/*"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            if (viewIntent.resolveActivity(packageManager) != null) {
                reactContext.startActivity(viewIntent)
                promise.resolve(true)
                return
            }

            promise.reject("NO_GALLERY_APP", "Không tìm thấy ứng dụng thư viện hình ảnh trên thiết bị")
        } catch (e: Exception) {
            promise.reject("OPEN_GALLERY_ERROR", e.message ?: "Lỗi khi mở thư viện ảnh", e)
        }
    }
}
