import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Download,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowUpCircle,
  Loader2,
} from 'lucide-react';
import { UpdateInfo, UpdateProgress } from '../../types';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUpdateInfo?: UpdateInfo | null;
}

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  initialUpdateInfo,
}) => {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(initialUpdateInfo || null);
  const [progress, setProgress] = useState<UpdateProgress>({ percent: 0, transferredBytes: 0, totalBytes: 0 });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI?.isElectron);

  useEffect(() => {
    if (!isOpen) return;

    if (initialUpdateInfo) {
      setUpdateInfo(initialUpdateInfo);
      if (initialUpdateInfo.hasUpdate) {
        setStatus('available');
      } else {
        setStatus('up-to-date');
      }
    } else {
      checkForUpdates();
    }
  }, [isOpen, initialUpdateInfo]);

  useEffect(() => {
    if (!isElectron) return;

    const api = (window as any).electronAPI;
    if (api?.onUpdateProgress) {
      api.onUpdateProgress((p: UpdateProgress) => {
        setProgress(p);
      });
    }
  }, [isElectron]);

  const checkForUpdates = async () => {
    setStatus('checking');
    setErrorMessage('');

    if (!isElectron) {
      // Browser fallback simulation or note
      setTimeout(() => {
        setStatus('up-to-date');
        setUpdateInfo({
          hasUpdate: false,
          currentVersion: '1.0.3',
          latestVersion: '1.0.3',
          releaseName: 'MeTric Web Preview',
          releaseNotes: 'You are viewing the web preview of MeTric.',
          releaseDate: new Date().toISOString(),
          releaseUrl: 'https://github.com/abhidhakal/me-tric/releases',
          assetName: '',
          assetSize: 0,
          downloadUrl: '',
        });
      }, 700);
      return;
    }

    try {
      const info: UpdateInfo = await (window as any).electronAPI.checkForUpdates();
      setUpdateInfo(info);
      if (info.hasUpdate) {
        setStatus('available');
      } else {
        setStatus('up-to-date');
      }
    } catch (err: any) {
      console.error('Update check error:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Failed to check for updates. Please verify your internet connection.');
    }
  };

  const handleStartDownload = async () => {
    if (!updateInfo?.downloadUrl) return;

    setStatus('downloading');
    setProgress({ percent: 0, transferredBytes: 0, totalBytes: updateInfo.assetSize || 0 });

    try {
      await (window as any).electronAPI.downloadUpdate(updateInfo.downloadUrl);
      setStatus('ready');
    } catch (err: any) {
      console.error('Download error:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Failed to download update.');
    }
  };

  const handleInstallAndRestart = async () => {
    try {
      await (window as any).electronAPI.installUpdate();
    } catch (err: any) {
      console.error('Install error:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Failed to trigger automatic installation.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 520, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <ArrowUpCircle size={17} strokeWidth={2} />
            </div>
            <div>
              <h3 className="modal-title">Software Update</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Current Version: v{updateInfo?.currentVersion || '1.0.3'}
              </span>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body Content based on Status */}
        <div style={{ margin: '20px 0 24px' }}>
          {status === 'checking' && (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <Loader2
                size={30}
                className="spin-animation"
                style={{
                  color: 'var(--text-secondary)',
                  margin: '0 auto 14px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>
                Checking for updates...
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Connecting to GitHub Releases to check latest builds
              </p>
            </div>
          )}

          {status === 'up-to-date' && (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: '#22c55e',
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                MeTric is Up to Date
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto' }}>
                You are running the latest version <strong style={{ color: '#ffffff' }}>v{updateInfo?.currentVersion || '1.0.3'}</strong>. No updates needed.
              </p>
            </div>
          )}

          {status === 'available' && updateInfo && (
            <div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                        MeTric v{updateInfo.latestVersion}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        New Release
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {updateInfo.assetName} · {formatBytes(updateInfo.assetSize)}
                    </div>
                  </div>

                  <a
                    href={updateInfo.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'none',
                    }}
                    title="View release notes on GitHub"
                  >
                    <span>GitHub</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Release Notes */}
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    What's New in this Version
                  </div>
                  <div
                    style={{
                      maxHeight: 160,
                      overflowY: 'auto',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.55,
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'downloading' && (
            <div style={{ padding: '10px 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff' }}>
                  Downloading Update...
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                  {progress.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  width: '100%',
                  height: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '100px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${progress.percent}%`,
                    height: '100%',
                    background: '#ffffff',
                    borderRadius: '100px',
                    transition: 'width 0.2s ease',
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  {formatBytes(progress.transferredBytes)} of {formatBytes(progress.totalBytes)}
                </span>
                <span>Streaming from GitHub CDN</span>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: '#ffffff',
                }}
              >
                <Sparkles size={22} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                Update Ready to Install!
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
                The update package has been verified and downloaded. Click below to restart MeTric and apply the update.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: '#ef4444',
                }}
              >
                <AlertCircle size={22} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                Update Check Failed
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 16px' }}>
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 14,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {status !== 'downloading' ? (
            <button
              type="button"
              className="chip-btn"
              onClick={checkForUpdates}
              disabled={status === 'checking'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}
            >
              <RotateCw size={12} className={status === 'checking' ? 'spin-animation' : ''} />
              <span>Check Again</span>
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {status === 'available' && (
              <>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Later
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStartDownload}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={15} />
                  <span>Download & Install</span>
                </button>
              </>
            )}

            {status === 'ready' && (
              <>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Install on Next Launch
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleInstallAndRestart}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RotateCw size={15} />
                  <span>Restart & Install Now</span>
                </button>
              </>
            )}

            {(status === 'up-to-date' || status === 'error') && (
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
