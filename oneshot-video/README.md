# OneShotCoding Launch Video

20-second animated promo video for Twitter/X launch.

## Quick Recording (Easiest Method)

### Option 1: QuickTime (Mac)

1. Open `video-final.html` in Chrome/Safari
2. Open QuickTime Player → File → New Screen Recording
3. Select the browser window (1080x1080)
4. Click Record, then refresh the browser to restart animation
5. Stop after ~20 seconds
6. Trim and export as MP4

### Option 2: OBS Studio (Any OS)

1. Open `video-final.html` in browser
2. In OBS, add Window Capture → select browser
3. Set output to 1080x1080, 30fps
4. Start Recording, refresh browser
5. Stop after 20 seconds

### Option 3: Automated Recording (Node.js)

```bash
cd oneshot-video
npm install
npm run record
```

This creates `oneshot-launch.mp4` automatically.

## Files

- `video-final.html` - Clean production video (no debug elements)
- `index.html` - Development version with timer overlay
- `record.js` - Puppeteer recording script
- `package.json` - Dependencies

## Animation Timeline

| Time | Scene |
|------|-------|
| 0.0s - 4.5s | Terminal typing prompt |
| 4.5s - 7.5s | Big "1 SHOT" slam |
| 7.5s - 11.5s | Rules: 1 Prompt → 1 Response → SHIP IT |
| 11.5s - 16s | Showcase grid (Games, Apps, Extensions) |
| 16s - 20s | Final CTA with pulsing button |

## Twitter/X Specs

- Format: MP4 (H.264)
- Dimensions: 1080x1080 (1:1 square)
- Duration: 20 seconds
- Max file size: 512MB
- Recommended: Under 15MB for fast upload

## Post-Recording

After recording, you may want to:

1. **Compress** if file is large: `ffmpeg -i oneshot-launch.mp4 -crf 23 output.mp4`
2. **Add audio** (optional): `ffmpeg -i video.mp4 -i music.mp3 -shortest output.mp4`
3. **Trim**: `ffmpeg -i video.mp4 -ss 0 -t 20 -c copy trimmed.mp4`
