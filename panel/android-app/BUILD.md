# 构建与安装说明

本文档描述如何在本地构建「公司X光守护」Android 应用，并安装到测试设备上。

---

## 环境要求

### 必须的开发环境

| 工具 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| **Android Studio** | Hedgehog (2023.1.1) | Iguana (2023.2.1) 及以上 | 官方 IDE |
| **JDK** | 17 | 17 | Android Studio 自带，无需单独安装 |
| **Android SDK** | API 34 | API 34 | 编译目标版本 |
| **Android SDK Build-Tools** | 34.0.0 | 34.0.0+ | 构建工具 |
| **Gradle** | 8.4 | 8.4+ | 项目使用 Gradle Wrapper，无需手动安装 |

### 可选工具

- **Git**：用于版本控制
- **ADB**：用于命令行安装 APK（Android SDK 自带）
- **Android 设备或模拟器**：用于运行和测试应用

---

## 构建步骤（Android Studio 方式）

### 第一步：打开项目

1. 启动 Android Studio
2. 选择 **File → Open**
3. 浏览到 `android-app/` 目录（包含 `settings.gradle.kts` 的目录）
4. 点击 **OK**，等待 Android Studio 加载项目

> 注意：请确保打开的是 `android-app/` 根目录，而不是 `app/` 子目录。

### 第二步：同步 Gradle

1. 项目打开后，Android Studio 会自动触发 Gradle Sync
2. 如果没有自动同步，点击工具栏上的 **Sync Project with Gradle Files** 按钮（大象图标）
3. 等待同步完成，底部状态栏显示 "Sync successful"

> 如果同步失败，请检查网络连接（首次构建需要下载依赖）。国内用户建议配置 Maven 镜像源。

### 第三步：构建 Debug APK

1. 点击菜单栏 **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. 等待构建完成（首次构建可能需要几分钟）
3. 构建成功后会弹出通知，点击 **locate** 可直接打开 APK 所在目录
4. APK 文件路径：`app/build/outputs/apk/debug/app-debug.apk`

### 第四步：运行到设备

1. 将 Android 手机通过 USB 连接到电脑
2. 确保手机已开启 **开发者选项** 和 **USB 调试**
3. 在 Android Studio 顶部工具栏的设备下拉列表中选择你的设备
4. 点击 **Run 'app'** 按钮（绿色三角形）
5. 等待应用安装并启动

> 也可以使用模拟器：点击 **Device Manager → Create Device** 创建一个虚拟设备。

---

## 命令行构建方式

如果你习惯使用命令行，可以通过 Gradle Wrapper 进行构建。

### Windows

```powershell
# 进入项目根目录
cd f:\董恒睿\工作空间\工作区\front\panel\android-app

# 构建 Debug APK
.\gradlew.bat assembleDebug

# 构建 Release APK
.\gradlew.bat assembleRelease

# 构建并安装到已连接的设备
.\gradlew.bat installDebug

# 卸载应用
.\gradlew.bat uninstallDebug

# 查看所有可用任务
.\gradlew.bat tasks
```

### macOS / Linux

```bash
# 进入项目根目录
cd android-app

# 构建 Debug APK
./gradlew assembleDebug

# 构建 Release APK
./gradlew assembleRelease

# 构建并安装到已连接的设备
./gradlew installDebug
```

### 构建产物说明

| 构建类型 | 路径 | 说明 |
|----------|------|------|
| Debug APK | `app/build/outputs/apk/debug/app-debug.apk` | 测试用，使用 debug 密钥签名 |
| Release APK | `app/build/outputs/apk/release/app-release-unsigned.apk` | 未签名，需要手动签名后才能安装 |
| AAB | `app/build/outputs/bundle/release/app-release.aab` | 应用包格式，用于 Google Play 上架 |

---

## 安装到手机

### 方式一：通过 ADB 安装

```powershell
# 确保设备已连接
adb devices

# 安装 Debug APK
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

参数说明：
- `-r`：覆盖安装（保留应用数据）
- `-t`：允许安装测试包（debug 包通常需要）
- `-d`：允许降级安装（版本号比当前已安装的低时）

### 方式二：通过 USB 传输安装

1. 将 APK 文件复制到手机存储
2. 在手机文件管理器中找到 APK 文件
3. 点击安装（需要允许「未知来源」或「安装未知应用」权限）

### 方式三：通过二维码/网盘分享

1. 将 APK 上传到网盘或生成二维码
2. 在手机上下载并安装

---

## 签名说明

### Debug 签名

Debug 构建默认使用 Android SDK 自动生成的 debug 密钥进行签名，无需额外配置。

Debug 密钥通常位于：
- Windows: `C:\Users\<用户名>\.android\debug.keystore`
- macOS: `~/.android/debug.keystore`

Debug 签名信息：
- Keystore 密码：`android`
- Key 别名：`androiddebugkey`
- Key 密码：`android`

> Debug 签名的 APK 不能用于正式发布，且不同开发机的 debug 签名可能不同，无法覆盖安装。

### Release 签名

发布正式版本前，需要生成自己的签名密钥。

#### 第一步：生成签名密钥

```powershell
keytool -genkeypair -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-app-alias
```

按提示填写：
- Keystore 密码（请妥善保管）
- 姓名、组织、城市、省份、国家代码
- Key 密码（可与 Keystore 密码相同）

#### 第二步：配置签名信息

在 `app/build.gradle.kts` 的 `android` 块中添加签名配置：

```kotlin
android {
    // ...

    signingConfigs {
        create("release") {
            storeFile = file("my-release-key.jks")
            storePassword = "your-keystore-password"
            keyAlias = "my-app-alias"
            keyPassword = "your-key-password"
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

> 注意：不要将包含密码的 `build.gradle.kts` 提交到版本控制！建议使用 `local.properties` 或环境变量来管理敏感信息。

#### 第三步：构建签名 Release APK

```powershell
.\gradlew.bat assembleRelease
```

构建完成后，签名后的 APK 位于：
`app/build/outputs/apk/release/app-release.apk`

---

## 常见问题

### Q: Gradle Sync 失败，提示下载依赖超时

**A**：国内网络环境下，需要配置 Maven 镜像。在 `settings.gradle.kts` 中添加阿里云镜像：

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        maven { url = uri("https://maven.aliyun.com/repository/google") }
        maven { url = uri("https://maven.aliyun.com/repository/public") }
        google()
        mavenCentral()
    }
}
```

### Q: 安装 APK 时提示「解析包时出现问题」

**A**：可能的原因：
1. APK 下载不完整，重新构建或传输
2. 手机 Android 版本低于应用的 `minSdk`（需 Android 7.0+）
3. APK 未签名或签名不正确

### Q: 安装后应用闪退

**A**：请检查：
1. 是否已授予必要的权限（无障碍、悬浮窗等）
2. 使用 Logcat 查看崩溃日志：`adb logcat | findstr AndroidRuntime`
3. 确认设备 Android 版本满足要求

### Q: 无障碍服务无法启动/经常被关闭

**A**：常见原因：
1. 系统电池优化杀死了后台服务 → 将应用加入电池优化白名单
2. 被安全软件清理 → 将应用加入后台锁定/白名单
3. Android 12+ 的无障碍服务限制 → 在系统设置中手动重新开启

---

## 相关文档

- [项目说明 README](./README.md)
- [测试说明 TESTING](./TESTING.md)
- [隐私政策摘要 PRIVACY](./PRIVACY.md)
