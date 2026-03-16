import { useState } from 'react';

export const useImagePicker = () => {
  const pickFromGallery = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      
      input.oncancel = () => resolve(null);
      input.click();
    });
  };

  const pickFromCamera = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      
      input.oncancel = () => resolve(null);
      input.click();
    });
  };

  return {
    pickFromGallery,
    pickFromCamera,
  };
};
