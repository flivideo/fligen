import { useState, useEffect } from 'react';

interface BatchJob {
  batch_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  total_cost: number;
  total_time_ms: number;
  created_at: string;
}

export function Day15BatchGen() {
  const [uploading, setUploading] = useState(false);
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Poll active batches every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      batches.forEach((batch) => {
        if (batch.status === 'processing' || batch.status === 'queued') {
          fetchBatchStatus(batch.batch_id);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [batches]);

  const fetchBatchStatus = async (batchId: string) => {
    try {
      const response = await fetch(`http://localhost:5401/api/image/batch/${batchId}`);
      const data = await response.json();

      setBatches((prev) => prev.map((b) => (b.batch_id === batchId ? data : b)));
    } catch (error) {
      console.error('Failed to fetch batch status:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
    } else {
      alert('Please select a CSV file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a CSV file first');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:5401/api/image/batch/upload-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Add new batch to list
      const newBatch: BatchJob = {
        batch_id: data.batch_id,
        status: 'queued',
        progress: {
          total: data.active_prompts,
          completed: 0,
          failed: 0,
          pending: data.active_prompts,
        },
        total_cost: 0,
        total_time_ms: 0,
        created_at: new Date().toISOString(),
      };

      setBatches((prev) => [newBatch, ...prev]);
      setSelectedFile(null);

      // Clear file input
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      alert(
        `Batch started! ID: ${data.batch_id}\n${data.active_prompts} images will be generated.`
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload CSV. Check console for details.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadCSV = async (batchId: string) => {
    try {
      // First update the CSV
      await fetch(`http://localhost:5401/api/image/batch/${batchId}/update-csv`, {
        method: 'POST',
      });

      // Then download it
      window.open(`http://localhost:5401/api/image/batch/${batchId}/download-csv`, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download CSV. Check console for details.');
    }
  };

  const getProgressPercent = (batch: BatchJob): number => {
    if (batch.progress.total === 0) return 0;
    return Math.round((batch.progress.completed / batch.progress.total) * 100);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'queued':
        return 'text-blue-400';
      case 'processing':
        return 'text-yellow-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-100">Batch Generation</h1>
          <p className="text-slate-400">
            Upload CSV files to generate images in bulk. Perfect for VibeDeck mockup generation.
          </p>
        </div>
        {/* Upload Section */}
        <div className="rounded-lg bg-slate-800 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-200">Upload CSV</h3>

          <div className="space-y-4">
            <div>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-slate-400
                  file:mr-4 file:rounded-md file:border-0
                  file:bg-blue-600 file:px-4 file:py-2
                  file:text-sm file:font-semibold file:text-white
                  hover:file:bg-blue-700"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-slate-400">
                  Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </p>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="rounded-md bg-blue-600 px-6 py-2 font-semibold text-white
                transition hover:bg-blue-700 disabled:cursor-not-allowed
                disabled:bg-slate-700 disabled:text-slate-500"
            >
              {uploading ? 'Uploading...' : 'Upload and Start Batch'}
            </button>
          </div>

          <div className="mt-4 rounded-md bg-slate-900 p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-300">CSV Format</h4>
            <pre className="text-xs text-slate-400">
              a,category,filename,prompt,provider,model{'\n'}
              1,design,img-001,&quot;Your prompt here&quot;,kie,flux-kontext-pro{'\n'}
              1,design,img-002,&quot;Another prompt&quot;,fal,flux-schnell
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              • a=1: Process | a=0: Skip | a=9: Already processed
            </p>
          </div>
        </div>

        {/* Batch List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200">Active Batches</h3>

          {batches.length === 0 ? (
            <div className="rounded-lg bg-slate-800 p-8 text-center">
              <p className="text-slate-400">No batches yet. Upload a CSV to get started.</p>
            </div>
          ) : (
            batches.map((batch) => (
              <div key={batch.batch_id} className="rounded-lg bg-slate-800 p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm text-slate-400">{batch.batch_id}</p>
                    <p className={`text-sm font-semibold ${getStatusColor(batch.status)}`}>
                      {batch.status.toUpperCase()}
                    </p>
                  </div>
                  {batch.status === 'completed' && (
                    <button
                      onClick={() => handleDownloadCSV(batch.batch_id)}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold
                        text-white transition hover:bg-green-700"
                    >
                      Download CSV
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-300">
                      {batch.progress.completed} / {batch.progress.total} images
                    </span>
                    <span className="text-slate-400">{getProgressPercent(batch)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${getProgressPercent(batch)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-slate-400">Completed</p>
                    <p className="font-semibold text-green-400">{batch.progress.completed}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Failed</p>
                    <p className="font-semibold text-red-400">{batch.progress.failed}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Pending</p>
                    <p className="font-semibold text-yellow-400">{batch.progress.pending}</p>
                  </div>
                </div>

                {batch.status === 'completed' && (
                  <div className="mt-4 flex justify-between border-t border-slate-700 pt-4 text-sm">
                    <div>
                      <span className="text-slate-400">Total Cost: </span>
                      <span className="font-semibold text-slate-300">
                        ${batch.total_cost.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Time: </span>
                      <span className="font-semibold text-slate-300">
                        {Math.round(batch.total_time_ms / 1000)}s
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Help Text */}
        <div className="rounded-lg bg-slate-900 p-4 text-sm text-slate-400">
          <p className="mb-2 font-semibold text-slate-300">💡 Tips:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Images are saved to: <code className="text-slate-300">/assets/catalog/images/</code>
            </li>
            <li>Use KIE flux-kontext-pro for $0.004/image (best value)</li>
            <li>Batch processing is sequential with 5s delay to avoid rate limits</li>
            <li>Download the updated CSV to see which images completed (a=9)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
