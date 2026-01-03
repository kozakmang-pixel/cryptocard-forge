// --- Template upload (custom images/GIFs) ---
// Stores the uploaded file in Supabase Storage and returns a persistent public URL.
// ✅ Moderation REMOVED (no Google Vision SafeSearch)

const TEMPLATE_BUCKET = process.env.SUPABASE_TEMPLATE_BUCKET || 'card-templates';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
  },
});

function guessExtension(mimetype, originalname) {
  const extFromName = path.extname(originalname || '').toLowerCase();
  if (extFromName && extFromName.length <= 10) return extFromName;
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };
  return map[String(mimetype || '').toLowerCase()] || '';
}

function isAllowedTemplateMime(mimetype) {
  const mt = String(mimetype || '').toLowerCase();
  return (
    mt === 'image/jpeg' ||
    mt === 'image/jpg' ||
    mt === 'image/png' ||
    mt === 'image/gif' ||
    mt === 'image/webp'
  );
}

app.post('/upload-template', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mimetype = req.file.mimetype || '';
    if (!String(mimetype).startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    if (!isAllowedTemplateMime(mimetype)) {
      return res
        .status(400)
        .json({ error: 'Only JPG, PNG, GIF, or WebP images are allowed' });
    }

    const ext = guessExtension(mimetype, req.file.originalname);
    const rand = crypto.randomBytes(16).toString('hex');
    const objectPath = `templates/${Date.now()}_${rand}${ext}`;

    const uploadRes = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .upload(objectPath, req.file.buffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (uploadRes.error) {
      console.error('Supabase storage upload error:', uploadRes.error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const publicRes = supabase.storage
      .from(TEMPLATE_BUCKET)
      .getPublicUrl(objectPath);

    const url = publicRes?.data?.publicUrl || null;
    if (!url) {
      return res.status(500).json({ error: 'Failed to generate image URL' });
    }

    return res.json({ url });
  } catch (err) {
    console.error('Error in /upload-template:', err);
    return res.status(500).json({ error: err?.message || 'upload_failed' });
  }
});
