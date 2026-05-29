import React from 'react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function UploadItem({ upload, onRemove }) {
  const { name, size, progress, status, errorMsg } = upload;

  const getProgressClass = () => {
    if (status === 'completed') return 'completed';
    if (status === 'failed') return 'failed';
    if (status === 'processing') return 'processing';
    return '';
  };

  const getBadgeText = () => {
    if (status === 'pending') return 'Queued';
    if (status === 'uploading') return `Uploading ${progress}%`;
    if (status === 'storing') return 'Storing in Cloud';
    if (status === 'processing') return 'Analyzing (OCR)';
    if (status === 'completed') return 'Ready';
    if (status === 'failed') return 'Failed';
    return status;
  };

  return (
    <div className="upload-item">
      <div className="upload-item-header">
        <div className="upload-item-info">
          <div className="upload-item-name" title={name}>{name}</div>
          <div className="upload-item-meta">{formatBytes(size)}</div>
        </div>
        <span className={`upload-item-badge ${status}`}>
          {getBadgeText()}
        </span>
      </div>

      <div className="progress-container">
        <div className="progress-track">
          <div 
            className={`progress-fill ${getProgressClass()}`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-stats">
          <span>{status === 'failed' ? errorMsg || 'Network error' : ''}</span>
          <span>{progress}%</span>
        </div>
      </div>
      
      {(status === 'completed' || status === 'failed') && (
        <button 
          onClick={() => onRemove(upload.id)} 
          style={{
            alignSelf: 'flex-end',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            textDecoration: 'underline',
            marginTop: '-0.25rem'
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
