import { app, shell, BrowserWindow } from 'electron';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { URL } from 'url';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseDate: string;
  releaseUrl: string;
  assetName: string;
  assetSize: number;
  downloadUrl: string;
}

export interface UpdateProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

function parseSemver(v: string): [number, number, number] {
  const cleaned = v.trim().replace(/^v/, '');
  const parts = cleaned.split('.').map((p) => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

export function isNewerVersion(latest: string, current: string): boolean {
  const [lMaj, lMin, lPatch] = parseSemver(latest);
  const [cMaj, cMin, cPatch] = parseSemver(current);

  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPatch > cPatch;
}

export class AppUpdateManager {
  private repo = 'abhidhakal/me-tric';
  private currentDownloadedPath: string | null = null;
  private isDownloading = false;

  public async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion();
    const apiUrl = `https://api.github.com/repos/${this.repo}/releases/latest`;

    const data = await this.fetchJson(apiUrl);
    const latestVersion = (data.tag_name || '').replace(/^v/, '');
    const hasUpdate = isNewerVersion(latestVersion, currentVersion);

    // Pick platform-compatible asset
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';

    let targetAsset: any = null;
    if (Array.isArray(data.assets)) {
      if (isMac) {
        // Look for universal dmg or arm64/x64 dmg
        targetAsset = data.assets.find(
          (a: any) => a.name.endsWith('.dmg') && !a.name.endsWith('.blockmap')
        );
      } else if (isWin) {
        // Look for Windows-Setup.exe or .exe
        targetAsset = data.assets.find(
          (a: any) => a.name.endsWith('.exe') && !a.name.endsWith('.blockmap')
        );
      }
    }

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseName: data.name || `MeTric v${latestVersion}`,
      releaseNotes: data.body || 'No release notes provided.',
      releaseDate: data.published_at || data.created_at || '',
      releaseUrl: data.html_url || `https://github.com/${this.repo}/releases/latest`,
      assetName: targetAsset ? targetAsset.name : '',
      assetSize: targetAsset ? targetAsset.size : 0,
      downloadUrl: targetAsset ? targetAsset.browser_download_url : '',
    };
  }

  public async downloadUpdate(
    downloadUrl: string,
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<{ success: boolean; filePath: string }> {
    if (this.isDownloading) {
      throw new Error('A download is already in progress');
    }

    if (!downloadUrl) {
      throw new Error('Download URL is required');
    }

    this.isDownloading = true;

    try {
      const parsed = new URL(downloadUrl);
      const filename = path.basename(parsed.pathname) || 'MeTric-update';
      const tempDir = app.getPath('temp');
      const targetFilePath = path.join(tempDir, filename);

      // If already downloaded and complete
      this.currentDownloadedPath = targetFilePath;

      await this.downloadFileWithRedirects(downloadUrl, targetFilePath, onProgress);

      this.isDownloading = false;
      return { success: true, filePath: targetFilePath };
    } catch (err) {
      this.isDownloading = false;
      throw err;
    }
  }

  public async installAndRestart(customFilePath?: string): Promise<void> {
    const filePath = customFilePath || this.currentDownloadedPath;
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Update file not found on disk. Please download first.');
    }

    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';

    if (isMac && filePath.endsWith('.dmg')) {
      await this.installMacDmg(filePath);
    } else if (isWin && filePath.endsWith('.exe')) {
      await this.installWindowsExe(filePath);
    } else {
      // Fallback: open file in OS default handler
      shell.openPath(filePath);
      setTimeout(() => app.quit(), 1000);
    }
  }

  private async installMacDmg(dmgPath: string): Promise<void> {
    const tempDir = app.getPath('temp');
    const scriptPath = path.join(tempDir, 'metric-mac-updater.sh');

    // Create a standalone bash script that safely detaches and replaces the app bundle
    const bashScript = `#!/bin/bash
set -e

DMG_PATH="${dmgPath}"
DEST_APP="/Applications/MeTric.app"

# 1. Mount DMG quietly
MOUNT_DIR=$(hdiutil attach "$DMG_PATH" -nobrowse -readonly | grep -E '/Volumes/' | awk '{print $NF}' | head -n 1)

if [ -z "$MOUNT_DIR" ] || [ ! -d "$MOUNT_DIR" ]; then
  echo "Mount failed, opening DMG in Finder..."
  open "$DMG_PATH"
  exit 0
fi

# Find .app in mounted volume
SRC_APP=$(find "$MOUNT_DIR" -maxdepth 1 -name "*.app" | head -n 1)

if [ -z "$SRC_APP" ] || [ ! -d "$SRC_APP" ]; then
  echo "No .app found in DMG, opening DMG..."
  hdiutil detach "$MOUNT_DIR" || true
  open "$DMG_PATH"
  exit 0
fi

# Wait for current app process to fully terminate
sleep 1.5

# Try replacing in /Applications
if [ -w "/Applications" ] || [ -w "$DEST_APP" ]; then
  rm -rf "$DEST_APP"
  cp -R "$SRC_APP" "$DEST_APP"
  # Clear quarantine bit so macOS Gatekeeper runs it without hindrance
  xattr -dr com.apple.quarantine "$DEST_APP" 2>/dev/null || true
  hdiutil detach "$MOUNT_DIR" 2>/dev/null || true
  open -n "$DEST_APP"
  exit 0
else
  # If permissions restrict direct overwrite, open DMG so user drags it
  hdiutil detach "$MOUNT_DIR" 2>/dev/null || true
  open "$DMG_PATH"
  exit 0
fi
`;

    fs.writeFileSync(scriptPath, bashScript, { mode: 0o755 });

    // Spawn script detached and quit Electron
    const child = spawn('/bin/bash', [scriptPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    // Gracefully quit
    setTimeout(() => {
      app.quit();
    }, 500);
  }

  private async installWindowsExe(exePath: string): Promise<void> {
    // Run installer with standard user flags
    const child = spawn(exePath, ['/S'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    setTimeout(() => {
      app.quit();
    }, 500);
  }

  private fetchJson(urlStr: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'MeTric-Desktop-App',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      https
        .get(options, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return this.fetchJson(res.headers.location).then(resolve).catch(reject);
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`GitHub API returned status code ${res.statusCode}`));
          }

          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(raw));
            } catch (err) {
              reject(err);
            }
          });
        })
        .on('error', reject);
    });
  }

  private downloadFileWithRedirects(
    urlStr: string,
    destPath: string,
    onProgress?: (progress: UpdateProgress) => void,
    redirectCount = 0
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (redirectCount > 10) {
        return reject(new Error('Too many redirects while downloading update'));
      }

      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'MeTric-Desktop-App',
          Accept: 'application/octet-stream',
        },
      };

      client
        .get(options, (res) => {
          // Follow HTTP redirects (GitHub releases redirect to AWS S3/CDN)
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return this.downloadFileWithRedirects(res.headers.location, destPath, onProgress, redirectCount + 1)
              .then(resolve)
              .catch(reject);
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`Download failed with HTTP status ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let transferredBytes = 0;

          const fileStream = fs.createWriteStream(destPath);

          res.on('data', (chunk) => {
            transferredBytes += chunk.length;
            if (onProgress && totalBytes > 0) {
              const percent = Math.min(100, Math.round((transferredBytes / totalBytes) * 100));
              onProgress({ percent, transferredBytes, totalBytes });
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });

          fileStream.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        })
        .on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
    });
  }
}

export const appUpdater = new AppUpdateManager();
