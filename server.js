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
    
    // Create events table with an additional "is_start" column
    db.run(`CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY,
      top_heading TEXT NOT NULL,
      bottom_heading TEXT NOT NULL,
      current_light INTEGER NOT NULL DEFAULT 0,
      current_guest INTEGER NOT NULL DEFAULT 0,
      sound_url TEXT NOT NULL,
      host_password TEXT NOT NULL UNIQUE,
      is_start BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating events table:', err.message);
      } else {
        console.log('Events table is ready.');
        
        // Create guests table with "order_num" column to maintain order
        db.run(`CREATE TABLE IF NOT EXISTS guests (
          guest_id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          order_num INTEGER NOT NULL,
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

// Check if an event ID exists
function isEventIdAlreadyExists(eventId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM events WHERE event_id = ?', [eventId], (err, row) => {
      if (err) {
        console.error('Error checking event ID:', err.message);
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

// Check if a host password exists
function isPasswordAlreadyExists(password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM events WHERE host_password = ?', [password], (err, row) => {
      if (err) {
        console.error('Error checking password:', err.message);
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

// Create a new event
function addEvent(eventId, firstHeader, secondHeader, password, soundUrl) {
  return new Promise((resolve, reject) => {
    isPasswordAlreadyExists(password)
      .then(exists => {
        if (exists) {
          return reject(new Error('Password already in use. Please choose a different password.'));
        }
        if (!soundUrl) {
          return reject(new Error('Sound URL is required'));
        }
        const sql = `INSERT INTO events (event_id, top_heading, bottom_heading, host_password, sound_url, current_light, current_guest, is_start) 
                    VALUES (?, ?, ?, ?, ?, 0, 0, 0)`;
        db.run(sql, [eventId, firstHeader, secondHeader, password, soundUrl], function(err) {
          if (err) {
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

// Add a guest (calculates order_num based on current count)
function addGuest(eventId, guestName, guestTitle, imageUrl) {
  return new Promise((resolve, reject) => {
    if (!guestTitle) {
      return reject(new Error('Guest title is required'));
    }
    if (!imageUrl) {
      return reject(new Error('Image URL is required'));
    }
    db.get('SELECT COUNT(*) as count FROM guests WHERE event_id = ?', [eventId], (err, row) => {
      if (err) {
        console.error('Error counting guests:', err.message);
        return reject(err);
      }
      const orderNum = row.count + 1;
      const sql = `INSERT INTO guests (event_id, order_num, name, title, image_url) 
                  VALUES (?, ?, ?, ?, ?)`;
      db.run(sql, [eventId, orderNum, guestName, guestTitle, imageUrl], function(err) {
        if (err) {
          console.error('Error adding guest:', err.message);
          reject(err);
        } else {
          console.log(`Guest added with ID: ${this.lastID} to event: ${eventId}`);
          resolve({ guest_id: this.lastID, event_id: eventId });
        }
      });
    });
  });
}

// Retrieve event info (includes current_light, current_guest, is_start, and guests ordered by order_num)
function getEventInfo(inputValue) {
  return new Promise((resolve, reject) => {
    try {
      if (!inputValue || typeof inputValue !== 'string') {
        return reject(new Error('Invalid input: inputValue must be a non-empty string'));
      }
      let eventId;
      let isHost;
      let query;
      let params;
      if (inputValue.length === 8) {
        eventId = inputValue;
        isHost = false;
        query = `
          SELECT event_id, top_heading, bottom_heading, sound_url, current_light, current_guest, is_start
          FROM events
          WHERE event_id = ?`;
        params = [eventId];
      } else if (inputValue.length === 9) {
        isHost = true;
        query = `
          SELECT event_id, top_heading, bottom_heading, sound_url, current_light, current_guest, is_start
          FROM events
          WHERE host_password = ?`;
        params = [inputValue];
      } else {
        return reject(new Error('Invalid input: inputValue must be either 8 or 9 characters'));
      }
      db.get(query, params, (err, eventRow) => {
        if (err) {
          console.error('Database error:', err.message);
          return reject(new Error(`Database error: ${err.message}`));
        }
        if (!eventRow) {
          return reject(new Error('Event not found'));
        }
        if (isHost) {
          eventId = eventRow.event_id.toString();
        }
        const guestQuery = `
          SELECT title, name, image_url
          FROM guests
          WHERE event_id = ?
          ORDER BY order_num ASC`;
        db.all(guestQuery, [eventRow.event_id], (err, guestRows) => {
          if (err) {
            console.error('Database error when fetching guests:', err.message);
            return reject(new Error(`Database error: ${err.message}`));
          }
          const result = {
            eventId: eventId,
            isHost: isHost,
            topHeader: eventRow.top_heading,
            bottomHeader: eventRow.bottom_heading,
            soundUrl: eventRow.sound_url,
            currentLight: eventRow.current_light,
            currentGuest: eventRow.current_guest,
            isStart: eventRow.is_start === 1,
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

// Get the event state (for polling)
function getEventState(eventId) {
  return new Promise((resolve, reject) => {
    if (!eventId) {
      return reject(new Error('Event ID is required'));
    }
    const query = 'SELECT current_light, current_guest, is_start FROM events WHERE event_id = ?';
    db.get(query, [eventId], (err, row) => {
      if (err) {
        console.error('Error getting event state:', err.message);
        return reject(err);
      }
      if (!row) {
        return reject(new Error('Event not found'));
      }
      resolve({
        currentLight: row.current_light,
        currentGuest: row.current_guest,
        isStart: row.is_start === 1
      });
    });
  });
}

function getCurrentLightCount(eventId) {
  return new Promise((resolve, reject) => {
    if (!eventId) {
      return reject(new Error('Event ID is required'));
    }
    const query = 'SELECT current_light FROM events WHERE event_id = ?';
    db.get(query, [eventId], (err, row) => {
      if (err) {
        console.error('Error getting current light count:', err.message);
        return reject(err);
      }
      if (!row) {
        return reject(new Error('Event not found'));
      }
      resolve(row.current_light);
    });
  });
}

function setCurrentLightCount(eventId, count) {
  return new Promise((resolve, reject) => {
    if (!eventId) {
      return reject(new Error('Event ID is required'));
    }
    if (typeof count !== 'number' || isNaN(count) || !Number.isInteger(count)) {
      return reject(new Error('Count must be an integer'));
    }
    const query = 'UPDATE events SET current_light = ? WHERE event_id = ?';
    db.run(query, [count, eventId], function(err) {
      if (err) {
        console.error('Error updating current light count:', err.message);
        return reject(err);
      }
      if (this.changes === 0) {
        return reject(new Error('Event not found'));
      }
      resolve({ 
        eventId: eventId, 
        newLightCount: count, 
        updated: true 
      });
    });
  });
}

// Set event start status
function setEventStartStatus(eventId, isStart) {
  return new Promise((resolve, reject) => {
    if (!eventId) {
      return reject(new Error('Event ID is required'));
    }
    const startValue = isStart ? 1 : 0;
    const query = 'UPDATE events SET is_start = ? WHERE event_id = ?';
    db.run(query, [startValue, eventId], function(err) {
      if (err) {
        console.error('Error updating start status:', err.message);
        return reject(err);
      }
      if (this.changes === 0) {
        return reject(new Error('Event not found'));
      }
      resolve({
        eventId: eventId,
        isStart: isStart,
        updated: true
      });
    });
  });
}

// New endpoint to handle event start
app.post('/api/events/:eventId/start', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { isStart } = req.body;
    
    if (isStart === undefined) {
      return res.status(400).json({ error: 'isStart value is required' });
    }
    
    const result = await setEventStartStatus(eventId, isStart);
    res.json(result);
  } catch (err) {
    console.error('Error in event start endpoint:', err);
    res.status(500).json({ error: err.message });
  }
});

// New endpoint to poll event state
app.get('/api/events/:eventId/state', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const state = await getEventState(eventId);
    res.json(state);
  } catch (err) {
    console.error('Error in get event state endpoint:', err);
    res.status(404).json({ error: err.message });
  }
});

// New endpoint to handle guest actions: light, skip, and back
app.post('/api/events/:eventId/action', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const action = req.body.action;
    if (!action || !['light', 'skip', 'back'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Get current event state
    db.get('SELECT current_light, current_guest FROM events WHERE event_id = ?', [eventId], (err, eventRow) => {
      if (err) {
        console.error('Error retrieving event:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!eventRow) {
        return res.status(404).json({ error: 'Event not found' });
      }
      let { current_light, current_guest } = eventRow;
      
      // Count total guests for this event
      db.get('SELECT COUNT(*) as total FROM guests WHERE event_id = ?', [eventId], (err, row) => {
        if (err) {
          console.error('Error counting guests:', err.message);
          return res.status(500).json({ error: err.message });
        }
        const totalGuests = row.total;
        
        if (totalGuests === 0) {
          // No guests have been added
          if (action === 'light') {
            current_light++;
          } else if (action === 'back') {
            if (current_light > 0) {
              current_light--;
            } else {
              return res.status(400).json({ error: 'Cannot go back, lamp is off.' });
            }
          } else if (action === 'skip') {
            return res.status(400).json({ error: 'No guests to skip.' });
          }
        } else {
          // Existing logic when there are guests
          if (action === 'light') {
            if (current_guest < totalGuests) {
              current_light++;
              current_guest++;
            } else {
              return res.status(400).json({ error: 'No more guests available to light the lamp.' });
            }
          } else if (action === 'skip') {
            if (current_guest < totalGuests) {
              current_guest++;
            } else {
              return res.status(400).json({ error: 'Cannot skip, already at the last guest.' });
            }
          } else if (action === 'back') {
            if (current_guest > 0) {
              if (current_light === current_guest) {
                current_light--;
              }
              current_guest--;
            } else {
              return res.status(400).json({ error: 'Cannot go back, already at the first guest.' });
            }
          }
        }
        
        // Update the event with the new state
        db.run('UPDATE events SET current_light = ?, current_guest = ? WHERE event_id = ?', 
          [current_light, current_guest, eventId], function(err) {
            if (err) {
              console.error('Error updating event state:', err.message);
              return res.status(500).json({ error: err.message });
            }
            return res.json({ eventId, current_light, current_guest });
        });
      });
    });
    
  } catch (err) {
    console.error('Error in guest action endpoint:', err);
    res.status(500).json({ error: err.message });
  }
});

// Existing API endpoints
app.get('/api/events/:eventId/light-count', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const count = await getCurrentLightCount(eventId);
    res.json({ eventId, count });
  } catch (err) {
    console.error('Error in get light count endpoint:', err);
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/events/:eventId/light-count', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { count } = req.body;
    if (count === undefined) {
      return res.status(400).json({ error: 'Count is required' });
    }
    const result = await setCurrentLightCount(eventId, parseInt(count));
    res.json(result);
  } catch (err) {
    console.error('Error in set light count endpoint:', err);
    res.status(500).json({ error: err.message });
  }
});

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

app.post('/api/events', async (req, res) => {
  try {
    const { eventId, firstHeader, secondHeader, password, soundUrl } = req.body;
    if (!eventId || !firstHeader || !secondHeader || !password || !soundUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['eventId', 'firstHeader', 'secondHeader', 'password', 'soundUrl'] 
      });
    }
    const passwordExists = await isPasswordAlreadyExists(password);
    if (passwordExists) {
      return res.status(409).json({ error: 'Password already in use. Please choose a different password.' });
    }
    const result = await addEvent(eventId, firstHeader, secondHeader, password, soundUrl);
    res.status(201).json({ 
      success: true, 
      message: 'Event created successfully', 
      event_id: result.event_id 
    });
  } catch (err) {
    console.error('Error in create event endpoint:', err);
    if (err.message.includes('Password already in use')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

app.post('/api/events/:eventId/guests', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { guestName, guestTitle, imageUrl } = req.body;
    if (!eventId || !guestName || !guestTitle || !imageUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['eventId', 'guestName', 'guestTitle', 'imageUrl'] 
      });
    }
    const eventExists = await isEventIdAlreadyExists(eventId);
    if (!eventExists) {
      return res.status(404).json({ error: 'Event not found' });
    }
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

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});