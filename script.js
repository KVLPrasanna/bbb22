document.addEventListener("DOMContentLoaded", function () {
  const cake = document.querySelector(".cake");
  const flavorSelect = document.getElementById("flavorSelect");
  const candleColorSelect = document.getElementById("candleColorSelect");
  const candleCountDisplay = document.getElementById("candleCount");
  const shareBtn = document.getElementById("shareBtn");
  const resetBtn = document.getElementById("resetLinkBtn");
  const setMessageBtn = document.getElementById("setMessageBtn");
  const customMessageInput = document.getElementById("customMessageInput");
  const customMessageDisplay = document.getElementById("customMessageDisplay");

  let candles = [];
  let audioContext;
  let analyser;
  let microphone;
  let currentMessage = "";

  // Track current settings
  let currentFlavor = "chocolate";
  let currentCandleColor = "red";

  if (shareBtn) shareBtn.disabled = true; // Disable share button initially

  function toHex(str) {
    return [...str].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  }
  function fromHex(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }
  if (candleColorSelect) {
  currentCandleColor = candleColorSelect.value; // Set initial value
  candleColorSelect.addEventListener("change", () => {
    currentCandleColor = candleColorSelect.value;
  });
}

  function updateCandleCount() {
    const activeCandles = candles.filter(c => !c.classList.contains("out")).length;
    if (candleCountDisplay) candleCountDisplay.textContent = activeCandles;
  }

function addCandle(left, top, color = currentCandleColor) {
  const candle = document.createElement("div");
  candle.className = "candle";
  candle.style.left = left + "px";
  candle.style.top = (top - 30) + "px";

  candle.setAttribute("data-color", color);

  // Set both custom properties
  candle.style.setProperty("--candle-top", color);               // top color = selected color
  candle.style.setProperty("--candle-body", darkenColor(color)); // body color = darker

  const flame = document.createElement("div");
  flame.className = "flame";
  candle.appendChild(flame);

  cake.appendChild(candle);
  candles.push(candle);
  updateCandleCount();
}

function darkenColor(hex, percent = .52) {
  const num = parseInt(hex.slice(1), 16);
  let r = Math.floor(((num >> 16) & 255) * (1 - percent));
  let g = Math.floor(((num >> 8) & 255) * (1 - percent));
  let b = Math.floor((num & 255) * (1 - percent));
  return `rgb(${r}, ${g}, ${b})`;
}

  // Add candle by clicking the cake
  if (cake) {
    cake.addEventListener("click", function (event) {
      const rect = cake.getBoundingClientRect();
      const left = event.clientX - rect.left;
      const top = event.clientY - rect.top;
      addCandle(left, top);
    });
  }

  function isBlowing() {
    if (!analyser) return false;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    let average = sum / bufferLength;
    return average > 40;
  }

  function blowOutCandles() {
    let blownOut = 0;
    if (isBlowing()) {
      candles.forEach(candle => {
        if (!candle.classList.contains("out") && Math.random() > 0.5) {
          candle.classList.add("out");
          blownOut++;
        }
      });
    }
    if (blownOut > 0) {
      updateCandleCount();
    }
  }

  // microphone setup
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        setInterval(blowOutCandles, 200);
      })
      .catch(function (err) {
        console.log("Unable to access microphone: " + err);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }

  // expose helpers
  window.addCandleAt = addCandle;
  window.updateCandleCount = updateCandleCount;

  // encode/decode helpers that use current cake bounding box
function encodeCandlePoints() {
  const rect = cake.getBoundingClientRect();
  return candles.map(c => {
    const left = parseFloat(c.style.left);
    const top = parseFloat(c.style.top) + 30;
    const xp = Math.max(0, Math.min(1, left / rect.width)).toFixed(4);
    const yp = Math.max(0, Math.min(1, top / rect.height)).toFixed(4);
    const color = c.getAttribute("data-color") || "#ff0000";
    return `${color}_${xp}_${yp}`; // store full hex
  }).join("-");
}

function decodeCandlePoints(str) {
  if (!str) return [];
  const rect = cake.getBoundingClientRect();
  return str.split("-").map(p => {
    const [color, xp, yp] = p.split("_");
    return {
      x: parseFloat(xp) * rect.width,
      y: parseFloat(yp) * rect.height,
      color: color.startsWith("#") ? color : "#" + color
    };
  });
}


function restoreCandles(pts) {
  pts.forEach(pt => {
    addCandle(pt.x, pt.y, pt.color);
  });
  updateCandleCount();
}
  function restoreFromHash() {
    if (!location.hash) return;

    // remove leading #
    const hash = location.hash.slice(1);
    // treat like query string
    const params = new URLSearchParams(hash.replace(/&/g, "&"));
    const cParam = params.get("c");
    const mParam = params.get("m");
    const fParam = params.get("f");

    if (cParam) {
      const pts = decodeCandlePoints(cParam);
      restoreCandles(pts);
    }

    if (mParam) {
      try {
        currentMessage = fromHex(mParam);
        if (customMessageInput) customMessageInput.value = currentMessage;
        if (customMessageDisplay) customMessageDisplay.textContent = currentMessage || "";
      } catch {
        currentMessage = "";
      }
    }

    if (fParam === "vanilla") {
      if (cake) cake.classList.add("vanilla");
      if (flavorSelect) flavorSelect.value = "vanilla";
    } else {
      if (cake) cake.classList.remove("vanilla");
      if (flavorSelect) flavorSelect.value = "chocolate";
    }
  }

  // Apply flavor changes live
  if (flavorSelect) {
    flavorSelect.addEventListener("change", () => {
      const selected = flavorSelect.value;
      if (selected === "vanilla") {
        cake.classList.add("vanilla");
      } else {
        cake.classList.remove("vanilla");
      }
    });
  }

  // message set button
  setMessageBtn?.addEventListener("click", () => {
    currentMessage = (customMessageInput?.value || "").trim();
    if (customMessageDisplay) customMessageDisplay.textContent = currentMessage || "";
  });

  // Robust reset function (safe to call at any time)
  function resetCandles() {
    // remove elements
    candles.forEach(c => c.remove());
    candles = [];
    updateCandleCount();

    // clear message UI + state
    currentMessage = "";
    if (customMessageInput) customMessageInput.value = "";
    if (customMessageDisplay) customMessageDisplay.textContent = "";

    // reset flavor UI
    if (flavorSelect) flavorSelect.value = "chocolate";
    if (cake) cake.classList.remove("vanilla");

    // clear URL hash
    history.replaceState(null, '', location.pathname);
  }

  // make available globally (backwards compatibility)
  window.resetCandles = resetCandles;

  // wire reset button (this is the piece that was missing)
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetCandles();
      // small visual confirmation optional:
      // alert('Candles reset.');
    });
  }

  // Share button (enabled after restore)
  restoreFromHash();
  if (shareBtn) {
    shareBtn.disabled = false;
    shareBtn.addEventListener("click", () => {
      const candleHash = encodeCandlePoints();
      const hexMessage = toHex(currentMessage);
      const flavor = flavorSelect?.value || "chocolate"; // get selected flavor

      const hashStr = `#c=${candleHash}&m=${hexMessage}&f=${flavor}`;
      const urlWithHash = location.pathname + hashStr;
      history.replaceState(null, '', urlWithHash);

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(location.href).catch(() => {});
      }
      alert("Share link ready! (Copied to clipboard if allowed)");
    });
  }
});


