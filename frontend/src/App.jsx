// src/App.jsx
import { useState } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState('');
  
  // --- NEW: Target Size ke liye State ---
  // Default 1MB rakhte hain
  const [targetSize, setTargetSize] = useState('5'); 
  // ---

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setDownloadLink(''); 
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first!');
      return;
    }
    // Check ki target size valid hai ya nahi
    if (isNaN(targetSize) || Number(targetSize) <= 0) {
      alert('Please enter a valid target size (e.g., 1, 2.5, etc.)');
      return;
    }

    setIsLoading(true);
    setDownloadLink('');

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);
    
    // --- NEW: Target size ko bhi backend ko bhejna ---
    formData.append('targetSize', targetSize);
    // ---

    try {
      const response = await axios.post(
        'http://localhost:5000/compress-pdf',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'blob',
        }
      );

      // ... baaki ka code (Blob, fileURL) same hai ...
      const file = new Blob(
        [response.data], 
        { type: 'application/pdf' }
      );
      const fileURL = URL.createObjectURL(file);
      setDownloadLink(fileURL);
      setIsLoading(false);

    } catch (error) {
      console.error('Error uploading file:', error);
      setIsLoading(false); // Loading hamesha band karo

      
      // Check karo ki kya error response ek Blob hai
      if (error.response && error.response.data && error.response.data instanceof Blob) {
        
        // Agar Blob hai, toh usse Text mein padho
        // Yeh ek asynchronous (Promise) operation hai
        error.response.data.text().then((text) => {
          try {
            // Text ko JSON mein parse (badalna)
            const parsedError = JSON.parse(text);
            if (parsedError && parsedError.message) {
              // Ab asli AI Warning dikhao
              alert(parsedError.message);
            } else {
              alert('An unknown error occurred.');
            }
          } catch (e) {
            alert(text);
          }
        });

      } else if (error.response && error.response.data && error.response.data.message) {
        // Agar error pehle se hi JSON hai
        alert(error.response.data.message);
      } else {
        // Aakhiri fallback
        alert('Error: ' + error.message);
      }
      // --- END OF NEW LOGIC ---
    }
  };

  return (
    <>
      <h1>AI PDF Compressor</h1>
      <div className="upload-container">
        <h3>1. Upload your PDF</h3>
        <input 
          type="file" 
          accept=".pdf"
          onChange={handleFileChange} 
        />
        
        {/* --- NEW: Target Size Input Box --- */}
        {selectedFile && ( // Yeh box tabhi dikhega jab file select ho
          <div style={{ marginTop: '1rem' }}>
            <label htmlFor="size">
              <strong>2. Enter Target Size (in MB): </strong>
            </label>
            <input 
              type="number"
              min={0}
              id="size"
              value={targetSize}
              onChange={(e) => setTargetSize(e.target.value)}
              style={{ width: '60px', marginLeft: '10px' }}
            />
          </div>
        )}
        {/* --- End of New Input Box --- */}

        <br />
        <button onClick={handleUpload} disabled={isLoading}>
          {isLoading ? 'Compressing...' : 'Upload & Compress'}
        </button>

        {downloadLink && (
          <div style={{marginBottom:'10px'}}>
            <h4 style={{margin:'50px'}}>Compression Successful</h4>
            <a 
              href={downloadLink} 
              download={`compressed-${selectedFile.name}`}
              className="upload-container button"
            >
              Download Compressed File
            </a>
          </div>
        )}
      </div>
    </>
  );
}

export default App;