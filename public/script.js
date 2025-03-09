let soundOn = false;

const soundToggleInHeader = document.getElementById("soundToggleInHeader");
const soundToggleInStart = document.getElementById("soundToggleInStart");
const startOverlayPanel = document.getElementById("startOverlayPanel");

const webLogo = document.getElementById("webLogo");
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
function loadWeb() {
  loginSection.style.display = "flex";
  createSection.style.display = "none";
  eventSection.style.display = "none";
}
function navigatLoginSection() {

  loginSection.scrollIntoView({
    behavior: 'smooth'
  });

  loginSection.style.display = "flex";
  createSection.style.display = "none";
  eventSection.style.display = "none";
}
function navigatCreateSection() {

  createSection.scrollIntoView({
    behavior: 'smooth'
  });

  loginSection.style.display = "none";
  createSection.style.display = "flex";
  eventSection.style.display = "none";
}
function navigatEventSection() {

  eventSection.scrollIntoView({
    behavior: 'smooth'
  });

  loginSection.style.display = "none";
  createSection.style.display = "none";
  eventSection.style.display = "flex";
}



loadWeb();

webLogo.addEventListener("click", loadWeb);
signinBtn.addEventListener("click", navigatEventSection);
newEventBtn.addEventListener("click", navigatCreateSection);
createEventBtn.addEventListener("click", navigatLoginSection);

startBtn.addEventListener("click", clickStartEvent);
soundToggleInHeader.addEventListener("click", toggleSound);
soundToggleInStart.addEventListener("click", toggleSound);

