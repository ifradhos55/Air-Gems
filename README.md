# Air Gems

Air Gems is a browser based hand gesture interaction demo built with MediaPipe Hands.  
It uses a webcam to track your hand in real time and lets you interact with on screen elements using natural gestures.

## What it does

- Tracks your index finger to control a virtual cursor
- Detects a pinch gesture between thumb and index finger to press gems
- Cycles gem colors instantly on pinch
- Shows live camera feed with optional landmark overlay
- Displays hand status, pinch distance, and FPS
- Allows starting and stopping the camera at any time

## How it works

- MediaPipe Hands detects hand landmarks from the webcam
- The index fingertip controls cursor position
- A spring based smoothing system keeps movement stable
- Pinch distance thresholds trigger press events
- The rightmost detected hand is used for interaction

## Controls

- Start Camera: enables webcam and hand tracking
- Stop: fully stops the camera and tracking
- Shuffle: rearranges gem positions
- Reset Colors: restores default gem colors

## Project structure

- index.html  
  Contains the UI layout and embedded CSS

- mediapipe.js  
  Handles gem logic, gesture detection, cursor movement, and MediaPipe integration

## Requirements

- A modern Chromium based browser
- Webcam access enabled
- HTTPS or localhost for camera permissions

## How to run

1. Clone the repository
2. Open index.html using a local server  
   Example: `python -m http.server`
3. Open the page in your browser
4. Click Start Camera and allow webcam access

## Notes

- All processing is done locally in the browser
- No video data is stored or transmitted
- Designed as a gesture interaction experiment and foundation for future extensions

## License

MIT
