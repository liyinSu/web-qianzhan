const GAME_DURATION = 45;
const TOTAL_CARGO = 12;
const MAX_MULTIPLIER = 5;

const cargoTypes = [
  {
    id: "abalone",
    name: "前詹鲍鱼",
    clue: "养殖排上的招牌海味",
    image: "assets/items/abalone.svg",
    stallId: "abalone-raft",
  },
  {
    id: "sea-fish",
    name: "鲜海鱼",
    clue: "清晨码头的新鲜鱼获",
    image: "assets/items/sea-fish.svg",
    stallId: "seafood-dock",
  },
  {
    id: "goat-meat",
    name: "黑山羊肉",
    clue: "榕石生态园附近的农家味",
    image: "assets/items/goat-meat.svg",
    stallId: "mountain-food",
  },
  {
    id: "mung-bean-cake",
    name: "惠来绿豆饼",
    clue: "香甜酥松的惠来手信",
    image: "assets/items/mung-bean-cake.svg",
    stallId: "souvenir-shop",
  },
];

const stalls = [
  {
    id: "abalone-raft",
    name: "鲍鱼养殖排",
    hint: "前詹鲍鱼",
    image: "assets/stalls/abalone-raft.svg",
  },
  {
    id: "seafood-dock",
    name: "海鲜码头",
    hint: "鲜活鱼获",
    image: "assets/stalls/seafood-dock.svg",
  },
  {
    id: "mountain-food",
    name: "山野食集",
    hint: "黑山羊味",
    image: "assets/stalls/mountain-food.svg",
  },
  {
    id: "souvenir-shop",
    name: "惠来手信铺",
    hint: "绿豆饼",
    image: "assets/stalls/souvenir-shop.svg",
  },
];

const elements = {
  startScreen: document.getElementById("startScreen"),
  gameScreen: document.getElementById("gameScreen"),
  resultScreen: document.getElementById("resultScreen"),
  startButton: document.getElementById("startButton"),
  homeButton: document.getElementById("homeButton"),
  replayButton: document.getElementById("replayButton"),
  resultHomeButton: document.getElementById("resultHomeButton"),
  timeValue: document.getElementById("timeValue"),
  scoreValue: document.getElementById("scoreValue"),
  streakValue: document.getElementById("streakValue"),
  timeProgress: document.getElementById("timeProgress"),
  feedback: document.getElementById("feedback"),
  cargoProgress: document.getElementById("cargoProgress"),
  cargoCard: document.getElementById("cargoCard"),
  cargoImage: document.getElementById("cargoImage"),
  cargoName: document.getElementById("cargoName"),
  cargoClue: document.getElementById("cargoClue"),
  stalls: document.getElementById("stalls"),
  dragGhost: document.getElementById("dragGhost"),
  finalScore: document.getElementById("finalScore"),
  correctCount: document.getElementById("correctCount"),
  bestStreak: document.getElementById("bestStreak"),
  accuracyValue: document.getElementById("accuracyValue"),
  resultTitle: document.getElementById("resultTitle"),
  resultSubtitle: document.getElementById("resultSubtitle"),
};

const state = {
  screen: "start",
  time: GAME_DURATION,
  score: 0,
  streak: 0,
  bestStreak: 0,
  correct: 0,
  wrong: 0,
  delivered: 0,
  currentCargo: cargoTypes[0],
  queue: [],
  timerId: null,
  transitionTimeoutId: null,
  deadline: null,
  runId: 0,
  transitionLocked: false,
  drag: null,
};

function buildQueue() {
  const queue = [];

  while (queue.length < TOTAL_CARGO) {
    const round = [...cargoTypes];

    for (let index = round.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [round[index], round[swapIndex]] = [round[swapIndex], round[index]];
    }

    queue.push(...round);
  }

  return queue.slice(0, TOTAL_CARGO);
}

function renderStalls() {
  elements.stalls.replaceChildren();

  stalls.forEach((stall) => {
    const article = document.createElement("article");
    const image = document.createElement("img");
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    const hint = document.createElement("span");
    const button = document.createElement("button");
    const hiddenLabel = document.createElement("span");

    article.className = "stall";
    article.dataset.stallId = stall.id;

    image.src = stall.image;
    image.alt = "";
    image.width = 260;
    image.height = 180;
    image.draggable = false;

    copy.className = "stall-copy";
    name.textContent = stall.name;
    hint.textContent = stall.hint;
    copy.append(name, hint);

    button.className = "quick-delivery";
    button.type = "button";
    button.dataset.stallId = stall.id;
    button.setAttribute("aria-label", `把当前货物投递到${stall.name}`);
    hiddenLabel.textContent = `投递到${stall.name}`;
    button.append(hiddenLabel);
    button.addEventListener("click", () => attemptDelivery(stall.id));

    article.append(image, copy, button);
    elements.stalls.append(article);
  });
}

function showScreen(screenName, focusTarget) {
  const screens = {
    start: elements.startScreen,
    game: elements.gameScreen,
    result: elements.resultScreen,
  };

  Object.entries(screens).forEach(([name, screen]) => {
    const isActive = name === screenName;
    screen.hidden = !isActive;
    screen.classList.toggle("is-active", isActive);
    screen.setAttribute("aria-hidden", String(!isActive));
  });

  state.screen = screenName;

  if (focusTarget) {
    window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  }
}

function startGame() {
  state.runId += 1;
  stopTimer();
  clearTransitionTimeout();
  cleanupDrag();
  state.time = GAME_DURATION;
  state.score = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.correct = 0;
  state.wrong = 0;
  state.delivered = 0;
  state.queue = buildQueue();
  state.transitionLocked = false;
  state.drag = null;

  showScreen("game", elements.cargoCard);
  setFeedback("看清货物，再拖到对应摊位", "neutral");
  clearStallStates();
  setNextCargo();
  syncStatus();

  state.deadline = performance.now() + GAME_DURATION * 1000;
  state.timerId = window.setInterval(updateTimer, 250);
}

function stopTimer() {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }

  state.deadline = null;
}

function updateTimer() {
  if (state.screen !== "game" || state.deadline === null) {
    return;
  }

  state.time = Math.max(0, Math.ceil((state.deadline - performance.now()) / 1000));
  syncStatus();

  if (state.time <= 0) {
    finishGame();
  }
}

function clearTransitionTimeout() {
  if (state.transitionTimeoutId !== null) {
    window.clearTimeout(state.transitionTimeoutId);
    state.transitionTimeoutId = null;
  }
}

function setNextCargo() {
  const cargo = state.queue[state.delivered];

  if (!cargo) {
    state.queue = [...state.queue, ...buildQueue()];
  }

  state.currentCargo = state.queue[state.delivered];
  elements.cargoImage.src = state.currentCargo.image;
  elements.cargoImage.alt = state.currentCargo.name;
  elements.cargoName.textContent = state.currentCargo.name;
  elements.cargoClue.textContent = state.currentCargo.clue;
  elements.cargoProgress.textContent = `${Math.min(state.delivered + 1, TOTAL_CARGO)} / ${TOTAL_CARGO}`;
  elements.cargoCard.setAttribute(
    "aria-label",
    `当前货物：${state.currentCargo.name}。${state.currentCargo.clue}。可拖动或用下方按钮投递。`,
  );
}

function syncStatus() {
  const multiplier = Math.max(1, Math.min(state.streak, MAX_MULTIPLIER));
  const timeRatio = Math.max(0, state.time / GAME_DURATION);

  elements.timeValue.textContent = String(Math.max(0, state.time));
  elements.scoreValue.textContent = new Intl.NumberFormat("zh-CN").format(state.score);
  elements.streakValue.textContent = `×${multiplier}`;
  elements.timeProgress.style.width = `${timeRatio * 100}%`;
  elements.timeProgress.classList.toggle("is-urgent", state.time <= 10);
}

function setFeedback(message, kind) {
  elements.feedback.textContent = message;
  elements.feedback.classList.toggle("is-good", kind === "good");
  elements.feedback.classList.toggle("is-bad", kind === "bad");
}

function clearStallStates() {
  document.querySelectorAll(".stall").forEach((stall) => {
    stall.classList.remove("is-over", "is-correct", "is-wrong");
  });
}

function markStall(stallId, className) {
  const stall = elements.stalls.querySelector(`[data-stall-id="${stallId}"]`);

  if (stall) {
    stall.classList.add(className);
  }
}

function attemptDelivery(stallId) {
  if (state.screen !== "game" || state.transitionLocked || state.time <= 0) {
    return;
  }

  state.transitionLocked = true;
  clearStallStates();

  if (stallId === state.currentCargo.stallId) {
    handleCorrectDelivery(stallId);
  } else {
    handleWrongDelivery(stallId);
  }
}

function handleCorrectDelivery(stallId) {
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.correct += 1;
  state.delivered += 1;

  const multiplier = Math.min(state.streak, MAX_MULTIPLIER);
  const gainedScore = 100 * multiplier;
  state.score += gainedScore;

  elements.cargoCard.classList.add("is-correct");
  markStall(stallId, "is-correct");
  setFeedback(`投递正确！+${gainedScore} 分，连击 ×${multiplier}`, "good");
  syncStatus();

  const runId = state.runId;
  state.transitionTimeoutId = window.setTimeout(() => {
    state.transitionTimeoutId = null;

    if (runId !== state.runId || state.screen !== "game") {
      return;
    }

    elements.cargoCard.classList.remove("is-correct");
    clearStallStates();

    if (state.delivered >= TOTAL_CARGO) {
      finishGame();
      return;
    }

    setNextCargo();
    state.transitionLocked = false;
  }, 430);
}

function handleWrongDelivery(stallId) {
  const correctStall = stalls.find((stall) => stall.id === state.currentCargo.stallId);

  state.wrong += 1;
  state.streak = 0;
  if (state.deadline !== null) {
    state.deadline -= 2000;
    state.time = Math.max(0, Math.ceil((state.deadline - performance.now()) / 1000));
  } else {
    state.time = Math.max(0, state.time - 2);
  }

  elements.cargoCard.classList.add("is-wrong");
  markStall(stallId, "is-wrong");
  setFeedback(`这件货不属于这里，应送往${correctStall.name}。时间 -2 秒`, "bad");
  syncStatus();

  const runId = state.runId;
  state.transitionTimeoutId = window.setTimeout(() => {
    state.transitionTimeoutId = null;

    if (runId !== state.runId || state.screen !== "game") {
      return;
    }

    elements.cargoCard.classList.remove("is-wrong");
    clearStallStates();
    state.transitionLocked = false;

    if (state.time <= 0) {
      finishGame();
    }
  }, 420);
}

function finishGame() {
  if (state.screen !== "game") {
    return;
  }

  stopTimer();
  clearTransitionTimeout();
  state.transitionLocked = true;
  cleanupDrag();

  const attempts = state.correct + state.wrong;
  const accuracy = attempts === 0 ? 0 : Math.round((state.correct / attempts) * 100);
  const result = getResultTitle(accuracy);

  elements.finalScore.textContent = new Intl.NumberFormat("zh-CN").format(state.score);
  elements.correctCount.textContent = `${state.correct} 件`;
  elements.bestStreak.textContent = `×${state.bestStreak}`;
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.resultTitle.textContent = result.title;
  elements.resultSubtitle.textContent = result.subtitle;

  showScreen("result", elements.replayButton);
}

function getResultTitle(accuracy) {
  if (state.score >= 2600 && accuracy >= 80) {
    return {
      title: "前詹金牌摊主",
      subtitle: "山海好物，都被你安排得明明白白",
    };
  }

  if (state.bestStreak >= 4) {
    return {
      title: "今日鲍鱼王",
      subtitle: "这股连击劲，像刚出海的前詹渔船",
    };
  }

  if (state.correct >= 8) {
    return {
      title: "向海五站推荐官",
      subtitle: "会分好物，也记住了前詹的山海路线",
    };
  }

  return {
    title: "前詹赶海新手",
    subtitle: "再开一局，把前詹好味认得更牢",
  };
}

function returnHome() {
  state.runId += 1;
  stopTimer();
  clearTransitionTimeout();
  cleanupDrag();
  elements.cargoCard.classList.remove("is-correct", "is-wrong");
  state.transitionLocked = false;
  showScreen("start", elements.startButton);
}

function pointerPosition(event) {
  return { x: event.clientX, y: event.clientY };
}

function getStallAtPoint(x, y) {
  return [...document.querySelectorAll(".stall")].find((stall) => {
    const rect = stall.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
}

function beginDrag(event) {
  if (state.screen !== "game" || state.transitionLocked || event.button > 0) {
    return;
  }

  event.preventDefault();
  const point = pointerPosition(event);
  state.drag = {
    pointerId: event.pointerId,
    startX: point.x,
    startY: point.y,
    active: false,
  };

  if (elements.cargoCard.setPointerCapture) {
    try {
      elements.cargoCard.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or legacy pointer streams may not be capturable.
    }
  }
}

function moveDrag(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) {
    return;
  }

  const point = pointerPosition(event);
  const distance = Math.hypot(point.x - state.drag.startX, point.y - state.drag.startY);

  if (!state.drag.active && distance < 8) {
    return;
  }

  if (!state.drag.active) {
    state.drag.active = true;
    elements.cargoCard.classList.add("is-dragging");
    elements.dragGhost.replaceChildren(elements.cargoImage.cloneNode(true));
    elements.dragGhost.classList.add("is-visible");
  }

  event.preventDefault();
  elements.dragGhost.style.left = `${point.x}px`;
  elements.dragGhost.style.top = `${point.y}px`;

  clearStallStates();
  const targetStall = getStallAtPoint(point.x, point.y);
  targetStall?.classList.add("is-over");
}

function endDrag(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) {
    return;
  }

  const wasActive = state.drag.active;
  const point = pointerPosition(event);
  const targetStall = wasActive ? getStallAtPoint(point.x, point.y) : null;

  cleanupDrag();

  if (targetStall) {
    attemptDelivery(targetStall.dataset.stallId);
  }
}

function cleanupDrag() {
  state.drag = null;
  elements.cargoCard.classList.remove("is-dragging");
  elements.dragGhost.classList.remove("is-visible");
  elements.dragGhost.replaceChildren();
  clearStallStates();
}

function handleCargoKeydown(event) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const firstButton = elements.stalls.querySelector("button");
    firstButton?.focus();
    setFeedback("已进入快捷投递，请选择一个摊位", "neutral");
  }

  if (event.key === "Escape") {
    returnHome();
  }
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && state.screen === "game") {
    returnHome();
  }
}

renderStalls();
syncStatus();

// The start screen is the only active screen on first load.
elements.gameScreen.setAttribute("aria-hidden", "true");
elements.resultScreen.setAttribute("aria-hidden", "true");

elements.startButton.addEventListener("click", startGame);
elements.replayButton.addEventListener("click", startGame);
elements.homeButton.addEventListener("click", returnHome);
elements.resultHomeButton.addEventListener("click", returnHome);
elements.cargoCard.addEventListener("pointerdown", beginDrag);
elements.cargoCard.addEventListener("pointermove", moveDrag);
elements.cargoCard.addEventListener("pointerup", endDrag);
elements.cargoCard.addEventListener("pointercancel", cleanupDrag);
elements.cargoCard.addEventListener("keydown", handleCargoKeydown);
document.addEventListener("keydown", handleGlobalKeydown);
