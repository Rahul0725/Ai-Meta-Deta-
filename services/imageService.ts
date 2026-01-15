import exifr from 'exifr';
import { ExifData } from '../types';

/**
 * Extracts EXIF data using the exifr library.
 */
export const extractExifData = async (file: File): Promise<ExifData | null> => {
  try {
    const output = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
    });

    if (!output) return null;

    return {
      make: output.Make,
      model: output.Model,
      dateTimeOriginal: output.DateTimeOriginal ? new Date(output.DateTimeOriginal).toLocaleString() : undefined,
      exposureTime: output.ExposureTime,
      fNumber: output.FNumber,
      iso: output.ISO,
      focalLength: output.FocalLength,
      latitude: output.latitude,
      longitude: output.longitude,
      software: output.Software,
      width: output.ExifImageWidth,
      height: output.ExifImageHeight,
    };
  } catch (error) {
    console.error("Failed to extract EXIF", error);
    return null;
  }
};

/**
 * Creates a "clean" version of the image by redrawing it on a canvas.
 * This effectively strips all metadata.
 */
export const cleanImageMetadata = (imageUrl: string, format: string = 'image/jpeg'): Promise<Blob | null> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      
      // Converting to blob creates a new file structure without original metadata
      canvas.toBlob((blob) => {
        resolve(blob);
      }, format, 0.95);
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g. "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};