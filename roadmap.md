# Roadmap
- [x] Chat agent with backend tools across PRD categories (documents, PDF, data, charts, OCR, audio, QR, security, web, ZIP, code)
- [ ] Video processing on the server — blocked: needs an external media service (Workers can't run FFmpeg)
- [ ] Raster image editing (resize/convert/filters) on the server — blocked: needs an image service (e.g. Cloudflare Images)
- [ ] Barcodes other than QR — not built yet
- [ ] Real installs/builds/tests for generated projects — blocked: needs a code sandbox
- [x] GitHub Actions runtime (Vision-Runtime): image + video format conversion, large-file checksums, live-tested
- [x] Linear barcodes (Code 128/39, EAN-13/8, UPC-A/E)
- [ ] Publish so the live site gets the runtime + barcodes (needs user)
