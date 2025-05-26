let token = null;
let currentUser = null;
let calendarYear = (new Date()).getFullYear();
let calendarMonth = (new Date()).getMonth();

/* ========= AUTH & LOGIN ========= */
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('https://exodus-wpuc.onrender.com/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.ok) {
    const data = await res.json();
    token = data.token;
    currentUser = { role: data.role, username: username };
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-content').style.display = '';
    afterLoginView();
    loadCalendar();
    loadMessages();
    if (currentUser.role === 'admin') {
      loadAdminQuestions();
    } else {
      loadMyMessages();
    }
  } else {
    document.getElementById('login-error').innerText = 'Invalid credentials!';
  }
}

function logout() {
  token = null;
  currentUser = null;
  document.getElementById('login-container').style.display = '';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('messages').innerHTML = '';
  document.getElementById('calendar').innerHTML = '';
}

/* ========= ROLE-BASED UI ========= */
function afterLoginView() {
  if (currentUser.role === 'admin') {
    document.getElementById('calendar-controls').style.display = '';
    document.getElementById('message-controls').style.display = '';
    document.getElementById('ask-admins-section').style.display = 'none';
    document.getElementById('user-questions-section').style.display = 'none';
    document.getElementById('admin-questions-section').style.display = '';
  } else {
    document.getElementById('calendar-controls').style.display = 'none';
    document.getElementById('message-controls').style.display = 'none';
    document.getElementById('ask-admins-section').style.display = '';
    document.getElementById('user-questions-section').style.display = '';
    document.getElementById('admin-questions-section').style.display = 'none';
  }
}

/* ========= CALENDAR ========= */
async function loadCalendar(year = calendarYear, month = calendarMonth) {
  calendarYear = year;
  calendarMonth = month;
  const res = await fetch('https://exodus-wpuc.onrender.com/api/events');
  if (!res.ok) return;
  const events = await res.json();
  renderCalendar(events, year, month);
}

function renderCalendar(events, year, month) {
  calendarYear = year;
  calendarMonth = month;
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const calendar = document.getElementById('calendar');
  const calendarTitle = document.getElementById('calendar-title');
  calendar.innerHTML = '';
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  if (calendarTitle) calendarTitle.textContent = `${monthNames[month]} ${year}`;
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const el = document.createElement('div');
    el.innerHTML = `<strong>${d}</strong>`;
    el.style.textAlign = 'center';
    calendar.appendChild(el);
  });
  for (let i = 0; i < firstDay.getDay(); i++) calendar.appendChild(document.createElement('div'));
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    dayEl.innerHTML = `<div><strong>${d}</strong></div>`;
    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayEl.classList.add('today');
    }
    events.filter(ev => ev.date === dateStr).forEach(ev => {
      const eventDiv = document.createElement('div');
      eventDiv.className = 'event';
      eventDiv.style.display = "inline-block";
      eventDiv.style.marginRight = "4px";
      if (ev.desc && ev.desc.trim() !== "") {
        eventDiv.style.cursor = "pointer";
        eventDiv.addEventListener('click', function(e) {
          e.stopPropagation();
          showEventPopup(ev.title, ev.desc);
        });
        eventDiv.innerHTML = `${ev.title}`;
      } else {
        eventDiv.textContent = ev.title;
      }
      if (currentUser && currentUser.role === 'admin') {
        const delBtn = document.createElement('button');
        delBtn.className = 'event-delete-btn';
        delBtn.title = 'Delete event';
        delBtn.innerHTML = '✖';
        delBtn.onclick = function(e) {
          e.stopPropagation();
          if (confirm('Delete this event?')) {
            deleteEvent(ev._id);
          }
        };
        eventDiv.appendChild(delBtn);
      }
      dayEl.appendChild(eventDiv);
    });
    calendar.appendChild(dayEl);
  }
}
function showEventPopup(title, desc) {
  const popup = document.getElementById('event-popup');
  popup.className = 'event-popup';
  popup.innerHTML = `
    <button class="event-popup-close" onclick="closeEventPopup()">&times;</button>
    <span class="event-popup-title">${title}</span>
    <div class="event-popup-desc">${desc.replace(/</g, "&lt;")}</div>
  `;
  popup.style.display = "block";
}
function closeEventPopup() {
  document.getElementById('event-popup').style.display = "none";
}
window.closeEventPopup = closeEventPopup;

async function deleteEvent(eventId) {
  const response = await fetch(`https://exodus-wpuc.onrender.com/api/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  loadCalendar();
}
async function addEvent() {
  if (!token) return;
  const date = document.getElementById('event-date').value;
  const title = document.getElementById('event-title').value;
  const time = document.getElementById('event-time').value;
  const location = document.getElementById('event-place').value;
  const extra = document.getElementById('event-extrainfo').value;
  let fullDesc = '';
  if (time) fullDesc += `🕒 Time: ${time}\n`;
  if (location) fullDesc += `📍 Location: ${location}\n`;
  if (extra) fullDesc += `📝 Extra: ${extra}`;
  const event = { date, title, desc: fullDesc };
  await fetch('http://localhost:3000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(event)
  });
  document.getElementById('event-date').value = '';
  document.getElementById('event-title').value = '';
  document.getElementById('event-time').value = '';
  document.getElementById('event-place').value = '';
  document.getElementById('event-extrainfo').value = '';
  loadCalendar();
}
function prevMonth() {
  if (calendarMonth === 0) { calendarYear -= 1; calendarMonth = 11; }
  else { calendarMonth -= 1; }
  loadCalendar(calendarYear, calendarMonth);
}
function nextMonth() {
  if (calendarMonth === 11) { calendarYear += 1; calendarMonth = 0; }
  else { calendarMonth += 1; }
  loadCalendar(calendarYear, calendarMonth);
}

/* ========= UPDATES & PUBLIC MESSAGES ========= */
async function loadMessages() {
  const res = await fetch('https://exodus-wpuc.onrender.com/api/messages');
  if (!res.ok) return;
  const messages = await res.json();
  const msgDiv = document.getElementById('messages');
  msgDiv.innerHTML = '';
  messages.forEach(m => {
    const msgBox = document.createElement('div');
    msgBox.className = 'message-box';
    msgBox.innerHTML = `
      <div>
        <span class="message-author">${m.user}</span>
        <span class="message-date">${(new Date(m.createdAt)).toLocaleString()}</span>
      </div>
      <div class="message-content">${m.text.replace(/</g, "&lt;")}</div>
    `;
    msgDiv.appendChild(msgBox);
  });
}
async function postMessage() {
  if (!token) return;
  const text = document.getElementById('new-message').value.trim();
  if (!text) return;
  await fetch('https://exodus-wpuc.onrender.com/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text })
  });
  document.getElementById('new-message').value = '';
  loadMessages();
}

/* ========= USER: CONTACT ADMINS + HISTORY ========= */
async function askAdmins() {
  const textarea = document.getElementById('ask-admins-input');
  const message = textarea.value.trim();
  if (!message) return;
  await fetch('https://exodus-wpuc.onrender.com/api/ask-admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: message })
  });
  textarea.value = '';
  document.getElementById('ask-admins-success').innerText = "Your message was sent!";
  setTimeout(() => { document.getElementById('ask-admins-success').innerText = ""; }, 3000);
  loadMyMessages(); // Refresh own history
}
async function loadMyMessages() {
  const res = await fetch('https://exodus-wpuc.onrender.com/api/my-questions', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const questions = await res.json();
  const list = document.getElementById('my-questions-list');
  if (!list) return;
  list.innerHTML = '';
  questions.forEach(q => {
    const div = document.createElement('div');
    div.className = 'my-question-box';
    div.innerHTML = `
      <div><b>You asked on ${new Date(q.createdAt).toLocaleString()}:</b></div>
      <div style="margin:0.5em 0;white-space:pre-line">${q.text.replace(/</g, '&lt;')}</div>
      ${q.reply 
        ? `<div style="color:#278d3a"><b>Admin Reply:</b> ${q.reply} <span style="color:#999;font-size:0.9em">(${q.repliedAt ? new Date(q.repliedAt).toLocaleString() : ''})</span></div>`
        : '<div style="color:#888">(No reply yet)</div>'}
      <hr style="margin-top:1em">
    `;
    list.appendChild(div);
  });
}
function toggleMyMessages() {
  const list = document.getElementById('my-questions-list');
  list.style.display = list.style.display === 'none' ? 'block' : 'none';
}

/* ========= ADMIN: SEE/REPLY/DELETE USER MESSAGES ========= */
async function loadAdminQuestions() {
  const res = await fetch('https://exodus-wpuc.onrender.com/api/admin-questions', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const questions = await res.json();
  const list = document.getElementById('admin-questions-list');
  list.innerHTML = '';
  questions.forEach(q => {
    const div = document.createElement('div');
    div.className = 'admin-question-box';
    div.innerHTML = `
      <div>
        <b>${q.from}</b> — <span style="color:#888">${new Date(q.createdAt).toLocaleString()}</span>
        <button onclick="deleteAdminMsg('${q._id}')" style="float:right; color:#dc3545">Delete</button>
      </div>
      <div style="margin:0.5em 0;white-space:pre-line">${q.text.replace(/</g, '&lt;')}</div>
      <div>
        ${q.reply
          ? `<div style="color:#278d3a"><b>Admin Reply:</b> ${q.reply} <span style="color:#999;font-size:0.92em">${q.repliedAt?('('+new Date(q.repliedAt).toLocaleString()+')'):''}</span></div>`
          : `<textarea class="admin-reply" placeholder="Type reply..."></textarea>
             <button onclick="replyAdminMsg('${q._id}', this)">Reply</button>`
        }
      </div>
      <hr>
    `;
    list.appendChild(div);
  });
}
async function replyAdminMsg(msgId, btn) {
  const reply = btn.parentNode.querySelector('textarea').value.trim();
  if (!reply) return;
  btn.disabled = true;
  await fetch(`https://exodus-wpuc.onrender.com/api/admin-questions/${msgId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reply })
  });
  loadAdminQuestions();
}
async function deleteAdminMsg(msgId) {
  if (!confirm('Delete this entire chat?')) return;
  await fetch(`https://exodus-wpuc.onrender.com/api/admin-questions/${msgId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  loadAdminQuestions();
}
