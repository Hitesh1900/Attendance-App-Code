import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { faceapi, canvas, MODEL_PATH } from './src/utilis/faceApiSetup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, 'uploads');
const descriptorFile = path.resolve(__dirname, 'descriptors.json');

const saveDescriptors = async () => {
  console.log('🔄 Loading models...');
  await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
  console.log('✅ Models loaded.');

  const files = fs.readdirSync(uploadsDir);
  const descriptors = [];

  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const image = await canvas.loadImage(filePath);

    const detections = await faceapi
      .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length > 0) {
      detections.forEach((detection, index) => {
        descriptors.push({
          filename: file,
          faceIndex: index,
          descriptor: Array.from(detection.descriptor),
        });
      });
      console.log(`✅ Processed: ${file} (${detections.length} face(s) detected)`);
    } else {
      console.log(`⚠️  No face detected in ${file}`);
    }
  }

  fs.writeFileSync(descriptorFile, JSON.stringify(descriptors, null, 2));
  console.log('🎉 Descriptors saved to descriptors.json');
};

saveDescriptors().catch(console.error);
