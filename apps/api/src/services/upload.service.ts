import { v2 as cloudinary } from 'cloudinary'

let configured = false

function ensureConfigured() {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    configured = true
  }
}

export async function uploadFile(
  buffer: Buffer,
  options: { folder: string; fileName: string },
): Promise<{ url: string; publicId: string }> {
  ensureConfigured()

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'auto',
          folder: options.folder,
          public_id: options.fileName.replace(/\.[^/.]+$/, ''), // strip extension
          overwrite: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(error)
          if (!result) return reject(new Error('Upload returned no result'))
          resolve({ url: result.secure_url, publicId: result.public_id })
        },
      )
      .end(buffer)
  })
}

export async function deleteFile(publicId: string): Promise<void> {
  ensureConfigured()

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
  } catch {
    // Try as image if raw fails
    try {
      await cloudinary.uploader.destroy(publicId)
    } catch {
      // File may already be deleted
    }
  }
}
