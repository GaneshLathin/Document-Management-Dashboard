import React from 'react';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function DocumentTable({ documents, onView, onDelete, searchQuery }) {
  const docList = documents || [];

  // Filter and Sort
  const filteredDocs = docList
    .filter(doc => doc.name.toLowerCase().includes((searchQuery || '').toLowerCase()))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="card-panel table-panel">
      <div className="panel-title">
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Document Database
      </div>

      {filteredDocs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3>No documents found</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {searchQuery ? 'Adjust your search term or upload a new PDF.' : 'Upload your first PDF document to get started.'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>File Size</th>
                <th>Upload Date</th>
                <th>Verification Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => {
                const isProcessing = doc.processingStatus === 'PROCESSING';
                const isCompleted = doc.processingStatus === 'COMPLETED';
                const isFailed = doc.processingStatus === 'FAILED' || doc.uploadStatus === 'FAILED';

                return (
                  <tr key={doc.id} className="doc-row">
                    <td>
                      <div className="doc-name-cell">
                        <div className="doc-pdf-icon">PDF</div>
                        <div className="doc-name-text" title={doc.name}>
                          {doc.name}
                        </div>
                      </div>
                    </td>
                    <td>{formatBytes(doc.fileSize)}</td>
                    <td>{formatDate(doc.createdAt)}</td>
                    <td>
                      {isProcessing && (
                        <span className="status-indicator processing">
                          <span className="spinner"></span> OCR / Indexing
                        </span>
                      )}
                      {isCompleted && (
                        <span className="status-indicator completed">
                          <span className="status-dot"></span> Securely Indexed
                        </span>
                      )}
                      {isFailed && (
                        <span className="status-indicator failed">
                          <span className="status-dot"></span> Verification Failed
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        {/* View Action */}
                        <button
                          className="btn-action"
                          onClick={() => onView(doc)}
                          title="View PDF"
                          disabled={isFailed}
                          style={{ opacity: isFailed ? 0.4 : 1, cursor: isFailed ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {/* Download Action */}
                        <a
                          className="btn-action"
                          href={`http://localhost:8080/api/documents/download/${doc.id}`}
                          download
                          title="Download File"
                          style={{ textDecoration: 'none' }}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>

                        {/* Delete Action */}
                        <button
                          className="btn-action btn-delete"
                          onClick={() => onDelete(doc.id)}
                          title="Delete File"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
