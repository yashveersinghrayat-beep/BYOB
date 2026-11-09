const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, 'android-build');
const SDK_DIR = 'C:\\Users\\Root\\AppData\\Local\\Android\\Sdk';
const BUILD_TOOLS = path.join(SDK_DIR, 'build-tools', '34.0.0');
const PLATFORM_JAR = path.join(SDK_DIR, 'platforms', 'android-34', 'android.jar');
const JDK_BIN = 'C:\\Program Files\\Microsoft\\jdk-21.0.12.8-hotspot\\bin';

const AAPT2 = path.join(BUILD_TOOLS, 'aapt2.exe');
const D8 = path.join(BUILD_TOOLS, 'd8.bat');
const ZIPALIGN = path.join(BUILD_TOOLS, 'zipalign.exe');
const APKSIGNER = path.join(BUILD_TOOLS, 'apksigner.bat');
const JAVAC = path.join(JDK_BIN, 'javac.exe');
const JAR = path.join(JDK_BIN, 'jar.exe');
const KEYTOOL = path.join(JDK_BIN, 'keytool.exe');

console.log('🤖 ONYX COMMERCIAL ANDROID APK COMPILER 🤖\n');

// Multi-Location Branch Resolver
const locationArg = (process.argv.find(a => a.startsWith('--location=')) || '--location=gyankhand').split('=')[1].toLowerCase();
const LOCATIONS = {
  gyankhand: {
    code: 'gyankhand',
    appName: 'BYOB Gyan Khand',
    packageId: 'com.onyx.pos',
    serverUrl: 'https://byob-yashveersinghrayat-5191s-projects.vercel.app?platform=android_apk&branch=gyankhand',
    apkName: 'ONYX_POS_GYAN_KHAND.apk'
  },
  aditya: {
    code: 'aditya',
    appName: 'BYOB Aditya Mall',
    packageId: 'com.onyx.byob.aditya',
    serverUrl: 'https://byob-adityamall.vercel.app?platform=android_apk&branch=aditya',
    apkName: 'ONYX_POS_ADITYA_MALL.apk'
  }
};
const activeLoc = LOCATIONS[locationArg] || LOCATIONS.gyankhand;
console.log(`📍 Compiling Android APK for: [${activeLoc.appName}] (${activeLoc.packageId})\n`);

// 1. Prepare directory structure
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

const packageParts = activeLoc.packageId.split('.');
const srcDir = path.join(BUILD_DIR, 'src', ...packageParts);
const resDir = path.join(BUILD_DIR, 'res');
const valuesDir = path.join(resDir, 'values');
const xmlDir = path.join(resDir, 'xml');
const mipmapDir = path.join(resDir, 'mipmap');
const assetsDir = path.join(BUILD_DIR, 'assets');
const objDir = path.join(BUILD_DIR, 'obj');

fs.mkdirSync(srcDir, { recursive: true });
fs.mkdirSync(valuesDir, { recursive: true });
fs.mkdirSync(xmlDir, { recursive: true });
fs.mkdirSync(mipmapDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(objDir, { recursive: true });

// Copy App Icons
const webSrcDir = activeLoc.code === 'aditya' ? path.join(ROOT_DIR, 'aditya-mall') : ROOT_DIR;
fs.copyFileSync(path.join(webSrcDir, 'icons', 'icon-512.png'), path.join(mipmapDir, 'ic_launcher.png'));
fs.copyFileSync(path.join(webSrcDir, 'icons', 'icon-192.png'), path.join(mipmapDir, 'ic_launcher_round.png'));

// Copy Web Assets into assets/
function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(path.join(webSrcDir, 'index.html'), path.join(assetsDir, 'index.html'));
copyRecursive(path.join(webSrcDir, 'css'), path.join(assetsDir, 'css'));
copyRecursive(path.join(webSrcDir, 'js'), path.join(assetsDir, 'js'));
copyRecursive(path.join(webSrcDir, 'icons'), path.join(assetsDir, 'icons'));
copyRecursive(path.join(webSrcDir, 'images'), path.join(assetsDir, 'images'));
copyRecursive(path.join(webSrcDir, 'manifest.json'), path.join(assetsDir, 'manifest.json'));
if (fs.existsSync(path.join(webSrcDir, 'sw.js'))) {
  fs.copyFileSync(path.join(webSrcDir, 'sw.js'), path.join(assetsDir, 'sw.js'));
}

// 2. Android Resources
fs.writeFileSync(path.join(valuesDir, 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${activeLoc.appName}</string>
</resources>`);

fs.writeFileSync(path.join(valuesDir, 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">#090a0e</color>
    <color name="accent">#f59e0b</color>
</resources>`);

fs.writeFileSync(path.join(valuesDir, 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="android:Theme.NoTitleBar.Fullscreen">
        <item name="android:windowBackground">@color/primary</item>
    </style>
</resources>`);

fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>`);

// 3. AndroidManifest.xml
const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${activeLoc.packageId}"
    android:versionCode="12"
    android:versionName="5.2">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />

    <!-- Core Network & Connectivity -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- Camera & Audio (QR, Payment Proof Slips) -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <!-- System Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- File Storage & Media Permissions -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />

    <!-- Location & Bluetooth for Wireless Thermal Printers -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />

    <!-- Hardware Feature Declarations -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.wifi" android:required="false" />
    <uses-feature android:name="android.hardware.bluetooth" android:required="false" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:requestLegacyExternalStorage="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize|screenLayout|density"
            android:windowSoftInputMode="adjustResize"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
fs.writeFileSync(path.join(BUILD_DIR, 'AndroidManifest.xml'), manifestContent);

// 4. Java Sources (Separate top-level classes to prevent D8 inner-class parameter metadata bug)
const posNativeBridgeJava = `package ${activeLoc.packageId};

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

public class PosNativeBridge {
    private final MainActivity activity;

    public PosNativeBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void requestAllPermissions() {
        activity.runOnUiThread(activity);
    }

    @JavascriptInterface
    public void openAppSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", activity.getPackageName(), null);
            intent.setData(uri);
            activity.startActivity(intent);
        } catch (Exception e) {}
    }

    @JavascriptInterface
    public boolean hasCameraPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return activity.checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    @JavascriptInterface
    public boolean hasNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            return activity.checkSelfPermission("android.permission.POST_NOTIFICATIONS") == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    @JavascriptInterface
    public boolean hasStoragePermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            return activity.checkSelfPermission("android.permission.READ_MEDIA_IMAGES") == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return activity.checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    @JavascriptInterface
    public boolean areAllPermissionsGranted() {
        return hasCameraPermission() && hasNotificationPermission();
    }

    @JavascriptInterface
    public String getDeviceModel() {
        return Build.MANUFACTURER + " " + Build.MODEL;
    }

    @JavascriptInterface
    public String getAppVersion() {
        return "5.2";
    }

    @JavascriptInterface
    public void closeApp() {
        activity.finishAffinity();
        System.exit(0);
    }
}
`;
fs.writeFileSync(path.join(srcDir, 'PosNativeBridge.java'), posNativeBridgeJava);

const posWebChromeClientJava = `package ${activeLoc.packageId};

import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

public class PosWebChromeClient extends WebChromeClient {
    private final MainActivity activity;

    public PosWebChromeClient(MainActivity activity) {
        this.activity = activity;
    }

    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        try {
            if (activity.checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                request.grant(request.getResources());
            } else {
                activity.pendingWebPermissionRequest = request;
                activity.runOnUiThread(activity);
            }
        } catch (Exception e) {
            try { request.grant(request.getResources()); } catch (Exception ex) {}
        }
    }
}
`;
fs.writeFileSync(path.join(srcDir, 'PosWebChromeClient.java'), posWebChromeClientJava);

const posWebViewClientJava = `package ${activeLoc.packageId};

import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class PosWebViewClient extends WebViewClient {
    private static final String LOCAL_FALLBACK = "file:///android_asset/index.html?platform=android_apk";

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        if (url != null && (url.endsWith(".apk") || url.contains(".apk?"))) {
            return false;
        }
        return false;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (request != null && request.getUrl() != null) {
            String url = request.getUrl().toString();
            if (url.endsWith(".apk") || url.contains(".apk?")) {
                return false;
            }
        }
        return false;
    }

    @Override
    public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
        if (failingUrl != null && failingUrl.startsWith("http")) {
            view.loadUrl(LOCAL_FALLBACK);
        }
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request != null && request.isForMainFrame()) {
            view.loadUrl(LOCAL_FALLBACK);
        }
    }
}
`;
fs.writeFileSync(path.join(srcDir, 'PosWebViewClient.java'), posWebViewClientJava);

const mainActivityJava = `package ${activeLoc.packageId};

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity implements DownloadListener, Runnable {
    private WebView webView;
    private static final String SERVER_URL = "${activeLoc.serverUrl}";
    private static final int PERMISSION_REQ_CODE = 101;
    public PermissionRequest pendingWebPermissionRequest;

    @Override
    public void run() {
        checkAndRequestAllPermissions();
    }

    public void checkAndRequestAllPermissions() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            java.util.List<String> needed = new java.util.ArrayList<String>();

            // 1. Camera (Essential for Table bill & UPI settlement proof capture)
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.CAMERA);
            }

            // 2. Storage & Photos / Notifications (Android 13+)
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    needed.add("android.permission.POST_NOTIFICATIONS");
                }
                if (checkSelfPermission("android.permission.READ_MEDIA_IMAGES") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    needed.add("android.permission.READ_MEDIA_IMAGES");
                }
            } else {
                if (checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    needed.add(android.Manifest.permission.READ_EXTERNAL_STORAGE);
                }
            }

            // 3. Bluetooth for Wireless Thermal Printers (Android 12+)
            if (android.os.Build.VERSION.SDK_INT >= 31) {
                if (checkSelfPermission("android.permission.BLUETOOTH_CONNECT") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    needed.add("android.permission.BLUETOOTH_CONNECT");
                }
                if (checkSelfPermission("android.permission.BLUETOOTH_SCAN") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    needed.add("android.permission.BLUETOOTH_SCAN");
                }
            }

            if (!needed.isEmpty()) {
                requestPermissions(needed.toArray(new String[0]), PERMISSION_REQ_CODE);
            }
        }
    }

    public void notifyWebPermissionsResult() {
        if (webView != null) {
            webView.post(new PermNotifier(webView));
        }
    }

    static class PermNotifier implements Runnable {
        private final WebView view;
        public PermNotifier(WebView v) {
            this.view = v;
        }
        @Override
        public void run() {
            try {
                if (view != null) {
                    view.evaluateJavascript("if (window.APP && typeof window.APP.onNativePermissionsResult === 'function') { window.APP.onNativePermissionsResult(); }", null);
                }
            } catch (Exception e) {}
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQ_CODE) {
            boolean cameraGranted = false;
            for (int i = 0; i < permissions.length; i++) {
                if (android.Manifest.permission.CAMERA.equals(permissions[i]) && grantResults[i] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    cameraGranted = true;
                }
            }
            if (cameraGranted && pendingWebPermissionRequest != null) {
                try {
                    pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
                } catch (Exception e) {}
                pendingWebPermissionRequest = null;
            }
            notifyWebPermissionsResult();
        }
    }

    @Override
    public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
        try {
            Uri downloadUri = Uri.parse(url);
            DownloadManager.Request request = new DownloadManager.Request(downloadUri);
            request.setMimeType("application/vnd.android.package-archive");
            request.setDescription("Downloading ONYX POS Update...");
            request.setTitle("ONYX_POS.apk");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "ONYX_POS.apk");
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm != null) {
                dm.enqueue(request);
                Toast.makeText(this, "⚡ Downloading ONYX POS update to phone storage...", Toast.LENGTH_LONG).show();
                return;
            }
        } catch (Exception e) {}

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(url));
            startActivity(intent);
        } catch (Exception ex) {
            Toast.makeText(this, "Download failed: " + ex.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void hideSystemUI() {
        try {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        } catch (Exception e) {}
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUI();
        notifyWebPermissionsResult();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep Screen Awake (Restaurant POS standard)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Strictly Lock Screen Orientation to Portrait
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        // Enable Fullscreen Kiosk Mode with Immersive Sticky navigation hiding
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        hideSystemUI();

        FrameLayout layout = new FrameLayout(this);
        layout.setFitsSystemWindows(false);
        webView = new WebView(this);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        layout.addView(webView);
        setContentView(layout);

        WebSettings settings = webView.getSettings();
        settings.setUserAgentString(settings.getUserAgentString() + " ONYX_ANDROID_APP");
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setBackgroundColor(0xFF090A0E);
        webView.setWebChromeClient(new PosWebChromeClient(this));
        webView.setWebViewClient(new PosWebViewClient());
        webView.setDownloadListener(this);
        webView.addJavascriptInterface(new PosNativeBridge(this), "PosAndroid");

        // Schedule batch permission prompt once UI is attached and visible
        webView.postDelayed(this, 500);

        // Connect directly to Live Vercel Web App (falls back instantly to bundled assets if offline)
        webView.loadUrl(SERVER_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;
fs.writeFileSync(path.join(srcDir, 'MainActivity.java'), mainActivityJava);

console.log('✅ Java source and manifest generated.');

// Step 1: AAPT2 Compile
console.log('📦 Step 1: Compiling resources with aapt2...');
const compiledZip = path.join(BUILD_DIR, 'compiled_res.zip');
execSync(`"${AAPT2}" compile --dir "${resDir}" -o "${compiledZip}"`, { stdio: 'inherit' });

// Step 2: AAPT2 Link
console.log('🔗 Step 2: Linking resources with aapt2...');
const baseApk = path.join(BUILD_DIR, 'base.apk');
execSync(`"${AAPT2}" link -I "${PLATFORM_JAR}" --manifest "${path.join(BUILD_DIR, 'AndroidManifest.xml')}" --java "${path.join(BUILD_DIR, 'src')}" -o "${baseApk}" "${compiledZip}" --auto-add-overlay`, { stdio: 'inherit' });

// Step 3: JAVAC Compile
console.log('☕ Step 3: Compiling Java classes with javac...');
const javaFiles = [
  path.join(srcDir, 'MainActivity.java'),
  path.join(srcDir, 'PosWebChromeClient.java'),
  path.join(srcDir, 'PosWebViewClient.java'),
  path.join(srcDir, 'PosNativeBridge.java'),
  path.join(srcDir, 'R.java')
];
const quotedJava = javaFiles.map(j => `"${j}"`).join(' ');
execSync(`"${JAVAC}" --release 8 -d "${objDir}" -cp "${PLATFORM_JAR}" ${quotedJava}`, { stdio: 'inherit' });

// Step 4: D8 Dexing
console.log('⚡ Step 4: Converting Java bytecode to Dalvik Executable (classes.dex) with d8...');
const classFiles = [
  path.join(objDir, 'com', 'onyx', 'pos', 'MainActivity.class'),
  path.join(objDir, 'com', 'onyx', 'pos', 'MainActivity$1.class'),
  path.join(objDir, 'com', 'onyx', 'pos', 'R.class')
].filter(f => fs.existsSync(f));

const allClassFiles = [];
function findClasses(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) findClasses(full);
    else if (full.endsWith('.class')) allClassFiles.push(full);
  }
}
findClasses(objDir);

const quotedClasses = allClassFiles.map(c => `"${c}"`).join(' ');
execSync(`"${D8}" --output "${BUILD_DIR}" --lib "${PLATFORM_JAR}" ${quotedClasses}`, { stdio: 'inherit' });

// Step 5: Add classes.dex and assets into base.apk using jar tool (ensuring Unix forward slashes)
console.log('📦 Step 5: Packaging classes.dex and assets into APK with canonical forward slashes...');
process.chdir(BUILD_DIR);
execSync(`"${JAR}" -uf "${baseApk}" classes.dex`, { stdio: 'inherit' });
execSync(`"${JAR}" -uf "${baseApk}" assets`, { stdio: 'inherit' });
process.chdir(ROOT_DIR);

// Step 6: Zipalign
console.log('📐 Step 6: Aligning APK bytes with zipalign...');
const alignedApk = path.join(BUILD_DIR, 'aligned.apk');
execSync(`"${ZIPALIGN}" -v -p 4 "${baseApk}" "${alignedApk}"`, { stdio: 'ignore' });

// Step 7: Create Keystore & Sign APK
console.log('✍️ Step 7: Signing APK with apksigner...');
const keystore = path.join(BUILD_DIR, 'debug.keystore');
if (!fs.existsSync(keystore)) {
  execSync(`"${KEYTOOL}" -genkey -v -keystore "${keystore}" -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=ONYX POS,O=Restaurant,C=IN"`, { stdio: 'ignore' });
}

const branchApk = path.join(ROOT_DIR, activeLoc.apkName);
const finalApk = path.join(ROOT_DIR, 'ONYX_POS.apk');
const desktopBranchApk = path.join(process.env.USERPROFILE, 'Desktop', activeLoc.apkName);
const desktopDefaultApk = path.join(process.env.USERPROFILE, 'Desktop', 'ONYX_POS.apk');

execSync(`"${APKSIGNER}" sign --ks "${keystore}" --ks-pass pass:android --out "${finalApk}" "${alignedApk}"`, { stdio: 'inherit' });

// Copy to Branch APK and Desktop
fs.copyFileSync(finalApk, branchApk);
fs.copyFileSync(finalApk, desktopBranchApk);
fs.copyFileSync(finalApk, desktopDefaultApk);

try {
  const publicDir = path.join(ROOT_DIR, 'public');
  if (fs.existsSync(publicDir)) {
    fs.copyFileSync(finalApk, path.join(publicDir, activeLoc.apkName));
    fs.copyFileSync(finalApk, path.join(publicDir, 'ONYX_POS.apk'));
    fs.copyFileSync(finalApk, path.join(publicDir, 'byob-pos-latest.apk'));
    console.log(`   🌐 Web Download: Copied to public/${activeLoc.apkName} & public/ONYX_POS.apk`);
  }
  if (activeLoc.code === 'aditya') {
    const adityaDir = path.join(ROOT_DIR, 'aditya-mall');
    if (fs.existsSync(adityaDir)) {
      fs.copyFileSync(finalApk, path.join(adityaDir, activeLoc.apkName));
      fs.copyFileSync(finalApk, path.join(adityaDir, 'ONYX_POS.apk'));
      console.log(`   🌐 Web Download: Copied to aditya-mall/${activeLoc.apkName} & aditya-mall/ONYX_POS.apk`);
    }
  }
} catch (e) {
  console.warn('Could not copy to public/aditya-mall:', e.message);
}

console.log('\n🎉 ==============================================================');
console.log(`   💎 ANDROID APK BUILT FOR [${activeLoc.appName}]!`);
console.log('--------------------------------------------------------------');
console.log(`   📱 Location APK: ${branchApk}`);
console.log(`   💻 Desktop APK:  ${desktopBranchApk}`);
const stats = fs.statSync(finalApk);
console.log(`   📦 APK File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
console.log('==============================================================\n');
