// Web-compatible DocumentPicker implementation

export interface DocumentPickerAsset {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  file?: File;
}

export interface DocumentPickerResult {
  canceled: boolean;
  assets?: DocumentPickerAsset[];
}

export interface DocumentPickerOptions {
  type?: string | string[];
  copyToCacheDirectory?: boolean;
  multiple?: boolean;
}

export const getDocumentAsync = async (
  options: DocumentPickerOptions = {}
): Promise<DocumentPickerResult> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    
    // Set accept attribute based on type
    if (options.type) {
      if (Array.isArray(options.type)) {
        input.accept = options.type.join(',');
      } else {
        input.accept = options.type;
      }
    }
    
    input.multiple = options.multiple || false;
    
    input.onchange = (e: any) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const assets: DocumentPickerAsset[] = Array.from(files).map((file: any) => {
          const reader = new FileReader();
          return {
            uri: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            mimeType: file.type,
            file: file, // Store the actual File object for web uploads
          };
        });
        
        resolve({
          canceled: false,
          assets,
        });
      } else {
        resolve({ canceled: true });
      }
    };
    
    input.oncancel = () => {
      resolve({ canceled: true });
    };
    
    input.click();
  });
};

// Export other types that might be used
export const DocumentPickerOptions = {};
