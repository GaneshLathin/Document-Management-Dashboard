import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import StatsCards from './components/StatsCards';
import UploadZone from './components/UploadZone';
import UploadList from './components/UploadList';
import DocumentTable from './components/DocumentTable';
import ToastContainer from './components/Toast';
import NotificationPanel from './components/NotificationPanel';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [uploads, setUploads] = useState({});
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeBatches, setActiveBatches] = useState({});
  
  // Notification Center States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const stompClientRef = useRef(null);

  // Helper to add toast notifications with custom durations
  const addToast = (title, message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, title, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch initial documents list
  const fetchDocuments = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      addToast('Error', 'Failed to retrieve document database.', 'failed');
    }
  };

  // Fetch initial notifications list
  const fetchNotifications = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Mark individual notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:8080/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await axios.put('http://localhost:8080/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Establish real-time WebSocket connection using SockJS and STOMP
  useEffect(() => {
    fetchDocuments();
    fetchNotifications();

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = (frame) => {
      console.log('Connected to WebSocket:', frame);
      setConnected(true);

      // Subscribe to real-time document processing updates
      client.subscribe('/topic/documents', (message) => {
        const updatedDoc = JSON.parse(message.body);
        console.log('Received WebSocket update:', updatedDoc);

        let statusJustCompleted = false;

        // 1. Update the document database list in-place
        setDocuments(prevDocs => {
          const index = prevDocs.findIndex(d => d.id === updatedDoc.id);
          if (index !== -1) {
            const oldDoc = prevDocs[index];
            if (oldDoc.processingStatus !== 'COMPLETED' && updatedDoc.processingStatus === 'COMPLETED') {
              statusJustCompleted = true;
            }
            const next = [...prevDocs];
            next[index] = updatedDoc;
            return next;
          } else {
            if (updatedDoc.processingStatus === 'COMPLETED') {
              statusJustCompleted = true;
            }
            return [updatedDoc, ...prevDocs];
          }
        });

        // 2. Synchronize active upload items in the side panel
        let matchedBatchId = null;
        setUploads(prevUploads => {
          const matchedKey = Object.keys(prevUploads).find(
            key => prevUploads[key].name === updatedDoc.name && prevUploads[key].status !== 'completed' && prevUploads[key].status !== 'failed'
          );

          if (matchedKey) {
            matchedBatchId = prevUploads[matchedKey].batchId;
            const updatedUpload = { ...prevUploads[matchedKey] };
            
            if (updatedDoc.processingStatus === 'PROCESSING') {
              updatedUpload.status = 'processing';
              updatedUpload.progress = 100;
            } else if (updatedDoc.processingStatus === 'COMPLETED') {
              updatedUpload.status = 'completed';
              updatedUpload.progress = 100;
            } else if (updatedDoc.processingStatus === 'FAILED') {
              updatedUpload.status = 'failed';
              updatedUpload.errorMsg = 'Background scan failed';
            }

            return {
              ...prevUploads,
              [matchedKey]: updatedUpload
            };
          }
          return prevUploads;
        });

        // 3. Trigger smart notification toast on completion
        if (statusJustCompleted) {
          if (matchedBatchId) {
            // Bulk upload batch item finished processing
            setActiveBatches(prevBatches => {
              const batch = prevBatches[matchedBatchId];
              if (!batch) return prevBatches;

              const nextPending = batch.pendingFiles - 1;
              const nextSuccess = updatedDoc.processingStatus === 'COMPLETED' ? batch.successCount + 1 : batch.successCount;
              const nextFailed = updatedDoc.processingStatus === 'FAILED' ? batch.failedCount + 1 : batch.failedCount;

              const updatedBatch = {
                ...batch,
                pendingFiles: nextPending,
                successCount: nextSuccess,
                failedCount: nextFailed
              };

              // Once ALL files in the bulk batch are processed, notify!
              if (nextPending === 0) {
                const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Save persistent bulk completion notification in database
                axios.post('http://localhost:8080/api/notifications', {
                  message: `Bulk upload completed: ${batch.totalFiles - nextFailed} of ${batch.totalFiles} files processed successfully.`,
                  type: nextFailed === batch.totalFiles ? 'failed' : 'success'
                }).catch(err => console.error("Failed to store bulk completion notification in DB", err));

                addToast(
                  'Processing Complete',
                  `${batch.totalFiles - nextFailed} of ${batch.totalFiles} files uploaded successfully at ${nowTime}`,
                  nextFailed === batch.totalFiles ? 'failed' : 'success',
                  10000 // 10s prominence
                );

                // Delete the finished batch from tracking
                const nextB = { ...prevBatches };
                delete nextB[matchedBatchId];
                return nextB;
              }

              return {
                ...prevBatches,
                [matchedBatchId]: updatedBatch
              };
            });
          } else {
            // Individual upload (3 or fewer files) -> show normal individual notification
            addToast(
              'Processing Complete',
              `"${updatedDoc.name}" has been successfully verified & stored.`,
              'success'
            );
          }
        }
      });

      // Subscribe to real-time system notifications
      client.subscribe('/topic/notifications', (message) => {
        const newNotif = JSON.parse(message.body);
        console.log('Received WebSocket notification:', newNotif);

        // Prepend new notification to state list
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });

        // Increment unread count badge
        if (!newNotif.read) {
          setUnreadCount(prev => prev + 1);
        }
      });
    };

    client.onDisconnect = () => {
      console.log('Disconnected from WebSocket');
      setConnected(false);
    };

    client.onStompError = (frame) => {
      console.error('STOMP Protocol error:', frame);
      setConnected(false);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  // Multi-file selection upload handler with Smart Notifications
  const handleFilesSelected = (files) => {
    const fileCount = files.length;
    const isBulk = fileCount > 3;
    const batchId = isBulk ? 'batch_' + Date.now() : null;

    if (isBulk) {
      // Immediately register the batch in active batches state
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setActiveBatches(prev => ({
        ...prev,
        [batchId]: {
          id: batchId,
          totalFiles: fileCount,
          pendingFiles: fileCount,
          successCount: 0,
          failedCount: 0,
          timestamp: nowTime
        }
      }));

      // Immediately show bulk upload progress banner toast
      addToast(
        'Bulk Upload Started',
        `Upload in progress — processing ${fileCount} files in background.`,
        'info',
        8000
      );
    }

    files.forEach(file => {
      const uploadId = 'up_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      
      // Add record to uploads progress drawer with batchId attached if bulk
      const newUpload = {
        id: uploadId,
        batchId: batchId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending',
        errorMsg: ''
      };

      setUploads(prev => ({
        ...prev,
        [uploadId]: newUpload
      }));

      // Launch actual file upload using Axios
      const formData = new FormData();
      formData.append('file', file);

      axios.post('http://localhost:8080/api/documents/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          setUploads(prev => {
            if (!prev[uploadId]) return prev;
            return {
              ...prev,
              [uploadId]: {
                ...prev[uploadId],
                status: percentCompleted === 100 ? 'storing' : 'uploading',
                progress: percentCompleted
              }
            };
          });
        }
      })
      .then(response => {
        // Backend successfully uploaded file
        const savedDoc = response.data;
        console.log('File upload response:', savedDoc);

        setUploads(prev => {
          if (!prev[uploadId]) return prev;
          return {
            ...prev,
            [uploadId]: {
              ...prev[uploadId],
              status: 'completed',
              progress: 100
            }
          };
        });
      })
      .catch(err => {
        console.error('Error uploading file:', err);
        setUploads(prev => {
          if (!prev[uploadId]) return prev;
          return {
            ...prev,
            [uploadId]: {
              ...prev[uploadId],
              status: 'failed',
              errorMsg: 'Cloud upload failed'
            }
          };
        });

        if (isBulk) {
          // If bulk, decrement pending count for the batch in case of error
          setActiveBatches(prevBatches => {
            const batch = prevBatches[batchId];
            if (!batch) return prevBatches;

            const nextPending = batch.pendingFiles - 1;
            const nextFailed = batch.failedCount + 1;

            if (nextPending === 0) {
              const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              // Save persistent bulk completion notification with failures in database
              axios.post('http://localhost:8080/api/notifications', {
                message: `Bulk upload completed: ${batch.totalFiles - nextFailed} of ${batch.totalFiles} files processed successfully.`,
                type: nextFailed === batch.totalFiles ? 'failed' : 'success'
              }).catch(err => console.error("Failed to store bulk completion notification in DB", err));

              addToast(
                'Processing Complete',
                `${batch.totalFiles - nextFailed} of ${batch.totalFiles} files uploaded successfully at ${nowTime}`,
                nextFailed === batch.totalFiles ? 'failed' : 'success',
                10000
              );
              const nextB = { ...prevBatches };
              delete nextB[batchId];
              return nextB;
            }

            return {
              ...prevBatches,
              [batchId]: {
                ...batch,
                pendingFiles: nextPending,
                failedCount: nextFailed
              }
            };
          });
        } else {
          addToast('Upload Failed', `Could not upload "${file.name}" to cloud storage.`, 'failed');
          axios.post('http://localhost:8080/api/notifications', {
            message: `Upload failed: Could not upload "${file.name}" to cloud storage.`,
            type: 'failed'
          }).catch(err => console.error("Failed to store individual upload failure in DB", err));
        }
      });
    });
  };

  const handleRemoveUpload = (uploadId) => {
    setUploads(prev => {
      const next = { ...prev };
      delete next[uploadId];
      return next;
    });
  };

  // Delete Document Handler
  const handleDeleteDocument = async (id) => {
    const docToDelete = documents.find(d => d.id === id);
    if (!docToDelete) return;

    try {
      await axios.delete(`http://localhost:8080/api/documents/${id}`);
      setDocuments(prev => prev.filter(d => d.id !== id));
      addToast(
        'Document Deleted',
        `"${docToDelete.name}" was successfully removed from S3 storage.`,
        'info'
      );
    } catch (err) {
      console.error('Error deleting document:', err);
      addToast('Error', 'Failed to delete file from servers.', 'failed');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Premium Navigation Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon">DM</div>
            <div className="brand-name">DocFlow</div>
          </div>

          <ul className="nav-list">
            <li className="nav-item active">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              Overview
            </li>
          </ul>
        </div>

        {/* Real-time Connection Status Indicator */}
        <div className={`connection-indicator ${connected ? 'connected' : 'disconnected'}`}>
          <span className="indicator-dot"></span>
          {connected ? 'Live Sync Active' : 'Connecting to Server...'}
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Document Management</h1>
            <p className="dashboard-subtitle">Upload, secure, and process enterprise files in real time.</p>
          </div>

          <div className="notification-container">
            <button 
              className="bell-btn" 
              onClick={() => setShowNotifications(prev => !prev)}
              title="Toggle notifications"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="bell-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <NotificationPanel
                notifications={notifications}
                onMarkRead={handleMarkAsRead}
                onMarkAllRead={handleMarkAllAsRead}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>
        </header>

        {/* Real-time Stats Cards */}
        <StatsCards documents={documents} uploads={uploads} />

        {/* Work Area Grid */}
        <div className="work-grid">
          {/* Left Column: Drag-and-drop & active uploads list */}
          <div>
            <div className="card-panel">
              <div className="panel-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Center
              </div>
              <UploadZone onFilesSelected={handleFilesSelected} />
            </div>

            {/* List showing active uploads and their progress */}
            <UploadList uploads={uploads} onRemoveUpload={handleRemoveUpload} />
          </div>

          {/* Right Column: Database Table */}
          <div>
            {/* Table controls (Search box) */}
            <div className="table-controls">
              <div className="search-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="search-icon">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Main Interactive Table */}
            <DocumentTable
              documents={documents}
              searchQuery={searchQuery}
              onView={(doc) => setSelectedPdf(doc)}
              onDelete={handleDeleteDocument}
            />
          </div>
        </div>
      </main>

      {/* Real-time Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* PDF View Overlay Modal */}
      {selectedPdf && (
        <div className="modal-overlay" onClick={() => setSelectedPdf(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" title={selectedPdf.name}>
                {selectedPdf.name}
              </h2>
              <button className="modal-close-btn" onClick={() => setSelectedPdf(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Proxying the download endpoint allows viewing private PDFs in safety */}
              <iframe
                title="PDF Preview"
                className="pdf-iframe"
                src={`http://localhost:8080/api/documents/download/${selectedPdf.id}?inline=true#toolbar=0`}
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
