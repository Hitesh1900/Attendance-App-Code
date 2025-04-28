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

async function generateDescriptorFromFile(filePath) {
  const img = await canvas.loadImage(filePath);
  const resized = await resizeImage(img);

  const detection = await faceapi
    .detectSingleFace(resized, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (detection && detection.descriptor) {
    return {
      filename: path.basename(filePath),
      descriptor: Array.from(detection.descriptor),
    };
  }

  return null;
}

export async function generateAndSaveDescriptors() {
  await loadModelsOnce();

  const directoryPath = path.resolve('uploads');
  const files = fs.readdirSync(directoryPath);
  const descriptors = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const fullPath = path.join(directoryPath, file);
    const descriptor = await generateDescriptorFromFile(fullPath);
    if (descriptor) {
      descriptors.push(descriptor);
    }
  }

  fs.writeFileSync('descriptors.json', JSON.stringify(descriptors, null, 2));
  console.log(`✅ Saved ${descriptors.length} face descriptors to descriptors.json`);
}

export async function compareWithAllUploadedImage(base64Image) {
  await loadModelsOnce();

  const descriptorsPath = 'descriptors.json';

  if (!fs.existsSync(descriptorsPath) || fs.statSync(descriptorsPath).size === 0) {
    console.log('⚠️ descriptors.json not found or empty. Generating now...');
    await generateAndSaveDescriptors();
  }

  const rawData = fs.readFileSync(descriptorsPath, 'utf-8');
  const descriptorData = JSON.parse(rawData);


  if (!Array.isArray(descriptorData) || descriptorData.length === 0) {
    throw new Error('No face descriptors found even after generating. Please check the uploads folder.');
  }

  const knownDescriptors = descriptorData.map(d => ({
    filename: d.filename,
    descriptor: new Float32Array(d.descriptor),
  }));

  const buffer = Buffer.from(base64Image, 'base64');
  const uploadedImage = await canvas.loadImage(buffer);
  const resizedImage = await resizeImage(uploadedImage, 320, 320);

  const capturedDetections = await faceapi
    .detectAllFaces(resizedImage, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();  

  if (!capturedDetections || capturedDetections.length === 0) {
    return { match: false, message: 'No faces detected in the uploaded image' };
  }

  const results = [];
  const matchThreshold = 0.45; 

  for (const detection of capturedDetections) {
    for (const saved of knownDescriptors) {
      const distance = faceapi.euclideanDistance(detection.descriptor, saved.descriptor);
      if (distance < matchThreshold) {
        results.push({
          match: true,
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
