from playwright.sync_api import sync_playwright
import os

# Video is ~18 seconds based on the animation timings
VIDEO_DURATION_MS = 19000

html_path = os.path.join(os.path.dirname(__file__), 'video-final.html')
output_dir = os.path.dirname(__file__)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Create context with video recording enabled
    # Video dimensions match the 1080x1080 square format
    context = browser.new_context(
        viewport={'width': 1080, 'height': 1080},
        record_video_dir=output_dir,
        record_video_size={'width': 1080, 'height': 1080}
    )

    page = context.new_page()

    # Load the HTML file
    page.goto(f'file://{html_path}')

    # Wait for the full animation to complete
    # The animation runs for about 18 seconds (final CTA glow starts at 18s)
    page.wait_for_timeout(VIDEO_DURATION_MS)

    # Close context to finalize video
    context.close()
    browser.close()

    print(f"Video saved to: {output_dir}")
