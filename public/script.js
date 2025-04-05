import { animateSectionTransition, animateOverlayTransition, preloadImages, setButtonLoading } from './animation-utils.js';

const webLogo = document.getElementById("webLogo");

// init login section elements
const loginSection = document.getElementById("loginSection");
const loginIdInput = document.getElementById("loginIdInput");
const signinBtn = document.getElementById("signinBtn");
const newEventBtn = document.getElementById("newEventBtn");

// init create section elements
const createSection = document.getElementById("createSection");
const eventIdViewText = document.getElementById("eventIdViewText");
const guestCountViewText = document.getElementById("guestCountViewText");
const createEventBtn = document.getElementById("createEventBtn");
const addGuestBtn = document.getElementById("addGuestBtn");
const firstHeaderInput = document.getElementById("firstHeaderInput");
const secondHeaderInput = document.getElementById("secondHeaderInput");
const passwordInput = document.getElementById("passwordInput");
const soundLinkInput = document.getElementById("soundLinkInput");
const guestTitleSelect = document.getElementById("guestTitleSelect");
const guestNameInput = document.getElementById("guestNameInput");
const guestImgLinkInput = document.getElementById("guestImgLinkInput");

// init event section elements
const eventSection = document.getElementById("eventSection");
const bannerTitleTop = document.getElementById("bannerTitleTop");
const bannerTitleBottom = document.getElementById("bannerTitleBottom");
const soundToggleInHeader = document.getElementById("soundToggleInHeader");
const soundToggleInStart = document.getElementById("soundToggleInStart");
const startOverlayPanel = document.getElementById("startOverlayPanel");
const eventWelcomeText = document.getElementById("eventWelcomeText");
const guestPicImg = document.getElementById("guestPicImg");
const eventLampPicImg = document.getElementById("eventLampPicImg");
const guestTitleSpan = document.getElementById("guestTitleSpan");
const guestNameSpan = document.getElementById("guestNameSpan");
const startBtn = document.getElementById("startBtn");
const skipBtn = document.getElementById("skipBtn");
const backBtn = document.getElementById("backBtn");
const lightBtn = document.getElementById("lightBtn");

loginSection.style.display = "flex";
createSection.style.display = "none";
eventSection.style.display = "none";
soundToggleInHeader.style.visibility = "hidden";

// Update the Add Guest button text
addGuestBtn.innerText = "Add Guest";

// Polling interval (in milliseconds)
const POLLING_INTERVAL = 2000; // Poll every 2 seconds
let pollingIntervalId = null;

webLogo.addEventListener("click", function() {
  stopPolling();
  location.reload();
});

// ------------------
// LOGIN SECTION
// ------------------
function navigatLoginSection() {
  stopPolling();
  animateSectionTransition(
    document.querySelector('section[style*="display: flex"]'), 
    loginSection
  );
}

async function fetchEventInfo(inputValue) {
  try {
    const response = await fetch(`/api/event-info/${inputValue}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch event information');
    }
    const eventInfo = await response.json();
    return eventInfo;
  } catch (error) {
    console.error('Error fetching event info:', error);
    throw error;
  }
}

async function preloadEventAssets(eventInfo) {
  // Prepare images to preload
  const imagesToPreload = [];
  
  // Add lamp images (0-5)
  for (let i = 0; i <= 5; i++) {
    imagesToPreload.push(`assets/OilLamp_${i}.gif`);
  }
  
  // Add guest images if available
  if (eventInfo.guestsInfo && eventInfo.guestsInfo.length > 0) {
    eventInfo.guestsInfo.forEach(guest => {
      if (guest.image_url) {
        imagesToPreload.push(guest.image_url);
      }
    });
  }
  
  // Add default guest image
  imagesToPreload.push("assets/default_guest_pic.svg");
  
  return new Promise((resolve) => {
    preloadImages(
      imagesToPreload,
      (progress) => {
        // Update button text with progress if needed
        signinBtn.innerHTML = `Loading... ${Math.round(progress)}%`;
      },
      () => {
        resolve();
      }
    );
  });
}

signinBtn.addEventListener("click", async function() {
  let inputId = loginIdInput.value.trim();
  
  if (inputId.length == 8 || inputId.length == 9) {
    // Set button to loading state
    setButtonLoading(signinBtn, true);
    
    try {
      const checkEndpoint = inputId.length === 8 ? `/check-event/${inputId}` : `/check-password/${encodeURIComponent(inputId)}`;
      const response = await fetch(checkEndpoint);
      const data = await response.json();
      
      if(data.exists) {
        console.log(`Valid ${inputId.length === 8 ? 'Event ID' : 'Password'}`);
        const eventInfo = await fetchEventInfo(inputId);
        
        // Preload assets before navigating
        await preloadEventAssets(eventInfo);
        
        // Reset button state
        setButtonLoading(signinBtn, false);
        
        // Navigate to event section
        navigatEventSection(eventInfo);
      } else {
        setButtonLoading(signinBtn, false);
        alert(`Invalid ${inputId.length === 8 ? 'Event ID' : 'Event Password'}!`);
      }
    } catch (error) {
      setButtonLoading(signinBtn, false);
      console.error(`Error checking ${inputId.length === 8 ? 'event ID' : 'password'}:`, error);
      alert("Error connecting to server");
    }
  } else {
    alert("Invalid Id or Password!");
  }
});

newEventBtn.addEventListener("click", navigatCreateSection);

// ------------------
// CREATE SECTION
// ------------------
let defaultfirstHeader = "Welcome to the";
let defaultSecondHeader = "Lamp Lighting Feature";
let defaultGuestPicLink = "assets/default_guest_pic.svg";
let defaultSoundLink = "assets/background_sound.mp3";
let defaultGuestTitle = "m/s";
let guestsInfo = [];
let eventID = 0; 

async function navigatCreateSection() {
  stopPolling();
  guestsInfo.length = 0;
  guestCountViewText.innerText = "Add a Guest";
  firstHeaderInput.value = "";
  secondHeaderInput.value = "";
  passwordInput.value = "";
  soundLinkInput.value = "";
  guestTitleSelect.value = "m/s";
  guestNameInput.value = "";
  guestImgLinkInput.value = "";
  eventID = await generateEventID();
  eventIdViewText.innerText = "Your Event ID is : " + eventID;
  
  animateSectionTransition(
    document.querySelector('section[style*="display: flex"]'), 
    createSection
  );
}

async function generateEventID() {
  let isIdValid = false;
  while (!isIdValid) {
    eventID = Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;
    try {
      const response = await fetch(`/check-event/${eventID}`);
      const data = await response.json();
      isIdValid = !data.exists;
      if(!isIdValid) {
        console.log("Generated Id already exists!");
      }
    } catch (error) {
      console.error("Error checking event ID:", error);
    }
  }
  console.log("Unique Id found");
  return eventID;
}

function createNewEvent() {
  const eventData = {
    eventId: eventID,
    firstHeader: firstHeaderInput.value.trim() !== "" ? firstHeaderInput.value.trim() : defaultfirstHeader,
    secondHeader: secondHeaderInput.value.trim() !== "" ? secondHeaderInput.value.trim() : defaultSecondHeader,
    password: passwordInput.value.trim(),
    soundUrl: soundLinkInput.value.trim() !== "" ? soundLinkInput.value.trim() : defaultSoundLink
  };
  const password = passwordInput.value.trim();
  
  // Set button to loading state
  setButtonLoading(createEventBtn, true);
  
  if (password !== "" && password.length == 9) {
    fetch(`/check-password/${encodeURIComponent(password)}`)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (!data.exists) {
          return fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
          });
        } else {
          alert("Password already exists!");
          throw new Error("Password already exists");
        }
      })
      .then(response => {
        if (!response.ok) throw new Error('Failed to create event');
        return response.json();
      })
      .then(data => {
        console.log('Event created successfully:', data);
        const addGuestPromises = guestsInfo.map(guest => {
          const guestData = {
            guestName: guest.name,
            guestTitle: guest.title,
            imageUrl: guest.picUrl
          };
          return fetch(`/api/events/${eventID}/guests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(guestData)
          });
        });
        return Promise.all(addGuestPromises);
      })
      .then(responses => {
        const allSuccessful = responses.every(response => response.ok);
        if (!allSuccessful) throw new Error('Some guests could not be added');
        console.log('All guests added successfully');
        setButtonLoading(createEventBtn, false);
        navigatLoginSection();
      })
      .catch(error => {
        setButtonLoading(createEventBtn, false);
        console.error('Error in event creation process:', error);
        if (error.message !== "Password already exists") {
          alert('There was an error creating your event. Please try again.');
        }
      });
  } else {
    setButtonLoading(createEventBtn, false);
    alert("Password is required with nine characters!");
  }
}

addGuestBtn.addEventListener("click", function() {
  let guestTitle = guestTitleSelect.value.trim();
  let guestName = guestNameInput.value.trim();
  let guestImgLink = guestImgLinkInput.value.trim() !== "" ? guestImgLinkInput.value : defaultGuestPicLink;
  
  if(guestTitle !== defaultGuestTitle && guestName !== "") {
    guestsInfo.push({ title: guestTitle, name: guestName, picUrl: guestImgLink });
    
    // Update guest count text with animation
    guestCountViewText.innerText = `Guest Added: ${guestsInfo.length} Total`;
    guestCountViewText.classList.add('guest-added-animation');
    
    // Remove animation class after animation completes
    setTimeout(() => {
      guestCountViewText.classList.remove('guest-added-animation');
    }, 500);
    
    guestTitleSelect.value = defaultGuestTitle;
    guestNameInput.value = "";
    guestImgLinkInput.value = "";
  } else {
    alert("Title and name are required!");
  }
});

createEventBtn.addEventListener("click", createNewEvent);

// ------------------
// EVENT SECTION
// ------------------
let backgroundAudio;
let soundOn = false;
let isEventStart = false;
let eventInformation;
let guestIndex = 0; // local pointer for UI updates
let previousLightCount = 0;
let previousGuestIndex = 0;
let previousStartStatus = false;

function navigatEventSection(eventInfo) {
  eventInformation = eventInfo;
  // Reset guest pointer based on backend state
  guestIndex = eventInformation.currentGuest || 0;
  previousGuestIndex = guestIndex;
  previousLightCount = eventInformation.currentLight || 0;
  previousStartStatus = eventInformation.isStart || false;
  isEventStart = previousStartStatus;
  
  backgroundAudio = new Audio(eventInformation.soundUrl);
  bannerTitleTop.innerText = eventInformation.topHeader;
  bannerTitleBottom.innerText = eventInformation.bottomHeader;
  
  // If there are guests, update the guest UI; otherwise hide guest display
  if (eventInformation.guestsInfo.length !== 0) {
    updateGuestUI(guestIndex);
    // For hosts, show both skip and back buttons
    if(eventInformation.isHost){
      skipBtn.style.display = "block";
      backBtn.style.display = "block";
    }
  } else {
    guestPicImg.style.display = "none";
    guestTitleSpan.style.display = "none";
    guestNameSpan.style.display = "none";
    eventWelcomeText.style.fontSize = "3rem";
    // Hide skipBtn if no guests exist
    skipBtn.style.display = "none";
    // For hosts, ensure backBtn is visible
    if(eventInformation.isHost) {
      backBtn.style.display = "block";
    }
  }
  
  // Set initial lamp state
  setEventLampLights(previousLightCount);
  
  // Show or hide the overlay based on isStart value with animation
  if (isEventStart) {
    animateOverlayTransition(startOverlayPanel, false);
    playSound();
  } else {
    startOverlayPanel.style.display = "flex";
  }
  
  // For non-hosts, disable host-only controls
  if (!eventInformation.isHost) {
    startBtn.disabled = true;
    backBtn.style.display = "none";
    skipBtn.style.display = "none";
  }

  // Use animated transition
  animateSectionTransition(
    document.querySelector('section[style*="display: flex"]'), 
    eventSection
  );
  
  soundToggleInHeader.style.visibility = "visible";
  
  // Start polling for event state changes
  startPolling();
}

// Start polling for event state changes
function startPolling() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
  }
  
  pollingIntervalId = setInterval(async () => {
    if (!eventInformation || !eventInformation.eventId) return;
    
    try {
      const response = await fetch(`/api/events/${eventInformation.eventId}/state`);
      if (!response.ok) {
        console.error('Polling failed:', await response.text());
        return;
      }
      
      const stateData = await response.json();
      
      // Check if start status has changed
      if (previousStartStatus !== stateData.isStart) {
        previousStartStatus = stateData.isStart;
        isEventStart = stateData.isStart;
        if (isEventStart) {
          animateOverlayTransition(startOverlayPanel, false);
          playSound();
        } else {
          animateOverlayTransition(startOverlayPanel, true);
          backgroundAudio.pause();
        }
      }
      
      // Check if lamp count has changed
      if (previousLightCount !== stateData.currentLight) {
        previousLightCount = stateData.currentLight;
        setEventLampLights(stateData.currentLight);
      }
      
      // Check if guest index has changed
      if (previousGuestIndex !== stateData.currentGuest) {
        previousGuestIndex = stateData.currentGuest;
        updateGuestUI(stateData.currentGuest);
      }
      
    } catch (error) {
      console.error('Error during polling:', error);
    }
  }, POLLING_INTERVAL);
}

// Stop polling when navigating away from event section
function stopPolling() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
  
  // If sound is playing, stop it
  if (backgroundAudio) {
    backgroundAudio.pause();
  }
}

function toggleSound() {
  soundOn = !soundOn;
  soundToggleInHeader.classList.toggle("pressed");
  soundToggleInStart.classList.toggle("pressed");
  playSound();
}

function setEventLampLights(lightCount) {
  eventLampPicImg.src = `assets/OilLamp_${lightCount}.gif`;
}

function playSound() {
  if (soundOn && isEventStart) {
    backgroundAudio.loop = true;
    backgroundAudio.play().catch(error => console.error("Error playing sound:", error));
  } else {
    backgroundAudio.pause();
  }
}

// Update guest UI only if there are guests
function updateGuestUI(index) {
  if (eventInformation.guestsInfo.length === 0) {
    return; // no update needed
  }
  if (index < eventInformation.guestsInfo.length) {
    guestPicImg.src = eventInformation.guestsInfo[index].image_url;
    guestTitleSpan.innerText = eventInformation.guestsInfo[index].title;
    guestNameSpan.innerText = eventInformation.guestsInfo[index].name;
    guestIndex = index;
  } else {
    guestPicImg.src = "assets/default_guest_pic.svg";
    guestTitleSpan.innerText = "";
    guestNameSpan.innerText = "No more guests";
  }
}

// Action button handlers call the new API endpoint
lightBtn.addEventListener("click", async function() {
  setButtonLoading(lightBtn, true);
  try {
    const response = await fetch(`/api/events/${eventInformation.eventId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "light" })
    });
    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error);
      return;
    }
    const data = await response.json();
    setEventLampLights(data.current_light);
    updateGuestUI(data.current_guest);
    previousLightCount = data.current_light;
    previousGuestIndex = data.current_guest;
  } catch (err) {
    console.error(err);
  } finally {
    setButtonLoading(lightBtn, false);
  }
});

skipBtn.addEventListener("click", async function() {
  setButtonLoading(skipBtn, true);
  try {
    const response = await fetch(`/api/events/${eventInformation.eventId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "skip" })
    });
    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error);
      return;
    }
    const data = await response.json();
    // Skip does not change the lamp image
    updateGuestUI(data.current_guest);
    previousGuestIndex = data.current_guest;
  } catch (err) {
    console.error(err);
  } finally {
    setButtonLoading(skipBtn, false);
  }
});

backBtn.addEventListener("click", async function() {
  setButtonLoading(backBtn, true);
  try {
    const response = await fetch(`/api/events/${eventInformation.eventId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "back" })
    });
    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error);
      return;
    }
    const data = await response.json();
    setEventLampLights(data.current_light);
    updateGuestUI(data.current_guest);
    previousLightCount = data.current_light;
    previousGuestIndex = data.current_guest;
  } catch (err) {
    console.error(err);
  } finally {
    setButtonLoading(backBtn, false);
  }
});

startBtn.addEventListener("click", async function() {
  setButtonLoading(startBtn, true);
  try {
    // Update isStart status in the database
    const response = await fetch(`/api/events/${eventInformation.eventId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStart: true })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.error);
      return;
    }
    
    // Update local state
    setEventLampLights(0);
    animateOverlayTransition(startOverlayPanel, false);
    isEventStart = true;
    previousStartStatus = true;
    playSound();
    
  } catch (err) {
    console.error('Error starting event:', err);
  } finally {
    setButtonLoading(startBtn, false);
  }
});

soundToggleInHeader.addEventListener("click", toggleSound);
soundToggleInStart.addEventListener("click", toggleSound);

// Clean up resources when the page is unloaded
window.addEventListener('beforeunload', function() {
  stopPolling();
});