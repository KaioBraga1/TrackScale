// Camada 2: detecção client-side de bots/automação
;(function () {
  var pageStart = performance.now()
  var firstInteractionDelay = -1

  function recordFirstInteraction() {
    if (firstInteractionDelay === -1) {
      firstInteractionDelay = performance.now() - pageStart
    }
  }

  document.addEventListener('pointerdown', recordFirstInteraction, { once: true, passive: true })
  document.addEventListener('keydown', recordFirstInteraction, { once: true, passive: true })
  document.addEventListener('mousemove', recordFirstInteraction, { once: true, passive: true })
  document.addEventListener('touchstart', recordFirstInteraction, { once: true, passive: true })

  function canvasFingerprint() {
    try {
      var canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 50
      var ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('TrackScale', 2, 15)
      ctx.fillStyle = 'rgba(102,204,0,0.7)'
      ctx.fillText('TrackScale', 4, 17)
      return btoa(canvas.toDataURL()).slice(0, 32)
    } catch (e) {
      return null
    }
  }

  function collectSignals() {
    // webdriver é o sinal mais forte — automação quase certa
    if (navigator.webdriver === true) return 0

    if (/bot|crawler|spider|scraper|curl|wget|python-requests|headless|phantom|selenium|puppeteer|playwright/i.test(navigator.userAgent)) {
      return 0
    }

    var score = 1

    // Sem idiomas definidos
    if (!navigator.languages || navigator.languages.length === 0) score -= 0.2

    // Mobile sem suporte a touch — spoofed UA
    if (/Android|iPhone/i.test(navigator.userAgent) && !('ontouchstart' in window)) score -= 0.2

    // Desktop sem plugins (Chrome com PDF viewer sempre tem >= 1)
    if (!('ontouchstart' in window) && navigator.plugins && navigator.plugins.length === 0) score -= 0.1

    // Hardware muito limitado — é um sinal fraco, não prova de automação
    if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 1) score -= 0.1

    var elapsedMs = performance.now() - pageStart
    if (elapsedMs < 500) score -= 0.15
    if (firstInteractionDelay >= 0 && firstInteractionDelay < 250) score -= 0.2
    if (firstInteractionDelay < 0 && elapsedMs >= 1500) score -= 0.2

    return Math.max(0, score)
  }

  function getFingerprint() {
    try {
      var canvasFp = canvasFingerprint()
      var parts = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.hardwareConcurrency != null ? String(navigator.hardwareConcurrency) : '',
        canvasFp || '',
      ]
      return btoa(unescape(encodeURIComponent(parts.join('|')))).slice(0, 48)
    } catch (e) {
      return null
    }
  }

  window.__trackscale = {
    collect: function () {
      return {
        fingerprint: getFingerprint(),
        humanScoreClient: collectSignals(),
      }
    },
  }
  })()
