const webLogo = document.getElementById("webLogo");

// init login section eliments
const loginSection = document.getElementById("loginSection");
const loginIdInput = document.getElementById("loginIdInput");
const signinBtn = document.getElementById("signinBtn");
const newEventBtn = document.getElementById("newEventBtn");

// init create section eliments
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

// init event section eliments
const eventSection = document.getElementById("eventSection");
const bannerTitleTop = document.getElementById("bannerTitleTop");
const bannerTitleBottom = document.getElementById("bannerTitleBottom");
const soundToggleInHeader = document.getElementById("soundToggleInHeader");
const soundToggleInStart = document.getElementById("soundToggleInStart");
const startOverlayPanel = document.getElementById("startOverlayPanel");
const startBtn = document.getElementById("startBtn");



loadWeb();

function loadWeb() {
  loginSection.style.display = "flex";
  createSection.style.display = "none";
  eventSection.style.display = "none";
  soundToggleInHeader.style.visibility = "hidden";
}

webLogo.addEventListener("click", loadWeb);








// Login section
function navigatLoginSection() {

  loginSection.scrollIntoView({
    behavior: 'smooth'
  });

  loginSection.style.display = "flex";
  createSection.style.display = "none";
  eventSection.style.display = "none";
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
signinBtn.addEventListener("click", async function() {
  let inputId = loginIdInput.value.trim();

  // Check if it's an EventId (8 digits)
  if (inputId.length == 8) {
    try {
      const response = await fetch(`/check-event/${inputId}`);
      const data = await response.json();
      
      if(data.exists) {
        console.log("Valid Event Id");
        
        const eventInfo = await fetchEventInfo(inputId);
        navigatEventSection(eventInfo);
        
      } else {
        alert("Invalid Event ID !");
      }
    } catch (error) {
      console.error("Error checking event ID:", error);
      alert("Error connecting to server");
    }
  }
  // Check if it's a Password (9 characters)
  else if (inputId.length == 9) {
    try {
      const response = await fetch(`/check-password/${encodeURIComponent(inputId)}`);
      const data = await response.json();
      
      if(data.exists) {
        console.log("Valid Password");
        
        const eventInfo = await fetchEventInfo(inputId);
        navigatEventSection(eventInfo);
        
      } else {
        alert("Invalid Event Password !");
      }
    } catch (error) {
      console.error("Error checking password:", error);
      alert("Error connecting to server");
    }
  }
  else {
    alert("Invalid Id or Password !");
  }
});

newEventBtn.addEventListener("click", navigatCreateSection);







//Create section
let defaultfirstHeader = "Welcome to the";
let defaultSecondHeader = "Lamp Lighting Feature";
let defaultGuestPicLink = "assets/default_guest_pic.svg";
let defaultSoundLink = "assets/background_sound.mp3";
let defaultGuestTitle = "m/s";
let guestsInfo = [];
let eventID = 0; 


async function navigatCreateSection() {
  //reset section
  guestsInfo.length = 0;
  guestCountViewText.innerText = "Add a Guest"
  firstHeaderInput.value = "";
  secondHeaderInput.value = "";
  passwordInput.value = "";
  soundLinkInput.value = "";
  guestTitleSelect.value = "m/s";
  guestNameInput.value = "";
  guestImgLinkInput.value = "";

  //set Id 
  const eventID = await generateEventID();
  eventIdViewText.innerText = "Your Event ID is : " + eventID;

  // scroll to section
  createSection.scrollIntoView({
    behavior: 'smooth'
  });
  loginSection.style.display = "none";
  createSection.style.display = "flex";
  eventSection.style.display = "none";
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
        console.log("Genereted Id is alredy exsist !")
      }

    } catch (error) {
      console.error("Error checking event ID:", error);
    }
  }

  console.log("unique Id found")
  return eventID;
}
function createNewEvent() {
  // First, create the event
  const eventData = {
    eventId: eventID,
    firstHeader: (firstHeaderInput.value.trim() !== "") ? firstHeaderInput.value.trim() : defaultfirstHeader,
    secondHeader: (secondHeaderInput.value.trim() !== "") ? secondHeaderInput.value.trim() : defaultSecondHeader,
    password: passwordInput.value.trim(),
    soundUrl: (soundLinkInput.value.trim() !== "") ? soundLinkInput.value.trim() : defaultSoundLink
  };

  const password = passwordInput.value.trim();

  if (password !== "" && password.length == 9) {
    
    // Check if password already exists
    fetch(`/check-password/${encodeURIComponent(password)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.exists) {
          // Password doesn't exist, proceed with creating the event
          return fetch('/api/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
          });
        } else {
          alert("Password already exists!");
          throw new Error("Password already exists");
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to create event');
        }
        return response.json();
      })
      .then(data => {
        console.log('Event created successfully:', data);
        
        // After event is created, add all guests
        const addGuestPromises = guestsInfo.map(guest => {
          const guestData = {
            guestName: guest.name,
            guestTitle: guest.title,
            imageUrl: guest.picUrl
          };
          
          return fetch(`/api/events/${eventID}/guests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(guestData)
          });
        });
        
        // Wait for all guest additions to complete
        return Promise.all(addGuestPromises);
      })
      .then(responses => {
        // Check if all guest additions were successful
        const allSuccessful = responses.every(response => response.ok);
        if (!allSuccessful) {
          throw new Error('Some guests could not be added');
        }
        
        console.log('All guests added successfully');
        // Navigate back to login section after everything is done
        navigatLoginSection();
      })
      .catch(error => {
        console.error('Error in event creation process:', error);
        // Only show alert if it's not the password exists error (which already has an alert)
        if (error.message !== "Password already exists") {
          alert('There was an error creating your event. Please try again.');
        }
      });
  } else {
    alert("Password is required with nine characters!");
  }
}

addGuestBtn.addEventListener("click", function() {

  let guestTitle = guestTitleSelect.value.trim();
  let guestName = guestNameInput.value.trim();
  let guestImgLink = (guestImgLinkInput.value.trim() !== "") ? guestImgLinkInput.value : defaultGuestPicLink;

  if(guestTitle !== defaultGuestTitle && guestName !== "") {

    guestsInfo.push({
      title: guestTitle, 
      name: guestName, 
      picUrl: guestImgLink
    });
    guestCountViewText.innerText = "Add a Guest : " + guestsInfo.length + " Added"

    guestTitleSelect.value = defaultGuestTitle;
    guestNameInput.value = "";
    guestImgLinkInput.value = "";
  } else {
    alert("Title and name are required !");
  }
});

createEventBtn.addEventListener("click", createNewEvent);







//Event section
let backgroundAudio;
let soundOn = false;
let isEventStart = false;
let eventInformation;
//eventInfo.guestsInfo[0].name

function navigatEventSection(eventInfo) {

  eventInformation = eventInfo;

  bannerTitleTop.innerText = eventInformation.topHeader;
  bannerTitleBottom.innerText = eventInformation.bottomHeader;

  eventSection.scrollIntoView({
    behavior: 'smooth'
  });
  loginSection.style.display = "none";
  createSection.style.display = "none";
  eventSection.style.display = "flex";
  soundToggleInHeader.style.visibility = "visible";
}
function toggleSound() {
  soundOn = !soundOn;
  soundToggleInHeader.classList.toggle("pressed");
  soundToggleInStart.classList.toggle("pressed");

  palySound();
}
function palySound() {
  if (soundOn && isEventStart) {
    backgroundAudio = new Audio(eventInformation.soundUrl);
    backgroundAudio.loop = true;
    backgroundAudio.play().catch(error => console.error("Error palying sound : ", error));
  } else {
    backgroundAudio.pause();
  }
}
startBtn.addEventListener("click", function() {
  startOverlayPanel.style.display = "none";
  isEventStart = true;
  palySound();
});
soundToggleInHeader.addEventListener("click", toggleSound);
soundToggleInStart.addEventListener("click", toggleSound);










/*
  This is my code structure : project-root/
├── packcage.json
├── packcage-lock.json
├── node_moduels/ 
├── server.js             # My Express server code 
├── database/             # Where My SQLite database is stored
│   └── events.db
└── public/               # Static files served by Express
    ├── index.html
    ├── script.js         # My frontend JavaScript
    └── styles.css

*/
