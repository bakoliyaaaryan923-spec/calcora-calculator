/* =========================================================
   CALCORA CALCULATOR
   Complete Calculator Functionality
   ========================================================= */

"use strict";

/* =========================
   STATE
   ========================= */

let current = "";
let memory = 0;
let angleMode = "DEG";

let audioContext = null;

/* =========================
   DOM ELEMENTS
   ========================= */

const display = document.getElementById("display");
const expression = document.getElementById("expression");
const historyList = document.getElementById("historyList");

const scientificPanel = document.getElementById("scientific");
const standardButton = document.getElementById("standardBtn");
const scientificButton = document.getElementById("scientificBtn");
const angleButton = document.getElementById("angleBtn");

/* =========================
   DISPLAY
   ========================= */

function updateDisplay() {
  if (!display) return;

  display.value = current || "0";
}

/* =========================
   BUTTON SOUND
   ========================= */

function buttonSound() {
  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 620;

    gain.gain.setValueAtTime(
      0.045,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.055
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + 0.06
    );
  } catch (error) {
    // Sound is optional.
  }
}

/* =========================
   INPUT
   ========================= */

function press(value) {
  buttonSound();

  if (current === "Error") {
    current = "";
  }

  current += value;

  updateDisplay();
}

/* =========================
   CLEAR
   ========================= */

function clearAll() {
  buttonSound();

  current = "";

  if (expression) {
    expression.textContent = "";
  }

  updateDisplay();
}

/* =========================
   BACKSPACE
   ========================= */

function backspace() {
  buttonSound();

  if (current === "Error") {
    current = "";
  } else {
    current = current.slice(0, -1);
  }

  updateDisplay();
}

/* =========================
   PERCENT
   ========================= */

function percent() {
  buttonSound();

  if (!current || current === "Error") {
    return;
  }

  try {
    const value = Number(current);

    if (!Number.isFinite(value)) {
      throw new Error("Invalid number");
    }

    current = String(value / 100);

    updateDisplay();
  } catch (error) {
    current = "Error";
    updateDisplay();
  }
}

/* =========================
   BIG INTEGER DETECTION
   ========================= */

function isBigIntegerExpression(input) {
  return (
    /^[0-9+\-*()\s]+$/.test(input) &&
    !input.includes("/")
  );
}

/* =========================
   BIG INTEGER CALCULATOR
   ========================= */

function calculateBigInteger(input) {
  const tokens = input.match(
    /\d+|[()+\-*]/g
  );

  if (!tokens) {
    throw new Error("Invalid expression");
  }

  let position = 0;

  function parseExpression() {
    let result = parseTerm();

    while (
      position < tokens.length &&
      (tokens[position] === "+" ||
        tokens[position] === "-")
    ) {
      const operator = tokens[position++];

      const value = parseTerm();

      if (operator === "+") {
        result += value;
      } else {
        result -= value;
      }
    }

    return result;
  }

  function parseTerm() {
    let result = parseFactor();

    while (
      position < tokens.length &&
      tokens[position] === "*"
    ) {
      position++;

      result *= parseFactor();
    }

    return result;
  }

  function parseFactor() {
    if (position >= tokens.length) {
      throw new Error("Invalid expression");
    }

    const token = tokens[position];

    if (token === "-") {
      position++;
      return -parseFactor();
    }

    if (token === "+") {
      position++;
      return parseFactor();
    }

    if (token === "(") {
      position++;

      const result = parseExpression();

      if (tokens[position] !== ")") {
        throw new Error("Missing bracket");
      }

      position++;

      return result;
    }

    if (/^\d+$/.test(token)) {
      position++;

      return BigInt(token);
    }

    throw new Error("Invalid token");
  }

  const result = parseExpression();

  if (position !== tokens.length) {
    throw new Error("Invalid expression");
  }

  return result;
}

/* =========================
   NORMAL CALCULATOR
   ========================= */

function calculateNormal(input) {
  const safe = input.replace(
    /[^0-9+\-*/().]/g,
    ""
  );

  if (!safe) {
    throw new Error("Invalid expression");
  }

  /*
    The expression has already been restricted
    to calculator characters only.
  */

  const result = Function(
    '"use strict"; return (' + safe + ");"
  )();

  if (
    typeof result !== "number" ||
    !Number.isFinite(result)
  ) {
    throw new Error("Invalid result");
  }

  return String(
    Number(result.toFixed(12))
  );
}

/* =========================
   DISPLAY EXPRESSION
   ========================= */

function visibleExpression(value) {
  return String(value)
    .replace(/\*\*/g, "^")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");
}

/* =========================
   MAIN CALCULATION
   ========================= */

function calculate() {
  buttonSound();

  if (!current || current === "Error") {
    return;
  }

  try {
    const old = current.trim();

    let result;

    if (isBigIntegerExpression(old)) {
      result = calculateBigInteger(old).toString();
    } else {
      result = calculateNormal(old);
    }

    current = result;

    expression.textContent =
      visibleExpression(old) + " =";

    updateDisplay();

    addHistory(
      visibleExpression(old),
      current
    );
  } catch (error) {
    current = "Error";

    expression.textContent = "";

    updateDisplay();
  }
}

/* =========================
   HISTORY
   ========================= */

function addHistory(calculation, result) {
  if (!historyList) return;

  const first =
    historyList.querySelector(".history-item");

  if (
    first &&
    first.textContent.includes(
      "Your calculations"
    )
  ) {
    historyList.innerHTML = "";
  }

  const item =
    document.createElement("div");

  item.className = "history-item";

  item.textContent =
    calculation + " = " + result;

  historyList.prepend(item);
}

/* =========================
   CLEAR HISTORY
   ========================= */

function clearHistory() {
  buttonSound();

  if (!historyList) return;

  historyList.innerHTML =
    '<div class="history-item">' +
    "Your calculations will appear here." +
    "</div>";
}

/* =========================
   CALCULATOR MODE
   ========================= */

function setMode(mode) {
  buttonSound();

  if (
    !scientificPanel ||
    !standardButton ||
    !scientificButton
  ) {
    return;
  }

  if (mode === "scientific") {
    scientificPanel.classList.add("show");

    standardButton.classList.remove(
      "active"
    );

    scientificButton.classList.add(
      "active"
    );
  } else {
    scientificPanel.classList.remove(
      "show"
    );

    standardButton.classList.add("active");

    scientificButton.classList.remove(
      "active"
    );
  }
}

/* =========================
   DEG / RAD
   ========================= */

function toggleAngle() {
  buttonSound();

  angleMode =
    angleMode === "DEG"
      ? "RAD"
      : "DEG";

  if (angleButton) {
    angleButton.textContent = angleMode;
  }
}

/* =========================
   ANGLE CONVERSION
   ========================= */

function radians(value) {
  if (angleMode === "DEG") {
    return value * Math.PI / 180;
  }

  return value;
}

/* =========================
   SCIENTIFIC FUNCTIONS
   ========================= */

function special(type) {
  buttonSound();

  try {
    /* PI */

    if (type === "pi") {
      current = String(Math.PI);

      updateDisplay();
      return;
    }

    /* E */

    if (type === "e") {
      current = String(Math.E);

      updateDisplay();
      return;
    }

    if (!current || current === "Error") {
      return;
    }

    const value = Number(current);

    if (!Number.isFinite(value)) {
      throw new Error("Invalid number");
    }

    let result;

    switch (type) {
      case "sin":
        result = Math.sin(
          radians(value)
        );
        break;

      case "cos":
        result = Math.cos(
          radians(value)
        );
        break;

      case "tan":
        result = Math.tan(
          radians(value)
        );
        break;

      case "log":
        result = Math.log10(value);
        break;

      case "ln":
        result = Math.log(value);
        break;

      case "sqrt":
        result = Math.sqrt(value);
        break;

      case "square":
        result = value * value;
        break;

      case "cube":
        result =
          value * value * value;
        break;

      case "inverse":
        result = 1 / value;
        break;

      case "factorial":
        calculateFactorial(value);
        return;

      default:
        throw new Error(
          "Unknown function"
        );
    }

    if (
      typeof result !== "number" ||
      !Number.isFinite(result)
    ) {
      throw new Error(
        "Invalid result"
      );
    }

    const old = current;

    current = String(
      Number(result.toFixed(12))
    );

    expression.textContent =
      type + "(" + old + ") =";

    updateDisplay();

    addHistory(
      type + "(" + old + ")",
      current
    );
  } catch (error) {
    current = "Error";

    expression.textContent = "";

    updateDisplay();
  }
}

/* =========================
   FACTORIAL
   ========================= */

function calculateFactorial(value) {
  if (
    value < 0 ||
    !Number.isInteger(value) ||
    value > 1000
  ) {
    throw new Error(
      "Factorial supports integers from 0 to 1000"
    );
  }

  let factorial = 1n;

  for (
    let i = 2;
    i <= value;
    i++
  ) {
    factorial *= BigInt(i);
  }

  const old = current;

  current = factorial.toString();

  expression.textContent =
    old + "! =";

  updateDisplay();

  addHistory(
    old + "!",
    current
  );
}

/* =========================
   MEMORY CLEAR
   ========================= */

function memoryClear() {
  buttonSound();

  memory = 0;
}

/* =========================
   MEMORY ADD
   ========================= */

function memoryAdd() {
  buttonSound();

  const value = Number(current);

  if (Number.isFinite(value)) {
    memory += value;
  }
}

/* =========================
   MEMORY SUBTRACT
   ========================= */

function memorySubtract() {
  buttonSound();

  const value = Number(current);

  if (Number.isFinite(value)) {
    memory -= value;
  }
}

/* =========================
   MEMORY RECALL
   ========================= */

function memoryRecall() {
  buttonSound();

  current = String(memory);

  updateDisplay();
}

/* =========================
   TOGGLE SIGN
   ========================= */

function toggleSign() {
  buttonSound();

  if (
    !current ||
    current === "0" ||
    current === "Error"
  ) {
    return;
  }

  current =
    current.startsWith("-")
      ? current.slice(1)
      : "-" + current;

  updateDisplay();
}

/* =========================
   KEYBOARD SUPPORT
   ========================= */

document.addEventListener(
  "keydown",
  function (event) {
    const key = event.key;

    /* Numbers */

    if (/^[0-9]$/.test(key)) {
      press(key);
      return;
    }

    /* Operators */

    if (
      [
        "+",
        "-",
        "*",
        "/",
        "(",
        ")",
        "."
      ].includes(key)
    ) {
      press(key);
      return;
    }

    /* Enter */

    if (
      key === "Enter" ||
      key === "="
    ) {
      event.preventDefault();
      calculate();
      return;
    }

    /* Backspace */

    if (key === "Backspace") {
      event.preventDefault();
      backspace();
      return;
    }

    /* Escape */

    if (key === "Escape") {
      clearAll();
      return;
    }

    /* Percentage */

    if (key === "%") {
      percent();
    }
  }
);

/* =========================
   INITIALIZE
   ========================= */

updateDisplay();