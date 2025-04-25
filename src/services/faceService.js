import fs from 'fs';
import path from 'path';
import { faceapi, canvas, MODEL_PATH } from '../utilis/faceApiSetup.js';

let modelsLoaded = false;

async function loadModelsOnce() {
  if (!modelsLoaded) {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
    ]);
    modelsLoaded = true;
  }
}

async function resizeImage(image, width = 320, height = 320) {
  const { createCanvas } = canvas;
  const resizedCanvas = createCanvas(width, height);
  const ctx = resizedCanvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  return resizedCanvas;
}

async function generateDescriptorFromImage(filePath) {
  const img = await canvas.loadImage(filePath);
  const resized = await resizeImage(img);
  const detection = await faceapi
    .detectSingleFace(resized, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (detection && detection.descriptor) {
    return {
      filename: path.basename(filePath),
      descriptor: detection.descriptor,
    };
  }

  return null;
}

async function loadAllStoredDescriptors() {
  const directoryPath = path.resolve('uploads');
  const files = fs.readdirSync(directoryPath);
  const descriptors = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const fullPath = path.join(directoryPath, file);
    const result = await generateDescriptorFromImage(fullPath);
    if (result) descriptors.push(result);
  }

  return descriptors;
}

export async function compareWithAllUploadedImages(base64Image) {
  await loadModelsOnce();
  const knownDescriptors = await loadAllStoredDescriptors();

  const buffer = Buffer.from(base64Image, 'base64');
  const uploadedImage = await canvas.loadImage(buffer);
  const resizedImage = await resizeImage(uploadedImage, 320, 320);

  const capturedDetections = await faceapi
    .detectAllFaces(resizedImage, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!capturedDetections || !capturedDetections.length) {
    return { match: false, message: 'No faces detected in the uploaded image' };
  }

  const results = [];

  for (const detection of capturedDetections) {
    for (const saved of knownDescriptors) {
      const distance = faceapi.euclideanDistance(detection.descriptor, saved.descriptor);
      if (distance < 0.6) {
        results.push({
          match: true,
          message: `Face matched with ${saved.filename}`,
          matchedFile: saved.filename,
          distance,
        });
      }
    }
  }

  if (results.length > 0) {
    return { match: true, matches: results };
  }

  return { match: false, message: 'No matching faces found in the uploaded image' };
}
