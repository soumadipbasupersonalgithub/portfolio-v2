import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, createReadStream, statSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// XOR-encode a key from .env so the raw string never appears in source, in the
// git repo, or verbatim in the built bundle (decoded at runtime — same approach
// as portfolio V1). Client-side keys are still recoverable by determined users;
// only free-tier / public-by-design keys belong here.
const obfuscate = (value = '') => {
  const pad = Array.from({ length: 8 }, () => 21 + Math.floor(Math.random() * 200))
  const data = Array.from(value, (c, i) => c.charCodeAt(0) ^ pad[i % pad.length])
  return JSON.stringify({ data, pad })
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  return {
    base: '/portfolio-v2/',
    define: {
      __GEMINI_KEY__: obfuscate(env.VITE_GEMINI_API_KEY),
      __WEB3FORMS_KEY__: obfuscate(env.VITE_WEB3FORMS_KEY)
    },
    server: {
      port: 5173,
      host: true,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      copyPublicDir: true
    },
    publicDir: 'public',
    plugins: [{
      name: 'cv-download',
      configureServer(server) {
        server.middlewares.use('/download-cv', (_req, res) => {
          const filePath = join(__dirname, 'public', 'soumadip_basu_cv.pdf')
          if (existsSync(filePath)) {
            const stat = statSync(filePath)
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'attachment; filename="soumadip_basu_cv.pdf"',
              'Content-Length': stat.size,
            })
            createReadStream(filePath).pipe(res)
          } else {
            res.writeHead(404)
            res.end('File not found')
          }
        })
      }
    }]
  }
})
