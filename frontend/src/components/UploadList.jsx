import React, { useState } from 'react';
import UploadItem from './UploadItem';

// Sub-component to manage bulk upload progress in a collapsible grouping
function BulkBatchGroup({ batchId, uploads, onRemoveUpload }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const total = uploads.length;
  const completed = uploads.filter(u => u.status === 'completed').length;
  const failed = uploads.filter(u => u.status === 'failed').length;
  const processing = uploads.filter(u => u.status === 'processing').length;
  const inProgress = total - completed - failed;

  // Calculate overall average progress of the batch
  const averageProgress = Math.round(uploads.reduce((acc, u) => acc + (u.progress || 0), 0) / total);

  // Status mapping for bulk header
  let batchStatus = 'uploading';
  if (failed === total) batchStatus = 'failed';
  else if (completed === total) batchStatus = 'completed';
  else if (processing > 0) batchStatus = 'processing';

  const getStatusLabel = () => {
    if (batchStatus === 'completed') return 'Ready';
    if (batchStatus === 'failed') return 'Failed';
    if (batchStatus === 'processing') return 'Scanning...';
    return `${averageProgress}%`;
  };

  return (
    <div className="upload-item" style={{ borderLeft: '4px solid var(--color-primary)' }}>
      {/* Collapsible Bulk Header */}
      <div 
        className="upload-item-header" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div className="upload-item-info">
          <div className="upload-item-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <span>Bulk Batch ({total} files)</span>
            <svg 
              width="12" 
              height="12" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
              style={{ 
                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', 
                transition: 'transform 0.2s ease-in-out',
                color: 'var(--color-primary)'
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="upload-item-meta" style={{ fontSize: '0.75rem' }}>
            {completed} of {total} completed {failed > 0 && `(${failed} failed)`}
          </div>
        </div>
        <span className={`upload-item-badge ${batchStatus}`}>
          {getStatusLabel()}
        </span>
      </div>

      {/* Overall Progress Bar */}
      <div className="progress-container" style={{ marginTop: '0.25rem' }}>
        <div className="progress-track" style={{ height: '5px' }}>
          <div 
            className={`progress-fill ${batchStatus === 'processing' ? 'processing' : ''} ${batchStatus}`} 
            style={{ width: `${averageProgress}%` }}
          ></div>
        </div>
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', textAlign: 'right' }}>
        {isCollapsed ? 'Click to expand details' : 'Click to collapse details'}
      </div>

      {/* Expanded individual items in minimized state */}
      {!isCollapsed && (
        <div 
          style={{ 
            marginTop: '0.85rem', 
            paddingTop: '0.85rem', 
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxHeight: '260px',
            overflowY: 'auto',
            paddingRight: '0.25rem'
          }}
        >
          {uploads.map(upload => (
            <UploadItem 
              key={upload.id} 
              upload={upload} 
              onRemove={onRemoveUpload} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function UploadList({ uploads, onRemoveUpload }) {
  const uploadArray = Object.values(uploads);

  if (uploadArray.length === 0) {
    return null;
  }

  // Group active upload array by batchId
  const groups = {};
  uploadArray.forEach(upload => {
    const key = upload.batchId || 'standalone';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(upload);
  });

  return (
    <div className="card-panel" style={{ marginTop: '1.5rem' }}>
      <div className="panel-title">
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        Transfers & Processing
      </div>
      <div className="upload-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Object.keys(groups).map(key => {
          const group = groups[key];
          // If standalone, or bulk but 3 or fewer files, render inline normally
          if (key === 'standalone' || group.length <= 3) {
            return group.map(upload => (
              <UploadItem 
                key={upload.id} 
                upload={upload} 
                onRemove={onRemoveUpload} 
              />
            ));
          }
          // Otherwise render in collapsible container
          return (
            <BulkBatchGroup 
              key={key} 
              batchId={key} 
              uploads={group} 
              onRemoveUpload={onRemoveUpload} 
            />
          );
        })}
      </div>
    </div>
  );
}
