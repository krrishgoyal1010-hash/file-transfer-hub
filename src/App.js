import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, FileText, Check, AlertCircle, Wifi, Trash2, RefreshCw, Users } from 'lucide-react';

export default function FileTransferApp() {
  const [mode, setMode] = useState('client');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [serverFiles, setServerFiles] = useState([]);
  const [selectedServerFile, setSelectedServerFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');
  const [userNameSet, setUserNameSet] = useState(false);
  const fileInputRef = useRef(null);

  // Load files from shared storage on mount
  useEffect(() => {
    loadServerFiles();
  }, []);

  const loadServerFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.storage.list('file:', true);
      
      if (result && result.keys) {
        const filesData = await Promise.all(
          result.keys.map(async (key) => {
            try {
              const fileResult = await window.storage.get(key, true);
              if (fileResult && fileResult.value) {
                return JSON.parse(fileResult.value);
              }
            } catch (err) {
              console.error(`Error loading file ${key}:`, err);
            }
            return null;
          })
        );
        
        setServerFiles(filesData.filter(f => f !== null));
      }
    } catch (err) {
      console.error('Error loading server files:', err);
      setServerFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setUploadComplete(false);
    setUploadProgress(0);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const simulateUpload = async () => {
    if (!file || !userNameSet) return;
    
    setUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      
      const interval = setInterval(async () => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // Wait for progress to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      clearInterval(interval);
      setUploadProgress(100);

      // Save to shared storage
      try {
        const fileData = {
          id: `file:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toLocaleString(),
          uploadedBy: userName,
          data: base64Data
        };

        await window.storage.set(fileData.id, JSON.stringify(fileData), true);
        
        setUploading(false);
        setUploadComplete(true);
        
        // Reload files to show the new upload
        await loadServerFiles();
      } catch (err) {
        console.error('Error uploading file:', err);
        setError('Failed to upload file. Please try again.');
        setUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const simulateDownload = () => {
    if (!selectedServerFile) return;
    
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadComplete(false);

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloading(false);
          setDownloadComplete(true);
          
          // Trigger actual download
          const link = document.createElement('a');
          link.href = selectedServerFile.data;
          link.download = selectedServerFile.name;
          link.click();
          
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const deleteFile = async (fileToDelete) => {
    try {
      await window.storage.delete(fileToDelete.id, true);
      await loadServerFiles();
      if (selectedServerFile?.id === fileToDelete.id) {
        setSelectedServerFile(null);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!userNameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-6 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
          <Users className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
          <h2 className="text-3xl font-bold text-white text-center mb-4">Welcome to File Transfer Hub</h2>
          <p className="text-cyan-200 text-center mb-6">Enter your name to start sharing files with others</p>
          
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name..."
            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-4"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && userName.trim()) {
                setUserNameSet(true);
              }
            }}
          />
          
          <button
            onClick={() => userName.trim() && setUserNameSet(true)}
            disabled={!userName.trim()}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              userName.trim()
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105'
                : 'bg-gray-500 cursor-not-allowed'
            } text-white`}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wifi className="w-12 h-12 text-cyan-400 animate-pulse" />
            <h1 className="text-5xl font-bold text-white">File Transfer Hub</h1>
          </div>
          <p className="text-cyan-200 text-lg">Multi-User File Sharing • Logged in as: <span className="font-semibold text-white">{userName}</span></p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-white">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-white hover:text-red-200">✕</button>
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setMode('client')}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
              mode === 'client'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Upload className="inline-block mr-2 w-6 h-6" />
            Client (Upload)
          </button>
          <button
            onClick={() => setMode('server')}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
              mode === 'server'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/50'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Download className="inline-block mr-2 w-6 h-6" />
            Server (Download)
          </button>
        </div>

        {/* Client Mode - Upload */}
        {mode === 'client' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Upload className="w-8 h-8 text-cyan-400" />
              Upload File to Server
            </h2>

            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-400/20'
                  : 'border-white/30 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10'
              }`}
            >
              <FileText className="w-20 h-20 mx-auto mb-4 text-cyan-300" />
              <p className="text-white text-xl mb-2">Drag & drop your file here</p>
              <p className="text-cyan-200 mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* Selected File Info */}
            {file && (
              <div className="mt-6 bg-white/10 rounded-xl p-6 border border-cyan-400/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-cyan-400" />
                    <div>
                      <p className="text-white font-semibold text-lg">{file.name}</p>
                      <p className="text-cyan-200">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  {uploadComplete && (
                    <Check className="w-8 h-8 text-green-400" />
                  )}
                </div>

                {/* Progress Bar */}
                {(uploading || uploadComplete) && (
                  <div className="mb-4">
                    <div className="flex justify-between text-white mb-2">
                      <span>Upload Progress</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={simulateUpload}
                  disabled={uploading || uploadComplete}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    uploading || uploadComplete
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105'
                  } text-white`}
                >
                  {uploading ? 'Uploading...' : uploadComplete ? 'Upload Complete!' : 'Upload to Server'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Server Mode - Download */}
        {mode === 'server' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Download className="w-8 h-8 text-pink-400" />
                Download Files from Server
              </h2>
              <button
                onClick={loadServerFiles}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 mx-auto mb-4 text-pink-300 animate-spin" />
                <p className="text-white text-xl">Loading files...</p>
              </div>
            ) : serverFiles.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-pink-300" />
                <p className="text-white text-xl">No files available on server</p>
                <p className="text-pink-200 mt-2">Upload files in Client mode to share with others</p>
              </div>
            ) : (
              <div className="space-y-4">
                {serverFiles.map((serverFile) => (
                  <div
                    key={serverFile.id}
                    className={`bg-white/10 rounded-xl p-6 border transition-all cursor-pointer ${
                      selectedServerFile?.id === serverFile.id
                        ? 'border-pink-400 bg-pink-400/20'
                        : 'border-white/30 hover:border-pink-400/50 hover:bg-white/20'
                    }`}
                    onClick={() => setSelectedServerFile(serverFile)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-8 h-8 text-pink-400" />
                        <div>
                          <p className="text-white font-semibold text-lg">{serverFile.name}</p>
                          <p className="text-pink-200">
                            {formatFileSize(serverFile.size)} • Uploaded by <span className="font-semibold">{serverFile.uploadedBy}</span> • {serverFile.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedServerFile?.id === serverFile.id && (
                          <Check className="w-6 h-6 text-pink-400" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(serverFile);
                          }}
                          className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedServerFile && (
                  <div className="mt-6 bg-white/10 rounded-xl p-6 border border-pink-400/30">
                    {(downloading || downloadComplete) && (
                      <div className="mb-4">
                        <div className="flex justify-between text-white mb-2">
                          <span>Download Progress</span>
                          <span>{Math.round(downloadProgress)}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300 rounded-full"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={simulateDownload}
                      disabled={downloading || downloadComplete}
                      className={`w-full py-3 rounded-lg font-semibold transition-all ${
                        downloading || downloadComplete
                          ? 'bg-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg hover:shadow-pink-500/50 transform hover:scale-105'
                      } text-white`}
                    >
                      {downloading ? 'Downloading...' : downloadComplete ? 'Download Complete!' : 'Download File'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-8 text-center text-cyan-200">
          <p className="text-sm flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            Multi-User Mode Active • Server Files: {serverFiles.length} • Status: Connected
          </p>
        </div>
      </div>
    </div>
  );
}
