# Network Service Improvements

## Overview
This document outlines the comprehensive network improvements made to fix network errors and make retry mechanisms transparent.

## Root Causes Identified

### 1. **Inconsistent Network Handling**
- **Problem**: Mixed usage of `fetch` and `axios` with different error handling patterns
- **Solution**: Unified network service using `fetch` with consistent error handling

### 2. **Missing Timeouts**
- **Problem**: Most requests had no timeout, causing indefinite hangs
- **Solution**: Default 30-second timeout with configurable per-request timeouts

### 3. **Limited Retry Logic**
- **Problem**: Only CO service had retry logic, others failed immediately
- **Solution**: Unified retry mechanism with exponential backoff for all requests

### 4. **Poor Error Context**
- **Problem**: Generic error messages without network-specific details
- **Solution**: Detailed error classification (network, timeout, server errors)

### 5. **FormData Validation Issues**
- **Problem**: No validation before sending FormData requests
- **Solution**: Built-in FormData validation with detailed logging

## New Network Service Features

### Core Features
- **Unified API**: Single service for all network requests
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Timeout Management**: Per-request timeout configuration
- **Error Classification**: Network, timeout, and server error detection
- **Network State Detection**: Checks internet connectivity before requests
- **FormData Validation**: Validates FormData structure before sending
- **Transparent Logging**: Detailed console logs for debugging

### Request Types Supported
- `GET`, `POST`, `PUT`, `DELETE` requests
- Form submissions with file uploads
- JSON API calls
- File downloads with progress tracking

### Error Handling
```typescript
interface NetworkError extends Error {
  code?: string;
  status?: number;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isServerError?: boolean;
}
```

## Usage Examples

### Basic Request
```typescript
import { networkService } from '../services/network/network-service';

// Simple GET request
const data = await networkService.requestJson('/api/data');

// POST with custom options
const result = await networkService.post('/api/submit', formData, {
  timeout: 60000,
  retries: 3,
  showRetryLogs: true
});
```

### Form Submission
```typescript
// Automatic FormData validation and retry
const result = await networkService.submitForm('/api/upload', formData, {
  timeout: 120000, // 2 minutes for large files
  retries: 2,
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Service Updates

### Updated Services
1. **auth-service.ts**: Login/signup with proper error handling
2. **co-service.ts**: CO creation with transparent retry logging
3. **evaluation-service.ts**: Schema management with timeout handling
4. **pdf-picker.ts**: PDF upload with progress tracking

### Screen Updates
1. **upload-schema-screen.tsx**: Better error messages and retry logic
2. **attach-images-screen.tsx**: Improved image upload handling
3. **student-answer-sheet-screen.tsx**: Enhanced evaluation submission
4. **pdf-cropper-screen.tsx**: Reliable image stitching requests

## Configuration

### Default Settings
- **Timeout**: 30 seconds (configurable per request)
- **Retries**: 2 attempts (configurable per request)
- **Retry Delay**: 1 second with exponential backoff
- **File Upload Timeout**: 60-120 seconds depending on operation

### Per-Request Configuration
```typescript
await networkService.request(url, {
  timeout: 60000,        // 60 seconds
  retries: 3,            // 3 retry attempts
  retryDelay: 2000,      // 2 second base delay
  showRetryLogs: true,   // Show retry attempts in console
  headers: { ... }       // Custom headers
});
```

## Console Logging

### Request Logging
```
📡 Network request: POST /api/upload
📋 FormData validation passed. Entries: 3
  - subject_name: Mathematics
  - file: [File] answer_sheet.pdf
  - student_count: 30
📥 Response: 200 OK
✅ Request successful after 1 attempt(s)
```

### Retry Logging
```
🔄 Network retry attempt 1/2 for POST /api/upload
⏱️ Request timeout, retrying...
🔄 Network retry attempt 2/2 for POST /api/upload
✅ Request successful after 3 attempt(s)
```

### Error Logging
```
❌ Network error: Network connection failed
🌐 Network error, retrying...
❌ Upload error: Request timeout after 60000ms
```

## Benefits

### For Users
- **Fewer Failed Uploads**: Automatic retry on network issues
- **Better Error Messages**: Clear, actionable error descriptions
- **Improved Reliability**: Timeout handling prevents indefinite hangs

### For Developers
- **Transparent Debugging**: Detailed console logs for troubleshooting
- **Consistent API**: Single service for all network operations
- **Better Error Handling**: Structured error types for proper handling

## Migration Notes

### Breaking Changes
- Removed manual retry logic from individual services
- Updated error handling to use new error types
- Changed timeout configurations to be more appropriate

### Backward Compatibility
- All existing API calls continue to work
- Error messages are more descriptive but maintain same structure
- Console logging is additive and doesn't break existing functionality

## Troubleshooting

### Common Issues
1. **Network Timeouts**: Check timeout configuration and network stability
2. **FormData Errors**: Review FormData structure in console logs
3. **Retry Failures**: Monitor retry logs to identify persistent issues

### Debug Mode
Enable detailed logging by setting `showRetryLogs: true` in request options.

## Future Enhancements
- Request cancellation support
- Offline request queuing
- Progress tracking for large uploads
- Request deduplication
- Caching layer for GET requests