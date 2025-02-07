"use client";
import Link from 'next/link';
import './page.css';

import React, { useState, useRef, ChangeEvent } from 'react';


export default function Page() {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<string | ArrayBuffer | null>(null);
  
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('loadstart', () => setStatus('Start Loading'));
    fileReader.addEventListener('load', () => setStatus('Loaded'));
    fileReader.addEventListener('loadend', () => {
      setStatus('Complete');
      setResult(fileReader.result);
      const result = fileReader.result;
      console.log(result);
      
    });
    
    fileReader.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const loadingPercentage = (100 * e.loaded) / e.total;
        setProgress(loadingPercentage);
      }
    });
    fileReader.addEventListener('error', () => setStatus('Error loading file'));
    fileReader.addEventListener('abort', () => setStatus('File loading aborted'));

    fileReader.readAsText(file);
  };
  
  return (
    <div className="container">
      <h1>Summarized Text</h1>
      
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt"
        className="file-input"
      />

      {status && <p>Status: {status}</p>}
      {progress > 0 && (
        <progress value={progress} max="100">
          {progress}%
        </progress>
      )}

      <br /><br />
      <Link 
        href="/"
        className="ToSummarizerButton"
      >
        GO SUMMARIZER PAGE
      </Link>
    </div>
  );
}


