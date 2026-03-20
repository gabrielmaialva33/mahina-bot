import path from 'node:path'
import fs from 'node:fs'

import express from 'express'
import multer from 'multer'
import axios from 'axios'
import ffmpeg from 'fluent-ffmpeg'

const app = express()

const downloadFolder = path.join(process.cwd(), 'downloads')
const cacheFolder = path.join(process.cwd(), 'cache')

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safePath(base: string, userInput: string): string | null {
  const resolved = path.resolve(base, path.basename(userInput))
  if (!resolved.startsWith(path.resolve(base))) return null
  return resolved
}

function prettySize(size: number): string {
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} MB`
  if (size >= 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${size} B`
}

function getFileIcon(name: string): string {
  const ext = path.extname(name).toLowerCase()
  const icons: Record<string, string> = {
    '.mkv': '🎬',
    '.mp4': '🎬',
    '.avi': '🎬',
    '.webm': '🎬',
    '.mp3': '🎵',
    '.flac': '🎵',
    '.ogg': '🎵',
    '.wav': '🎵',
    '.jpg': '🖼️',
    '.png': '🖼️',
    '.gif': '🖼️',
    '.srt': '📝',
    '.ass': '📝',
    '.sub': '📝',
    '.zip': '📦',
    '.rar': '📦',
    '.7z': '📦',
  }
  return icons[ext] || '📄'
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, downloadFolder),
  filename: (_req, file, cb) => cb(null, file.originalname),
})

const upload = multer({ storage })

app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
  const authName = process.env.FILE_MANAGER_USER || 'admin'
  const authPass = process.env.FILE_MANAGER_PASS || 'admin'

  const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
  const [username, password] = Buffer.from(b64auth, 'base64').toString().split(':')

  if (username === authName && password === authPass) {
    next()
  } else {
    res.set('WWW-Authenticate', 'Basic realm="Mahina File Manager"')
    res.status(401).send('Invalid credentials')
  }
})

// --- Shared layout ---
const layout = (title: string, body: string) => `<!DOCTYPE html>
<html lang="pt-BR" data-bs-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Mahina</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    :root { --accent: #4f5aa1; --accent-hover: #6970c4; }
    body { background: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .navbar { background: #161b22 !important; border-bottom: 1px solid #30363d; }
    .brand-text { color: #c9d1d9; font-weight: 700; font-size: 1.25rem; }
    .brand-text span { color: var(--accent); }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; }
    .table { color: #c9d1d9; --bs-table-bg: transparent; --bs-table-hover-bg: #1c2129; }
    .table th { color: #8b949e; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; border-color: #30363d; }
    .table td { border-color: #21262d; vertical-align: middle; }
    .btn-accent { background: var(--accent); color: #fff; border: none; border-radius: 8px; }
    .btn-accent:hover { background: var(--accent-hover); color: #fff; }
    .btn-outline-accent { color: var(--accent); border: 1px solid var(--accent); border-radius: 8px; }
    .btn-outline-accent:hover { background: var(--accent); color: #fff; }
    .file-icon { font-size: 1.2rem; }
    .drop-zone { border: 2px dashed #30363d; border-radius: 12px; padding: 2rem; text-align: center; transition: all 0.2s; cursor: pointer; }
    .drop-zone:hover, .drop-zone.drag-over { border-color: var(--accent); background: rgba(79,90,161,0.08); }
    .drop-zone input { display: none; }
    .progress { height: 6px; background: #21262d; border-radius: 3px; }
    .progress-bar { background: var(--accent); border-radius: 3px; }
    .badge-ext { font-size: 0.7rem; padding: 0.2em 0.5em; border-radius: 4px; font-weight: 500; }
    .stat-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 1rem; text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #fff; }
    .stat-label { font-size: 0.8rem; color: #8b949e; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { color: var(--accent-hover); }
    .screenshots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; }
    .screenshots-grid img { border-radius: 8px; width: 100%; aspect-ratio: 16/9; object-fit: cover; }
    .video-player { width: 100%; border-radius: 12px; background: #000; }
    .meta-table td:first-child { color: #8b949e; width: 200px; }
  </style>
</head>
<body>
  <nav class="navbar navbar-dark px-3 mb-4">
    <a class="navbar-brand d-flex align-items-center gap-2" href="/">
      <img src="https://telegra.ph/file/642085e294c889b91cccb.png" width="36" height="36" style="border-radius:8px">
      <span class="brand-text"><span>Mahina</span> Files</span>
    </a>
  </nav>
  <div class="container-fluid" style="max-width:1000px">${body}</div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`

// --- File list ---
app.get('/', (_req, res) => {
  fs.readdir(downloadFolder, (err, files) => {
    if (err) {
      res.status(500).send(layout('Erro', '<p>Erro ao ler pasta de downloads.</p>'))
      return
    }

    const validFiles = files.filter((f) => f !== '.gitkeep')
    let totalSize = 0
    const fileRows = validFiles
      .map((file) => {
        try {
          const stats = fs.statSync(path.join(downloadFolder, file))
          totalSize += stats.size
          const ext = path.extname(file).toUpperCase().replace('.', '')
          return `<tr>
            <td><span class="file-icon">${getFileIcon(file)}</span> ${escapeHtml(file)}</td>
            <td><span class="badge bg-secondary badge-ext">${ext}</span></td>
            <td>${prettySize(stats.size)}</td>
            <td>
              <div class="btn-group btn-group-sm">
                <a href="/preview/${encodeURIComponent(file)}" class="btn btn-outline-accent">Preview</a>
                <button class="btn btn-outline-accent copy-btn" data-name="${escapeHtml(path.parse(file).name.replace(/\s/g, ''))}">Copiar</button>
                <button class="btn btn-outline-danger delete-btn" data-file="${escapeHtml(file)}">Deletar</button>
              </div>
            </td>
          </tr>`
        } catch {
          return ''
        }
      })
      .join('')

    const body = `
      <div class="row g-3 mb-4">
        <div class="col-4"><div class="stat-card"><div class="stat-value">${validFiles.length}</div><div class="stat-label">Arquivos</div></div></div>
        <div class="col-4"><div class="stat-card"><div class="stat-value">${prettySize(totalSize)}</div><div class="stat-label">Total</div></div></div>
        <div class="col-4"><div class="stat-card"><div class="stat-value">${validFiles.length > 0 ? prettySize(totalSize / validFiles.length) : '0 B'}</div><div class="stat-label">Media</div></div></div>
      </div>

      <div class="card p-3 mb-4">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead><tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th><th>Acoes</th></tr></thead>
            <tbody>${fileRows || '<tr><td colspan="4" class="text-center py-4 text-secondary">Nenhum arquivo encontrado</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-6">
          <div class="card p-3">
            <h6 class="mb-3">Upload Local</h6>
            <form id="upload-form" action="/api/upload" method="post" enctype="multipart/form-data">
              <div class="drop-zone mb-2" id="drop-zone">
                <p class="mb-1 text-secondary">Arraste um arquivo ou clique aqui</p>
                <input type="file" name="file" id="file-input" required>
              </div>
              <div id="file-name" class="text-secondary small mb-2"></div>
              <div class="progress mb-2 d-none" id="upload-progress"><div class="progress-bar" style="width:0%"></div></div>
              <button type="submit" class="btn btn-accent w-100">Upload</button>
            </form>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card p-3">
            <h6 class="mb-3">Upload Remoto</h6>
            <form action="/api/remote_upload" method="post">
              <input type="text" class="form-control bg-dark border-secondary text-light mb-2" name="link" placeholder="https://..." required>
              <button type="submit" class="btn btn-accent w-100">Download</button>
            </form>
          </div>
        </div>
      </div>

      <script>
        // Drag & drop
        const dz = document.getElementById('drop-zone');
        const fi = document.getElementById('file-input');
        const fn = document.getElementById('file-name');
        dz.addEventListener('click', () => fi.click());
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
        dz.addEventListener('drop', e => {
          e.preventDefault(); dz.classList.remove('drag-over');
          fi.files = e.dataTransfer.files;
          fn.textContent = fi.files[0]?.name || '';
        });
        fi.addEventListener('change', () => fn.textContent = fi.files[0]?.name || '');

        // Upload progress
        document.getElementById('upload-form').addEventListener('submit', function(e) {
          if (!fi.files[0]) return;
          e.preventDefault();
          const fd = new FormData(this);
          const xhr = new XMLHttpRequest();
          const pb = document.getElementById('upload-progress');
          const bar = pb.querySelector('.progress-bar');
          pb.classList.remove('d-none');
          xhr.upload.onprogress = e => { if(e.lengthComputable) bar.style.width = (e.loaded/e.total*100)+'%'; };
          xhr.onload = () => window.location.href = '/';
          xhr.onerror = () => alert('Erro no upload');
          xhr.open('POST', '/api/upload');
          xhr.setRequestHeader('Authorization', 'Basic ' + btoa(document.cookie || ''));
          // Re-send with same auth
          xhr.withCredentials = true;
          // Actually just submit the form normally for auth
          this.submit();
        });

        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.name).then(() => {
              btn.textContent = 'Copiado!';
              btn.classList.add('btn-success');
              btn.classList.remove('btn-outline-accent');
              setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('btn-success'); btn.classList.add('btn-outline-accent'); }, 2000);
            });
          });
        });

        // Delete with confirmation
        document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            if (confirm('Deletar ' + btn.dataset.file + '?')) {
              window.location.href = '/delete/' + encodeURIComponent(btn.dataset.file);
            }
          });
        });
      </script>`

    res.send(layout('Arquivos', body))
  })
})

// --- File upload ---
app.post('/api/upload', upload.single('file'), (_req, res) => {
  res.redirect('/')
})

// --- Remote upload ---
app.post('/api/remote_upload', async (req, res) => {
  const link = req.body.link
  try {
    const url = new URL(link)
    if (!['http:', 'https:'].includes(url.protocol)) {
      res.status(400).send(layout('Erro', '<p>Protocolo de URL invalido.</p>'))
      return
    }
    const blockedHosts = [
      '169.254.169.254',
      'metadata.google.internal',
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
    ]
    if (blockedHosts.includes(url.hostname)) {
      res.status(400).send(layout('Erro', '<p>Host bloqueado.</p>'))
      return
    }
  } catch {
    res.status(400).send(layout('Erro', '<p>URL invalida.</p>'))
    return
  }

  const filename = path.basename(new URL(link).pathname) || 'download'
  const filepath = safePath(downloadFolder, filename)
  if (!filepath) {
    res.status(400).send(layout('Erro', '<p>Nome de arquivo invalido.</p>'))
    return
  }

  try {
    const response = await axios.get(link, { responseType: 'stream', timeout: 60000 })
    const writer = fs.createWriteStream(filepath)
    response.data.pipe(writer)

    writer.on('finish', () => res.redirect('/'))
    writer.on('error', () =>
      res
        .status(500)
        .send(
          layout(
            'Erro',
            '<p>Erro ao salvar arquivo.</p><a href="/" class="btn btn-accent">Voltar</a>'
          )
        )
    )
  } catch {
    res
      .status(500)
      .send(
        layout(
          'Erro',
          '<p>Erro ao baixar arquivo.</p><a href="/" class="btn btn-accent">Voltar</a>'
        )
      )
  }
})

// --- Preview screenshots ---
const ffmpegRunning: Record<string, boolean> = {}

async function ffmpegScreenshot(video: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (ffmpegRunning[video]) {
      const wait = () => {
        if (!ffmpegRunning[video]) resolve()
        else setTimeout(wait, 100)
      }
      wait()
      return
    }
    ffmpegRunning[video] = true
    const ts = ['10%', '30%', '50%', '70%', '90%']
    const takeOne = (i: number) => {
      if (i >= ts.length) {
        ffmpegRunning[video] = false
        resolve()
        return
      }
      ffmpeg(`${downloadFolder}/${video}`)
        // @ts-ignore
        .on('end', () => takeOne(i + 1))
        .on('error', (err: Error) => {
          ffmpegRunning[video] = false
          reject(err)
        })
        .screenshots({
          count: 1,
          filename: `${video}-${i + 1}.jpg`,
          timestamps: [ts[i]],
          folder: cacheFolder,
          size: '1280x720',
        })
    }
    takeOne(0)
  })
}

app.get('/api/preview/:file/:id', async (req, res) => {
  const file = req.params.file
  const id = req.params.id
  if (+id < 1 || +id > 5) {
    res.status(404).send('Not Found')
    return
  }
  const previewFile = path.join(cacheFolder, `${file}-${id}.jpg`)
  if (fs.existsSync(previewFile)) {
    res.sendFile(previewFile)
  } else {
    try {
      await ffmpegScreenshot(file)
    } catch {
      res.status(500).send('Internal Server Error')
      return
    }
    res.sendFile(previewFile)
  }
})

// --- stringify for metadata ---
const stringify = (obj: unknown): string => {
  if (typeof obj === 'string') return escapeHtml(obj)
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  if (Array.isArray(obj)) return obj.map(stringify).join(', ')
  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj)
      .map(([k, v]) => `<strong>${k}:</strong> ${stringify(v)}`)
      .join('<br>')
  }
  return String(obj ?? '')
}

// --- Preview page ---
app.get('/preview/:file', (req, res) => {
  const file = req.params.file
  const filePath = safePath(downloadFolder, file)
  if (!filePath || !fs.existsSync(filePath)) {
    res
      .status(404)
      .send(
        layout('404', '<p>Arquivo nao encontrado.</p><a href="/" class="btn btn-accent">Voltar</a>')
      )
    return
  }

  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err) {
      res
        .status(500)
        .send(
          layout(
            'Erro',
            '<p>Erro ao ler metadata.</p><a href="/" class="btn btn-accent">Voltar</a>'
          )
        )
      return
    }

    const fmt = metadata.format
    const duration = fmt.duration
      ? new Date(fmt.duration * 1000).toISOString().slice(11, 19)
      : 'N/A'
    const streams = metadata.streams || []
    const videoStream = streams.find((s) => s.codec_type === 'video')
    const audioStreams = streams.filter((s) => s.codec_type === 'audio')

    const infoCards = `
      <div class="row g-3 mb-4">
        <div class="col-3"><div class="stat-card"><div class="stat-value">${duration}</div><div class="stat-label">Duracao</div></div></div>
        <div class="col-3"><div class="stat-card"><div class="stat-value">${prettySize(fmt.size ? +fmt.size : 0)}</div><div class="stat-label">Tamanho</div></div></div>
        <div class="col-3"><div class="stat-card"><div class="stat-value">${videoStream ? `${videoStream.width}x${videoStream.height}` : 'N/A'}</div><div class="stat-label">Resolucao</div></div></div>
        <div class="col-3"><div class="stat-card"><div class="stat-value">${audioStreams.length}</div><div class="stat-label">Faixas Audio</div></div></div>
      </div>`

    const screenshots = Array.from({ length: 5 }, (_, i) => i + 1)
      .map(
        (i) =>
          `<a href="/api/preview/${encodeURIComponent(file)}/${i}"><img src="/api/preview/${encodeURIComponent(file)}/${i}" loading="lazy"></a>`
      )
      .join('')

    const metaRows = Object.entries(fmt)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `<tr><td>${k}</td><td>${stringify(v)}</td></tr>`)
      .join('')

    const body = `
      <div class="d-flex align-items-center gap-2 mb-4">
        <a href="/" class="btn btn-outline-accent btn-sm">← Voltar</a>
        <h5 class="mb-0">${getFileIcon(file)} ${escapeHtml(file)}</h5>
      </div>

      ${infoCards}

      <div class="card p-3 mb-4">
        <h6 class="mb-3">Player</h6>
        <video controls class="video-player">
          <source src="/api/video/${encodeURIComponent(file)}" type="video/mp4">
        </video>
      </div>

      <div class="card p-3 mb-4">
        <h6 class="mb-3">Screenshots</h6>
        <div class="screenshots-grid">${screenshots}</div>
      </div>

      <div class="card p-3 mb-4">
        <h6 class="mb-3">Metadata</h6>
        <div class="table-responsive">
          <table class="table table-sm meta-table mb-0">
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>${metaRows}</tbody>
          </table>
        </div>
      </div>`

    res.send(layout(file, body))
  })
})

// --- Video stream ---
app.get('/api/video/:file', (req, res) => {
  const videoPath = safePath(downloadFolder, req.params.file)
  if (!videoPath || !fs.existsSync(videoPath)) {
    res.status(404).send('Not Found')
    return
  }
  return res.sendFile(videoPath)
})

// --- Delete ---
app.get('/delete/:file', (req, res) => {
  const file = req.params.file
  const filePath = safePath(downloadFolder, file)
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).send(layout('404', '<p>Arquivo nao encontrado.</p>'))
    return
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      res.status(500).send(layout('Erro', '<p>Erro ao deletar arquivo.</p>'))
      return
    }
    // Also clean up cached screenshots
    for (let i = 1; i <= 5; i++) {
      const cachePath = path.join(cacheFolder, `${file}-${i}.jpg`)
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath)
    }
    res.redirect('/')
  })
})

// create folders if not exist
if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder)
if (!fs.existsSync(downloadFolder)) fs.mkdirSync(downloadFolder, { recursive: true })

export default app
