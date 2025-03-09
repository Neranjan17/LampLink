let soundOn = false;

const soundToggleInHeader = document.getElementById("soundToggleInHeader");
const soundToggleInStart = document.getElementById("soundToggleInStart");
const startOverlayPanel = document.getElementById("startOverlayPanel");

const startBtn = document.getElementById("startBtn");
const signinBtn = document.getElementById("signinBtn");
const newEventBtn = document.getElementById("newEventBtn");
const createEventBtn = document.getElementById("createEventBtn");

const loginSection = document.getElementById("loginSection");
const createSection = document.getElementById("createSection");
const eventSection = document.getElementById("eventSection");

function clickStartEvent() {
  startOverlayPanel.style.display = "none";
}

function toggleSound() {
  soundOn = !soundOn;
  soundToggleInHeader.classList.toggle("pressed");
  soundToggleInStart.classList.toggle("pressed");
}

function navigatLoginSection() {
  loginSection.scrollIntoView({
    behavior: 'smooth'
  });
}

function navigatCreateSection() {
  createSection.scrollIntoView({
    behavior: 'smooth'
  });
}

function navigatEventSection() {
  eventSection.scrollIntoView({
    behavior: 'smooth'
  });
}

signinBtn.addEventListener("click", navigatEventSection);
newEventBtn.addEventListener("click", navigatCreateSection);
createEventBtn.addEventListener("click", navigatLoginSection);

startBtn.addEventListener("click", clickStartEvent);
soundToggleInHeader.addEventListener("click", toggleSound);
soundToggleInStart.addEventListener("click", toggleSound);