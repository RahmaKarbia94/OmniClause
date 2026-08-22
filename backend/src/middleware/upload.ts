import multer from "multer";

export class UnsupportedFileTypeError extends Error {
  constructor(mimetype: string) {
    super(`Unsupported file type: ${mimetype}`);
    this.name = "UnsupportedFileTypeError";
  }
}

const ALLOWED_MIMETYPES = new Set(["application/pdf", "text/plain"]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Memory storage only -- files are never written to local disk, per
// this sprint's architectural requirement (stateless, cloud-ready).
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new UnsupportedFileTypeError(file.mimetype));
    }
  },
});
