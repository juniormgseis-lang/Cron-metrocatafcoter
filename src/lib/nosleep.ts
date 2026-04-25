/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A tiny, 1x1 pixel, 1-second silent black video in Base64
const BLANK_VIDEO_B64 = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb21tcDQyAAAACHZyZWUAAAAIdHcmZ6AAAAAIbWRhdAAAAAZmcmVlAAAAbW1vb3YAAABsbXZoZAAAAADbe66623uuugAAAfQAAAH0AAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAGWlvZHMAAAAAEAAfQA7/Yf8AAAAAAABidHJhawAAAFx0a2hkAAAAAdt7rrrbe666AAAAAQAAAAEAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAcBtZGlhAAAAIG1kaGQAAAAA23uuutt7uroAAB9AAAAn0FAAAAAAADFoZGVscgAAAAAAAAAACXZpZGVvAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAARxtZGluZgAAABh2bWhkAAAAAQAAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAp1cmwgAAAAAQAAAKZzdGJsAAAAb3N0c2QAAAAAAAAAAQAAAF9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAEAAQASAAAAEgAAAAAAAAABCUFBQUEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//AAAABh0dHMAAAAAAAAAAQAAAAEAAAAUAAAAFHN0c3oAAAAAAAAAAAAAAAEAAAAUc3RjbwAAAAAAAAABAAAAUAAAAGJmcmVlAAAD7HVkdGEAAABsbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcgAAAAAAAAAAAAAAAAAAAAA5aWxwcwAAADFkYXRhAAAAAQAAAAAAYXBwbAAAAAAAY3BsdAAAABpkYXRhAAAAAQAAAAAAMjAxOC0wNy0xOQAAADJmcmVl';

export class WakeLockFallback {
  private video: HTMLVideoElement | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.video = document.createElement('video');
      this.video.setAttribute('loop', '');
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('muted', '');
      this.video.style.position = 'absolute';
      this.video.style.width = '1px';
      this.video.style.height = '1px';
      this.video.style.top = '-10px';
      this.video.style.left = '-10px';
      this.video.style.opacity = '0.01';
      this.video.src = BLANK_VIDEO_B64;
    }
  }

  async activate() {
    if (!this.video) return;
    try {
      await this.video.play();
      console.log('Wake Lock Fallback (Video) ativado');
    } catch (err) {
      console.warn('Erro ao ativar Wake Lock Fallback:', err);
    }
  }

  deactivate() {
    if (!this.video) return;
    this.video.pause();
    console.log('Wake Lock Fallback (Video) desativado');
  }
}
