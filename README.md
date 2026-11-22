# Resident Evil 4 · AI Rescue Simulator

A fan-made educational simulator demonstrating A* pathfinding, a one-step combat Markov decision process, and hill climbing.

## Run locally

Open `index.html` in a modern browser. No installation or build step is needed. Keep the folders below alongside it.

## Project layout

- `index.html` — page structure and entry point
- `css/styles.css` — styles and animations
- `js/app.js` — simulator logic, controls, and media playback
- `assets/images/` — logo and character artwork
- `assets/audio/` — four soundtrack tracks
- `assets/video/intro.mp4` — introduction video, including its audio

All asset paths are relative, so the app also works under a GitHub Pages repository subdirectory.

## Publish with GitHub Pages

Push this entire project to your repository. In **Settings → Pages**, select **Deploy from a branch**, choose your branch and **/ (root)**, and save.

Use Git to push the project: the largest soundtrack file is about 35 MB, above GitHub's 25 MiB browser-upload limit but below its 100 MiB Git file limit. No Git LFS is required for these files. Do not add the original all-in-one HTML file.

The media files are preserved without conversion. Playback depends on browser codec support; browsers may also require a click before playing sound. If the intro cannot play, its continue button still opens the simulator.

Fan-made educational project; unaffiliated with Capcom.
