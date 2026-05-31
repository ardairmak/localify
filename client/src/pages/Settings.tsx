import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, RefreshCw, CheckCircle, Music2 } from 'lucide-react';
import { getLibrarySettings, saveLibrarySettings, startScan, getScanStatus } from '../api';
import Spinner from '../components/ui/Spinner';
import FolderPicker from '../components/ui/FolderPicker';

export default function Settings() {
  const qc = useQueryClient();
  const [folderPath, setFolderPath] = useState('');
  const [polling, setPolling] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['library-settings'],
    queryFn: getLibrarySettings,
  });

  const { data: scanStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['scan-status'],
    queryFn: getScanStatus,
    refetchInterval: polling ? 1000 : false,
  });

  useEffect(() => {
    if (settings?.music_folder_path) {
      setFolderPath(settings.music_folder_path);
    }
  }, [settings]);

  useEffect(() => {
    if (scanStatus && !scanStatus.isScanning && polling) {
      setPolling(false);
      qc.invalidateQueries({ queryKey: ['songs'] });
      qc.invalidateQueries({ queryKey: ['artists'] });
      qc.invalidateQueries({ queryKey: ['albums'] });
    }
  }, [scanStatus, polling, qc]);

  const saveMut = useMutation({
    mutationFn: () => saveLibrarySettings(folderPath.trim()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library-settings'] }),
  });

  const scanMut = useMutation({
    mutationFn: () => startScan(folderPath.trim() || undefined),
    onSuccess: () => {
      setPolling(true);
      refetchStatus();
    },
  });

  const isScanning = scanStatus?.isScanning;
  const progress = isScanning && scanStatus.total > 0
    ? Math.round((scanStatus.processed / scanStatus.total) * 100)
    : 0;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Library section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Music Library</h2>

        <div className="bg-sp-elevated rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-sp-muted mb-2">Music folder path</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <FolderOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sp-faint" />
                <input
                  type="text"
                  value={folderPath}
                  onChange={e => setFolderPath(e.target.value)}
                  placeholder="/Users/you/Music"
                  className="w-full bg-sp-hover border border-sp-faint rounded-lg pl-9 pr-28 py-3 text-sm focus:outline-none focus:border-sp-text"
                />
                <button
                  onClick={() => setShowPicker(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold text-sp-muted hover:text-sp-text bg-sp-elevated hover:bg-sp-hover rounded-md transition-colors"
                >
                  Browse…
                </button>
              </div>
              <button
                onClick={() => saveMut.mutate()}
                disabled={!folderPath.trim() || saveMut.isPending}
                className="px-4 py-2 bg-sp-green text-black font-semibold rounded-lg text-sm hover:bg-sp-green-hover transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {saveMut.isPending ? <Spinner size={16} /> : 'Save'}
              </button>
            </div>
            {saveMut.isSuccess && (
              <p className="text-sp-green text-xs mt-2 flex items-center gap-1">
                <CheckCircle size={12} /> Saved
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-sp-hover">
            <button
              onClick={() => scanMut.mutate()}
              disabled={isScanning || scanMut.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-sp-text text-sp-black font-semibold rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
              {isScanning ? 'Scanning...' : 'Scan Library'}
            </button>

            {isScanning && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-sp-muted mb-2">
                  <span>
                    {scanStatus?.currentFile ? `Processing: ${scanStatus.currentFile}` : 'Finding files...'}
                  </span>
                  <span>{scanStatus?.processed ?? 0} / {scanStatus?.total ?? 0}</span>
                </div>
                <div className="w-full bg-sp-hover rounded-full h-1.5">
                  <div
                    className="bg-sp-green h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {!isScanning && scanStatus?.lastScanAt && (
              <p className="text-xs text-sp-muted mt-3">
                Last scan: {new Date(scanStatus.lastScanAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </section>

      {showPicker && (
        <FolderPicker
          initialPath={folderPath || undefined}
          onSelect={(p) => { setFolderPath(p); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Stats */}
      {scanStatus?.stats && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Library Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Songs', value: scanStatus.stats.total_songs },
              { label: 'Artists', value: scanStatus.stats.total_artists },
              { label: 'Albums', value: scanStatus.stats.total_albums },
            ].map(stat => (
              <div key={stat.label} className="bg-sp-elevated rounded-xl p-5 text-center">
                <Music2 size={24} className="text-sp-green mx-auto mb-2" />
                <p className="text-3xl font-bold text-sp-text">{stat.value.toLocaleString()}</p>
                <p className="text-sp-muted text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
