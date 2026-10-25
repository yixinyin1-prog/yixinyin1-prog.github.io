/* Keep native video controls usable, including when a webview rejects play(). */
(function (root) {
  'use strict';
  function mobilePreferred(env = root) {
    return !!(env.navigator?.connection?.saveData ||
      /Android|iPhone|iPad|iPod|MicroMessenger/i.test(env.navigator?.userAgent || '') ||
      env.matchMedia?.('(max-width: 820px)').matches);
  }
  function attach(video, notice, options = {}) {
    const doc = notice.ownerDocument;
    const message = doc.createElement('p');
    const action = doc.createElement('button');
    action.type = 'button';
    notice.replaceChildren(message, action);
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    let disposed = false, timer, attempt = 0, resumeTime = 0;
    const listeners = [];
    const schedule = options.setTimeout || setTimeout;
    const cancel = options.clearTimeout || clearTimeout;
    function clear() { if (timer !== undefined) cancel(timer); timer = undefined; }
    function show(state, text = '', label = '') {
      if (disposed) return;
      notice.dataset.state = state;
      notice.hidden = !text;
      message.textContent = text;
      action.textContent = label;
      action.hidden = !label;
    }
    function arm() {
      // A stalled event must not restart the deadline indefinitely.
      if (timer !== undefined || disposed) return;
      timer = schedule(() => {
        timer = undefined;
        show('slow', '连接较慢，可以重试或切换流畅画质。微信内仍无法播放时，可从右上角选择“在浏览器打开”。', '重新播放');
      }, options.timeoutMs || 12000);
    }
    function loading() { show('loading', '正在连接视频…', '点击播放'); arm(); }
    function playing() { clear(); show('playing'); }
    function ready() {
      if (video.paused) {
        clear();
        show('ready', '视频已准备好，点击播放。', '播放视频');
      }
    }
    function failed() {
      clear();
      const code = video.error?.code;
      show('error', code === 3 || code === 4
        ? '当前画质无法播放，请切换流畅画质或重试。'
        : '视频连接中断，请重试。', '重新播放');
    }
    function on(type, fn) { video.addEventListener(type, fn); listeners.push([type, fn]); }
    function start() {
      if (disposed) return;
      const id = ++attempt;
      loading();
      // Invoke synchronously inside the user's click; never wait for a network event.
      let result;
      try { result = video.play(); } catch (error) { rejected(error); return; }
      Promise.resolve(result).then(() => {
        if (!disposed && id === attempt && !video.paused) playing();
      }, rejected);
      function rejected(error) {
        if (disposed || id !== attempt || error?.name === 'AbortError') return;
        clear();
        if (error?.name === 'NotAllowedError') {
          show('blocked', '微信或浏览器需要再次确认播放。', '点击播放视频');
        } else failed();
      }
    }
    function retry() {
      if (disposed) return;
      ++attempt;
      resumeTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      clear();
      video.load();
      start();
    }
    function selectSource(src) {
      if (disposed) return;
      ++attempt;
      resumeTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      clear();
      video.src = src;
      video.load();
      start();
    }
    action.addEventListener('click', () => {
      if (notice.dataset.state === 'error' || notice.dataset.state === 'slow') retry();
      else start();
    });
    on('loadstart', arm);
    on('loadedmetadata', () => {
      if (resumeTime > 0 && Number.isFinite(video.duration)) {
        try { video.currentTime = Math.min(resumeTime, Math.max(0, video.duration - .1)); } catch {}
        resumeTime = 0;
      }
    });
    on('loadeddata', ready);
    on('canplay', ready);
    on('playing', playing);
    on('timeupdate', () => { if (!video.paused && video.readyState >= 2) playing(); });
    on('waiting', () => { show('buffering', '正在缓冲，可切换流畅画质。'); arm(); });
    on('stalled', () => { if (notice.dataset.state !== 'blocked' && !video.ended && video.readyState < 3) arm(); });
    on('pause', () => { clear(); if (!video.ended && !video.error) show('paused', '已暂停', '继续播放'); });
    on('ended', () => { clear(); show('ended', '播放结束', '再看一遍'); });
    on('error', failed);
    loading();
    return {
      start, retry, selectSource,
      dispose() {
        disposed = true;
        ++attempt;
        clear();
        for (const [type, fn] of listeners) video.removeEventListener(type, fn);
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }
  const api = { attach, mobilePreferred };
  root.PortfolioVideo = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'object' ? window : globalThis);
