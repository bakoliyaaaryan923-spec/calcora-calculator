
/* =========================================================
   CALCORA CALCULATOR
   Final Corrected Calculator Functionality
   ========================================================= */

"use strict";

/* =========================================================
   STATE
   ========================================================= */

let current = "";
let memory = 0;
let angleMode = "DEG";
let audioContext = null;

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const display = document.getElementById("display");
const expression = document.getElementById("expression");
const historyList = document.getElementById("historyList");

const scientificPanel = document.getElementById("scientific");
const standardButton = document.getElementById("standardBtn");
const scientificButton = document.getElementById("scientificBtn");
const angleButton = document.getElementById("angleBtn");

/* =========================================================
   DISPLAY
   ========================================================= */

function updateDisplay() {
  if (!display) return;

  display.value = current || "0";
}

/* =========================================================
   BUTTON SOUND
   ========================================================= */

function buttonSound() {
  try {
    const AudioCtx =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) return;

    if (!audioContext) {
      audioContext = new AudioCtx();
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
    /* Sound is optional */
  }
}

/* =========================================================
   INPUT
   ========================================================= */

function press(value) {
  buttonSound();

  if (current === "Error") {
    current = "";
  }

  /*
    Prevent obvious invalid operator combinations.
  */

  const operators = ["+", "-", "*", "/", "**"];

  const lastTwo = current.slice(-2);
  const lastOne = current.slice(-1);

  if (operators.includes(value)) {

    if (!current && value !== "-") {
      return;
    }

    if (
      operators.includes(lastOne) &&
      value !== "-" &&
      value !== "**"
    ) {
      current = current.slice(0, -1);
    }

    if (
      value === "**" &&
      (
        current.endsWith("**") ||
        current.endsWith("*")
      )
    ) {
      return;
    }
  }

  /*
    Prevent multiple decimal points
    in the same number.
  */

  if (value === ".") {
    const parts = current.split(/[+\-*/()]/);
    const lastNumber = parts[parts.length - 1];

    if (lastNumber.includes(".")) {
      return;
    }
  }

  current += value;

  updateDisplay();
}

/* =========================================================
   CLEAR
   ========================================================= */

function clearAll() {
  buttonSound();

  current = "";

  if (expression) {
    expression.textContent = "";
  }

  updateDisplay();
}

/* =========================================================
   BACKSPACE
   ========================================================= */

function backspace() {
  buttonSound();

  if (current === "Error") {
    current = "";
  } else {

    if (current.endsWith("**")) {
      current = current.slice(0, -2);
    } else {
      current = current.slice(0, -1);
    }

  }

  updateDisplay();
}

/* =========================================================
   PERCENT
   ========================================================= */

function percent() {
  buttonSound();

  if (!current || current === "Error") {
    return;
  }

  try {
    const value = evaluateExpression(current);

    if (!Number.isFinite(value)) {
      throw new Error("Invalid number");
    }

    const old = current;

    current = formatNumber(value / 100);

    expression.textContent =
      visibleExpression(old) + "% =";

    updateDisplay();

    addHistory(
      visibleExpression(old) + "%",
      current
    );

  } catch (error) {
    current = "Error";
    expression.textContent = "";
    updateDisplay();
  }
}

/* =========================================================
   NUMBER FORMATTING
   ========================================================= */

function formatNumber(value) {

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (!Number.isFinite(value)) {
    throw new Error("Invalid result");
  }

  if (Object.is(value, -0)) {
    return "0";
  }

  const rounded =
    Number(value.toPrecision(15));

  return String(rounded);
}

/* =========================================================
   BIG INTEGER DETECTION
   ========================================================= */

function isBigIntegerExpression(input) {
  return (
    /^[0-9+\-*()\s]+$/.test(input) &&
    !input.includes("/") &&
    !input.includes("**")
  );
}

/* =========================================================
   BIG INTEGER CALCULATOR
   ========================================================= */

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
      (
        tokens[position] === "+" ||
        tokens[position] === "-"
      )
    ) {

      const operator =
        tokens[position++];

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

    const token =
      tokens[position];

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

      const result =
        parseExpression();

      if (
        tokens[position] !== ")"
      ) {
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

  const result =
    parseExpression();

  if (position !== tokens.length) {
    throw new Error("Invalid expression");
  }

  return result;
}

/* =========================================================
   NORMAL EXPRESSION PARSER
   Supports:
   + - * / ** ( )
   decimals
   ========================================================= */

function evaluateExpression(input) {

  const tokens = tokenize(input);

  if (!tokens.length) {
    throw new Error("Empty expression");
  }

  let position = 0;

  function peek() {
    return tokens[position];
  }

  function consume() {
    return tokens[position++];
  }

  function parseExpression() {

    let result = parseTerm();

    while (
      peek() === "+" ||
      peek() === "-"
    ) {

      const operator = consume();

      const right = parseTerm();

      if (operator === "+") {
        result += right;
      } else {
        result -= right;
      }
    }

    return result;
  }

  function parseTerm() {

    let result = parsePower();

    while (
      peek() === "*" ||
      peek() === "/"
    ) {

      const operator = consume();

      const right = parsePower();

      if (operator === "*") {
        result *= right;
      } else {

        if (right === 0) {
          throw new Error("Division by zero");
        }

        result /= right;
      }
    }

    return result;
  }

  function parsePower() {

    let left = parseUnary();

    /*
      Power is right associative:
      2 ** 3 ** 2
      = 2 ** (3 ** 2)
    */

    if (peek() === "**") {

      consume();

      const right = parsePower();

      left = Math.pow(left, right);
    }

    return left;
  }

  function parseUnary() {

    if (peek() === "+") {
      consume();
      return parseUnary();
    }

    if (peek() === "-") {
      consume();
      return -parseUnary();
    }

    return parsePrimary();
  }

  function parsePrimary() {

    const token = peek();

    if (token === "(") {

      consume();

      const result =
        parseExpression();

      if (peek() !== ")") {
        throw new Error("Missing bracket");
      }

      consume();

      return result;
    }

    if (
      typeof token === "string" &&
      /^[0-9]+(?:\.[0-9]+)?$/.test(token)
    ) {

      consume();

      return Number(token);
    }

    throw new Error("Invalid expression");
  }

  const result =
    parseExpression();

  if (position !== tokens.length) {
    throw new Error("Invalid expression");
  }

  if (
    typeof result !== "number" ||
    !Number.isFinite(result)
  ) {
    throw new Error("Invalid result");
  }

  return result;
}

/* =========================================================
   TOKENIZER
   ========================================================= */

function tokenize(input) {

  const tokens = [];
  let i = 0;

  while (i < input.length) {

    const char = input[i];

    /*
      Ignore spaces
    */

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    /*
      Power operator
    */

    if (
      char === "*" &&
      input[i + 1] === "*"
    ) {

      tokens.push("**");

      i += 2;
      continue;
    }

    /*
      Normal operators
    */

    if (
      "+-*/()".includes(char)
    ) {

      tokens.push(char);

      i++;
      continue;
    }

    /*
      Numbers
    */

    if (
      /[0-9.]/.test(char)
    ) {

      let number = "";
      let dots = 0;

      while (
        i < input.length &&
        /[0-9.]/.test(input[i])
      ) {

        if (input[i] === ".") {
          dots++;

          if (dots > 1) {
            throw new Error(
              "Invalid decimal"
            );
          }
        }

        number += input[i];

        i++;
      }

      if (
        number === "." ||
        number === ""
      ) {
        throw new Error(
          "Invalid number"
        );
      }

      tokens.push(number);

      continue;
    }

    throw new Error(
      "Invalid character"
    );
  }

  return tokens;
}

/* =========================================================
   VISIBLE EXPRESSION
   ========================================================= */

function visibleExpression(value) {

  return String(value)
    .replace(/\*\*/g, "^")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");
}

/* =========================================================
   MAIN CALCULATION
   ========================================================= */

function calculate() {

  buttonSound();

  if (
    !current ||
    current === "Error"
  ) {
    return;
  }

  try {

    const old =
      current.trim();

    let result;

    /*
      Use BigInt for large
      integer + - * expressions.
    */

    if (
      isBigIntegerExpression(old)
    ) {

      result =
        calculateBigInteger(old)
          .toString();

    } else {

      result =
        formatNumber(
          evaluateExpression(old)
        );
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

/* =========================================================
   HISTORY
   ========================================================= */

function addHistory(
  calculation,
  result
) {

  if (!historyList) {
    return;
  }

  const first =
    historyList.querySelector(
      ".history-item"
    );

  if (
    first &&
    first.textContent.includes(
      "Your calculations"
    )
  ) {

    historyList.innerHTML = "";
  }

  const item =
    document.createElement(
      "div"
    );

  item.className =
    "history-item";

  item.textContent =
    calculation + " = " + result;

  historyList.prepend(item);

  /*
    Keep history manageable.
  */

  while (
    historyList.children.length > 50
  ) {

    historyList.removeChild(
      historyList.lastElementChild
    );
  }
}

/* =========================================================
   CLEAR HISTORY
   ========================================================= */

function clearHistory() {

  buttonSound();

  if (!historyList) {
    return;
  }

  historyList.innerHTML =
    '<div class="history-item">' +
    "Your calculations will appear here." +
    "</div>";
}

/* =========================================================
   CALCULATOR MODE
   ========================================================= */

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

    scientificPanel.classList.add(
      "show"
    );

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

    standardButton.classList.add(
      "active"
    );

    scientificButton.classList.remove(
      "active"
    );
  }
}

/* =========================================================
   DEG / RAD
   ========================================================= */

function toggleAngle() {

  buttonSound();

  angleMode =
    angleMode === "DEG"
      ? "RAD"
      : "DEG";

  if (angleButton) {
    angleButton.textContent =
      angleMode;
  }
}

/* =========================================================
   ANGLE CONVERSION
   ========================================================= */

function radians(value) {

  if (angleMode === "DEG") {

    return (
      value * Math.PI / 180
    );
  }

  return value;
}

/* =========================================================
   SCIENTIFIC FUNCTIONS
   ========================================================= */

function special(type) {

  buttonSound();

  try {

    /*
      PI
    */

    if (type === "pi") {

      current =
        String(Math.PI);

      updateDisplay();

      return;
    }

    /*
      E
    */

    if (type === "e") {

      current =
        String(Math.E);

      updateDisplay();

      return;
    }

    if (
      !current ||
      current === "Error"
    ) {
      return;
    }

    /*
      Evaluate the current
      expression first.
    */

    const value =
      evaluateExpression(current);

    if (!Number.isFinite(value)) {
      throw new Error(
        "Invalid number"
      );
    }

    let result;

    switch (type) {

      case "sin":

        result =
          Math.sin(
            radians(value)
          );

        break;

      case "cos":

        result =
          Math.cos(
            radians(value)
          );

        break;

      case "tan":

        result =
          Math.tan(
            radians(value)
          );

        /*
          Avoid tiny floating-point
          values such as 1.224e-16.
        */

        if (
          Math.abs(result) <
          1e-12
        ) {
          result = 0;
        }

        break;

      case "log":

        if (value <= 0) {
          throw new Error(
            "Invalid logarithm"
          );
        }

        result =
          Math.log10(value);

        break;

      case "ln":

        if (value <= 0) {
          throw new Error(
            "Invalid logarithm"
          );
        }

        result =
          Math.log(value);

        break;

      case "sqrt":

        if (value < 0) {
          throw new Error(
            "Invalid square root"
          );
        }

        result =
          Math.sqrt(value);

        break;

      case "square":

        result =
          value * value;

        break;

      case "cube":

        result =
          value * value * value;

        break;

      case "inverse":

        if (value === 0) {
          throw new Error(
            "Division by zero"
          );
        }

        result =
          1 / value;

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

    const old =
      current;

    current =
      formatNumber(result);

    expression.textContent =
      type +
      "(" +
      visibleExpression(old) +
      ") =";

    updateDisplay();

    addHistory(
      type +
      "(" +
      visibleExpression(old) +
      ")",
      current
    );

  } catch (error) {

    current = "Error";

    expression.textContent = "";

    updateDisplay();
  }
}

/* =========================================================
   FACTORIAL
   ========================================================= */

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

  const old =
    current;

  current =
    factorial.toString();

  expression.textContent =
    visibleExpression(old) +
    "! =";

  updateDisplay();

  addHistory(
    visibleExpression(old) + "!",
    current
  );
}

/* =========================================================
   MEMORY CLEAR
   ========================================================= */

function memoryClear() {

  buttonSound();

  memory = 0;
}

/* =========================================================
   MEMORY ADD
   ========================================================= */

function memoryAdd() {

  buttonSound();

  try {

    const value =
      evaluateExpression(current);

    if (Number.isFinite(value)) {
      memory += value;
    }

  } catch (error) {
    /* Ignore invalid memory input */
  }
}

/* =========================================================
   MEMORY SUBTRACT
   ========================================================= */

function memorySubtract() {

  buttonSound();

  try {

    const value =
      evaluateExpression(current);

    if (Number.isFinite(value)) {
      memory -= value;
    }

  } catch (error) {
    /* Ignore invalid memory input */
  }
}

/* =========================================================
   MEMORY RECALL
   ========================================================= */

function memoryRecall() {

  buttonSound();

  current =
    formatNumber(memory);

  updateDisplay();
}

/* =========================================================
   TOGGLE SIGN
   ========================================================= */

function toggleSign() {

  buttonSound();

  if (
    !current ||
    current === "Error"
  ) {
    return;
  }

  /*
    If the current value is a
    simple number, toggle directly.
  */

  if (
    /^-?\d+(?:\.\d+)?$/.test(current)
 