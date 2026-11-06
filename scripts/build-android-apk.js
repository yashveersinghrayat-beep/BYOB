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

// 1. Prepare directory structure
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

const srcDir = path.join(BUILD_DIR, 'src', 'com', 'onyx', 'pos');
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
fs.copyFileSync(path.join(ROOT_DIR, 'icons', 'icon-512.png'), path.join(mipmapDir, 'ic_launcher.png'));
fs.copyFileSync(path.join(ROOT_DIR, 'icons', 'icon-192.png'), path.join(mipmapDir, 'ic_launcher_round.png'));

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

copyRecursive(path.join(ROOT_DIR, 'index.html'), path.join(assetsDir, 'index.html'));
copyRecursive(path.join(ROOT_DIR, 'css'), path.join(assetsDir, 'css'));
copyRecursive(path.join(ROOT_DIR, 'js'), path.join(assetsDir, 'js'));
copyRecursive(path.join(ROOT_DIR, 'icons'), path.join(assetsDir, 'icons'));
copyRecursive(path.join(ROOT_DIR, 'images'), path.join(assetsDir, 'images'));
copyRecursive(path.join(ROOT_DIR, 'manifest.json'), path.join(assetsDir, 'manifest.json'));

// 2. Android Resources
fs.writeFileSync(path.join(valuesDir, 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">ONYX POS</string>
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
    package="com.onyx.pos"
    android:versionCode="7"
    android:versionName="3.8">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
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

// 4. MainActivity.java
const mainActivityJava = `package com.onyx.pos;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String SERVER_URL = "https://byob-orcin.vercel.app";
    private static final String LOCAL_FALLBACK = "file:///android_asset/index.html";

    private static class PosWebViewClient extends WebViewClient {
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

    private static class PosDownloadListener implements DownloadListener {
        private final Activity activity;

        public PosDownloadListener(Activity activity) {
            this.activity = activity;
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
                DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.enqueue(request);
                    Toast.makeText(activity, "⚡ Downloading ONYX POS update to phone storage...", Toast.LENGTH_LONG).show();
                    return;
                }
            } catch (Exception e) {
                // Ignore and try intent fallback
            }

            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                activity.startActivity(intent);
            } catch (Exception ex) {
                Toast.makeText(activity, "Download failed: " + ex.getMessage(), Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep Screen Awake (Restaurant POS standard)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Strictly Lock Screen Orientation to Portrait (prevents auto-rotate displacement during waiter movement)
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        // Enable Fullscreen Kiosk Mode
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        FrameLayout layout = new FrameLayout(this);
        webView = new WebView(this);
        layout.addView(webView);
        setContentView(layout);

        WebSettings settings = webView.getSettings();
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

        webView.setBackgroundColor(0xFF090A0E);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new PosWebViewClient());
        webView.setDownloadListener(new PosDownloadListener(this));

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
  path.join(srcDir, 'R.java')
];
execSync(`"${JAVAC}" --release 8 -d "${objDir}" -cp "${PLATFORM_JAR}" "${javaFiles[0]}" "${javaFiles[1]}"`, { stdio: 'inherit' });

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

const finalApk = path.join(ROOT_DIR, 'ONYX_POS.apk');
const desktopApk = path.join(process.env.USERPROFILE, 'Desktop', 'ONYX_POS.apk');

execSync(`"${APKSIGNER}" sign --ks "${keystore}" --ks-pass pass:android --out "${finalApk}" "${alignedApk}"`, { stdio: 'inherit' });

// Copy to Desktop and public downloads folder
fs.copyFileSync(finalApk, desktopApk);
try {
  const publicDir = path.join(ROOT_DIR, 'public');
  if (fs.existsSync(publicDir)) {
    fs.copyFileSync(finalApk, path.join(publicDir, 'ONYX_POS.apk'));
    fs.copyFileSync(finalApk, path.join(publicDir, 'byob-pos-latest.apk'));
    console.log('   🌐 Web Download: Copied to public/ONYX_POS.apk & public/byob-pos-latest.apk');
  }
} catch (e) {
  console.warn('Could not copy to public:', e.message);
}

console.log('\n🎉 ==============================================================');
console.log('   💎 ANDROID APK BUILT & SIGNED SUCCESSFULLY!');
console.log('--------------------------------------------------------------');
console.log(`   📱 Project APK: ${finalApk}`);
console.log(`   💻 Desktop APK: ${desktopApk}`);
const stats = fs.statSync(finalApk);
console.log(`   📦 APK File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
console.log('==============================================================\n');
