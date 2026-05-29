import React, { useState, useRef } from 'react';

export default function UploadZone({ onFilesSelected }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
      if (pdfFiles.length > 0) {
        onFilesSelected(pdfFiles);
      } else {
        alert('Please drop only PDF files.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
      if (pdfFiles.length > 0) {
        onFilesSelected(pdfFiles);
      } else {
        alert('Please select only PDF files.');
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div
      className={`dropzone ${dragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="file-input"
        multiple
        accept="application/pdf"
        onClick={(e) => e.stopPropagation()}
        onChange={handleFileChange}
      />
      
      <div className="dropzone-icon-container">
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      
      <div className="dropzone-text">
        Drag & Drop files here or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Browse</span>
      </div>
      <div className="dropzone-subtext">Supports single and bulk PDF documents up to 50MB</div>
    </div>
  );
}
