const cloudinary = require('cloudinary').v2;

let configured = false;

const configureCloudinary = () => {
  if (configured) {
    return cloudinary;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

  configured = true;
  return cloudinary;
};

module.exports = configureCloudinary();