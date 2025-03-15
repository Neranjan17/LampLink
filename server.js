const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to SQLite database
const db = new sqlite3.Database('./database/events.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create events table if it doesn't exist - added UNIQUE constraint to host_password
    db.run(`CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY,
      top_heading TEXT NOT NULL,
      bottom_heading TEXT NOT NULL,
      current_light INTEGER NOT NULL DEFAULT 0,
      sound_url TEXT NOT NULL,
      host_password TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating events table:', err.message);
      } else {
        console.log('Events table is ready.');
        
        // Create guests table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS guests (
          guest_id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          light_status BOOLEAN NOT NULL DEFAULT 0,
          image_url TEXT NOT NULL,
          title TEXT NOT NULL,
          name TEXT NOT NULL,
          FOREIGN KEY (event_id) REFERENCES events (event_id)
        )`, (err) => {
          if (err) {
            console.error('Error creating guests table:', err.message);
          } else {
            console.log('Guests table is ready.');
          }
        });
      }
    });
  }
});

function isEventIdAlreadyExists(eventId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM events WHERE event_id = ?', [eventId], (err, row) => {
      if (err) {
        console.error('Error checking event ID:', err.message);
        reject(err);
      } else {
        // If row exists, the event ID exists
        resolve(!!row);
      }
    });
  });
}

function isPasswordAlreadyExists(password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM events WHERE host_password = ?', [password], (err, row) => {
      if (err) {
        console.error('Error checking password:', err.message);
        reject(err);
      } else {
        // If row exists, the password already exists
        resolve(!!row);
      }
    });
  });
}

function addEvent(eventId, firstHeader, secondHeader, password, soundUrl) {
  return new Promise((resolve, reject) => {
    // First check if the password is already in use
    isPasswordAlreadyExists(password)
      .then(exists => {
        if (exists) {
          return reject(new Error('Password already in use. Please choose a different password.'));
        }
        
        // Validate that soundUrl is provided since it's now NOT NULL
        if (!soundUrl) {
          return reject(new Error('Sound URL is required'));
        }
        
        const sql = `INSERT INTO events (event_id, top_heading, bottom_heading, host_password, sound_url, current_light) 
                    VALUES (?, ?, ?, ?, ?, 0)`;
        
        db.run(sql, [eventId, firstHeader, secondHeader, password, soundUrl], function(err) {
          if (err) {
            // Check if the error is related to the UNIQUE constraint
            if (err.message.includes('UNIQUE constraint failed: events.host_password')) {
              console.error('Error: Password already in use');
              reject(new Error('Password already in use. Please choose a different password.'));
            } else {
              console.error('Error creating event:', err.message);
              reject(err);
            }
          } else {
            console.log(`Event created with ID: ${eventId}`);
            resolve({ event_id: eventId });
          }
        });
      })
      .catch(err => {
        reject(err);
      });
  });
}

// Method to add a guest to an existing event
function addGuest(eventId, guestName, guestTitle, imageUrl) {
  return new Promise((resolve, reject) => {
    // Validate that guestTitle and imageUrl are provided since they're now NOT NULL
    if (!guestTitle) {
      return reject(new Error('Guest title is required'));
    }
    
    if (!imageUrl) {
      return reject(new Error('Image URL is required'));
    }
    
    const sql = `INSERT INTO guests (event_id, name, title, image_url) 
                VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [eventId, guestName, guestTitle, imageUrl], function(err) {
      if (err) {
        console.error('Error adding guest:', err.message);
        reject(err);
      } else {
        console.log(`Guest added with ID: ${this.lastID} to event: ${eventId}`);
        resolve({ guest_id: this.lastID, event_id: eventId });
      }
    });
  });
}






function getEventInfo(inputValue) {
  return new Promise((resolve, reject) => {
    try {
      // Validate input
      if (!inputValue || typeof inputValue !== 'string') {
        return reject(new Error('Invalid input: inputValue must be a non-empty string'));
      }

      let eventId;
      let isHost;
      let query;
      let params;

      // Determine if input is an event ID (8 characters) or host password (9 characters)
      if (inputValue.length === 8) {
        // Input is an event ID
        eventId = inputValue;
        isHost = false;
        query = `
          SELECT e.event_id, e.top_heading, e.bottom_heading, e.sound_url
          FROM events e
          WHERE e.event_id = ?`;
        params = [eventId];
      } else if (inputValue.length === 9) {
        // Input is a host password
        isHost = true;
        query = `
          SELECT e.event_id, e.top_heading, e.bottom_heading, e.sound_url
          FROM events e
          WHERE e.host_password = ?`;
        params = [inputValue];
      } else {
        return reject(new Error('Invalid input: inputValue must be either 8 or 9 characters'));
      }

      // Execute the query to get event information
      db.get(query, params, (err, eventRow) => {
        if (err) {
          console.error('Database error:', err.message);
          return reject(new Error(`Database error: ${err.message}`));
        }

        if (!eventRow) {
          return reject(new Error('Event not found'));
        }

        // If input was a host password, get the event ID from the returned row
        if (isHost) {
          eventId = eventRow.event_id.toString();
        }

        // Now that we have the event ID, get guest information
        const guestQuery = `
          SELECT title, name, image_url
          FROM guests
          WHERE event_id = ?`;

        db.all(guestQuery, [eventRow.event_id], (err, guestRows) => {
          if (err) {
            console.error('Database error when fetching guests:', err.message);
            return reject(new Error(`Database error: ${err.message}`));
          }

          // Prepare the result object
          const result = {
            eventId: eventId,
            isHost: isHost,
            topHeader: eventRow.top_heading,
            bottomHeader: eventRow.bottom_heading,
            soundUrl: eventRow.sound_url,
            guestsInfo: guestRows || []
          };

          resolve(result);
        });
      });
    } catch (error) {
      console.error('Error in getEventInfo:', error);
      reject(error);
    }
  });
}

// API endpoint to get event information
app.get('/api/event-info/:inputValue', async (req, res) => {
  try {
    const inputValue = req.params.inputValue;
    
    const eventInfo = await getEventInfo(inputValue);
    res.json(eventInfo);
  } catch (err) {
    console.error('Error in event-info endpoint:', err);
    res.status(404).json({ error: err.message });
  }
});




// API endpoint to create a new event
app.post('/api/events', async (req, res) => {
  try {
    const { eventId, firstHeader, secondHeader, password, soundUrl } = req.body;
    
    // Validate required fields
    if (!eventId || !firstHeader || !secondHeader || !password || !soundUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['eventId', 'firstHeader', 'secondHeader', 'password', 'soundUrl'] 
      });
    }
    
    // Check if password is already in use
    const passwordExists = await isPasswordAlreadyExists(password);
    if (passwordExists) {
      return res.status(409).json({ error: 'Password already in use. Please choose a different password.' });
    }
    
    // Create the event
    const result = await addEvent(eventId, firstHeader, secondHeader, password, soundUrl);
    
    res.status(201).json({ 
      success: true, 
      message: 'Event created successfully', 
      event_id: result.event_id 
    });
  } catch (err) {
    console.error('Error in create event endpoint:', err);
    
    // Check if the error is related to the UNIQUE constraint
    if (err.message.includes('Password already in use')) {
      return res.status(409).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// API endpoint to add a guest to an event
app.post('/api/events/:eventId/guests', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { guestName, guestTitle, imageUrl } = req.body;
    
    // Validate required fields - updated to include guestTitle and imageUrl
    if (!eventId || !guestName || !guestTitle || !imageUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['eventId', 'guestName', 'guestTitle', 'imageUrl'] 
      });
    }
    
    // Check if the event exists
    const eventExists = await isEventIdAlreadyExists(eventId);
    if (!eventExists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Add the guest
    const result = await addGuest(eventId, guestName, guestTitle, imageUrl);
    
    res.status(201).json({ 
      success: true, 
      message: 'Guest added successfully', 
      guest_id: result.guest_id,
      event_id: result.event_id 
    });
  } catch (err) {
    console.error('Error in add guest endpoint:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

app.get('/check-password/:password', async (req, res) => {
  try {
    const password = req.params.password;
    
    const exists = await isPasswordAlreadyExists(password);
    return res.json({ exists });
  } catch (err) {
    console.error('Error in check-password endpoint:', err);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// API endpoint
app.get('/check-event/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }
    
    const exists = await isEventIdAlreadyExists(eventId);
    return res.json({ exists });
  } catch (err) {
    console.error('Error in check-event endpoint:', err);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle application shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});