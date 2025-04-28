import { compareWithAllUploadedImage } from '../services/faceService.js';

export async function verifyFace(req, res) {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const result = await compareWithAllUploadedImage(base64Data);

    const statusCode = result.match ? 200 : 404;

    return res.status(statusCode).json({
      status: result.match ? 'success' : 'failed',
      ...result,
    });

  } catch (err) {
    console.error('[verifyFace] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
