import React from 'react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function StatsCards({ documents, uploads }) {
  const docList = documents || [];
  const activeUploads = Object.values(uploads || {});

  // Calculations
  const totalFiles = docList.length;
  const totalSizeBytes = docList.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
  const totalSizeFormatted = formatBytes(totalSizeBytes);

  const processingCount = docList.filter(d => d.processingStatus === 'PROCESSING').length;
  
  const uploadingCount = activeUploads.filter(
    u => u.status === 'uploading' || u.status === 'pending' || u.status === 'storing'
  ).length;

  return (
    <div className="stats-grid">
      {/* Total Files Card */}
      <div className="stats-card">
        <div>
          <div className="stats-label">Total Documents</div>
          <div className="stats-value">{totalFiles}</div>
        </div>
        <div className="stats-meta">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Active in secure storage
        </div>
      </div>

      {/* Storage Capacity Card */}
      <div className="stats-card success">
        <div>
          <div className="stats-label">Cloud Space Used</div>
          <div className="stats-value">{totalSizeFormatted}</div>
        </div>
        <div className="stats-meta">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          AWS S3 events-image-details
        </div>
      </div>

      {/* Uploading Queue Card */}
      <div className="stats-card pending">
        <div>
          <div className="stats-label">Active Uploads</div>
          <div className="stats-value">
            {uploadingCount > 0 ? (
              <span className="status-indicator processing">
                <span className="spinner"></span> {uploadingCount}
              </span>
            ) : (
              uploadingCount
            )}
          </div>
        </div>
        <div className="stats-meta">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Files transferring to backend
        </div>
      </div>

      {/* Background Processing Queue Card */}
      <div className="stats-card processing">
        <div>
          <div className="stats-label">OCR/Scanning Queue</div>
          <div className="stats-value">
            {processingCount > 0 ? (
              <span style={{ color: 'var(--status-processing)' }}>
                <span className="spinner" style={{ marginRight: '6px' }}></span>
                {processingCount}
              </span>
            ) : (
              processingCount
            )}
          </div>
        </div>
        <div className="stats-meta">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Asynchronous OCR & security
        </div>
      </div>
    </div>
  );
}
