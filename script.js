// Local Storage မှ Data များခေါ်ယူခြင်း
let workers = JSON.parse(localStorage.getItem('amm_workers')) || [];
let attendance = JSON.parse(localStorage.getItem('amm_attendance')) || {}; 
let alarmsData = JSON.parse(localStorage.getItem('amm_alarms')) || {}; 
let selectedWorkerId = null;

// လပြည့်၊ လကွယ် ရက်စွဲများ (Format: 'YYYY-M-D') - ဥပမာအဖြစ် ၂၀၂၆ ဇွန်လအတွက် ထည့်ထားပါသည်
const moonPhases = {
    '2026-6-14': 'new',   // ဇွန် ၁၄ (လကွယ်)
    '2026-6-29': 'full'   // ဇွန် ၂၉ (လပြည့်)
};

const currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDateKey = `${currentYear}-${currentMonth + 1}-${currentDate.getDate()}`;

// Elements
const calendarGrid = document.getElementById('calendar');
const monthYearText = document.getElementById('monthYear');
const workerList = document.getElementById('workerList');
const workerModal = document.getElementById('workerModal');
const currentDateStr = document.getElementById('currentDateStr');
const workerPanel = document.getElementById('workerPanel');
const handleBar = document.getElementById('handleBar');

// Initialize
document.getElementById('currentDateStr').innerText = currentDate.toDateString();
renderCalendar();
renderWorkers();

// Calendar Render
function renderCalendar() {
    calendarGrid.innerHTML = '';
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    monthYearText.innerText = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Empty spaces for first week
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('day', 'empty');
        calendarGrid.appendChild(emptyDiv);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        const dateKey = `${currentYear}-${currentMonth + 1}-${i}`;

        // လပြည့် / လကွယ် အိုင်ကွန် စစ်ဆေးခြင်း
        let moonIcon = '';
        if (moonPhases[dateKey] === 'full') {
            moonIcon = `<span style="font-size: 14px; margin-right: 4px;" title="လပြည့်">🌕</span>`;
        } else if (moonPhases[dateKey] === 'new') {
            moonIcon = `<span style="font-size: 14px; margin-right: 4px; filter: grayscale(100%);" title="လကွယ်">🌑</span>`;
        }

        // ရက်စွဲ ဂဏန်းကို အကြီးစားဖြင့် ဖော်ပြခြင်း
        dayDiv.innerHTML = `
            <div style="display: flex; justify-content: flex-end; align-items: center; width: 100%; z-index: 1;">
                ${moonIcon}
                <span style="font-size: 18px; font-weight: 900; letter-spacing: -0.5px;">${i}</span>
            </div>
        `;

        // Alarm ရှိ/မရှိ စစ်ဆေးခြင်းနှင့် အချိန်ကျော်ပါက ဖျက်ခြင်း
        if (alarmsData[dateKey]) {
            // အဟောင်းနဲ့ အသစ် format နှစ်ခုလုံး အလုပ်လုပ်စေရန်
            const alarmTime = typeof alarmsData[dateKey] === 'string' ? alarmsData[dateKey] : alarmsData[dateKey].time;
            const [aHour, aMin] = alarmTime.split(':');
            const alarmDateTime = new Date(currentYear, currentMonth, i, parseInt(aHour), parseInt(aMin));
            
            if (new Date() > alarmDateTime) {
                // ယခုအချိန်သည် Alarm အချိန်ထက် ကျော်လွန်သွားပါက ဖျက်မည်
                delete alarmsData[dateKey];
                localStorage.setItem('amm_alarms', JSON.stringify(alarmsData));
            } else {
                // အချိန်မရောက်သေးပါက Alarm စာသားလေး ပြထားမည်
                const alarmBadge = document.createElement('div');
                alarmBadge.className = 'alarm-badge';
                alarmBadge.innerText = 'Alarm';
                dayDiv.appendChild(alarmBadge);
            }
        }

        // Highlight Today
        const realToday = new Date();
        if (i === realToday.getDate() && currentMonth === realToday.getMonth() && currentYear === realToday.getFullYear()) {
            dayDiv.classList.add('today');
        }
        if (dateKey === selectedDateKey) {
            dayDiv.classList.add('selected-day');
        }

        // If a worker is selected, highlight their attendance (Pill style)
        if (selectedWorkerId && attendance[dateKey] && attendance[dateKey][selectedWorkerId]) {
            const worker = workers.find(w => w.id === selectedWorkerId);
            const att = attendance[dateKey][selectedWorkerId];
            if (worker && (att.morning || att.evening)) {
                dayDiv.style.setProperty('--worker-color', worker.color);
                
                const indicatorBox = document.createElement('div');
                indicatorBox.classList.add('indicator-box');

                if (att.morning && att.evening) {
                    // နေ့ပြည့်ဆင်းလျှင် အတုံးရှည်
                    indicatorBox.innerHTML = `<div class="ind-pill active full"></div>`;
                } else {
                    // နေ့တစ်ဝက်ဆင်းလျှင် အတုံးခွဲ (ဆင်းသည့်အချိန်တွင် အရောင်လင်းမည်)
                    indicatorBox.innerHTML = `
                        <div class="ind-pill ${att.morning ? 'active' : ''}"></div>
                        <div class="ind-pill ${att.evening ? 'active' : ''}"></div>
                    `;
                }
                dayDiv.appendChild(indicatorBox);

                // ငွေရှင်းပြီးသားဖြစ်ပါက အရောင်အတုံးလေးများအနီး (အောက်ခြေ) တွင် အစိမ်းရောင် အမှန်ခြစ်လေး ပြရန်
                if (att.paid) {
                    const paidBadge = document.createElement('div');
                    paidBadge.innerHTML = '✔'; 
                    // အပေါ်ဆုံးမှနေ၍ အောက်ခြေ အရောင်အတုံးလေးများအနီးသို့ ရွှေ့လိုက်ပါသည်
                    paidBadge.style.cssText = 'position: absolute; bottom: 18px; left: 4px; color: #28a745; font-size: 14px; font-weight: bold; text-shadow: 0px 0px 3px rgba(255,255,255,0.9);';
                    dayDiv.appendChild(paidBadge);
                }
            }
        }

        // Long Press Setup 
        let pressTimer;
        let isLongPress = false;
        const targetDateObj = new Date(currentYear, currentMonth, i);

        const startPress = () => { 
            isLongPress = false; 
            pressTimer = window.setTimeout(() => { isLongPress = true; showPayroll(targetDateObj); }, 600); 
        };
        const cancelPress = () => { clearTimeout(pressTimer); };

        dayDiv.onmousedown = startPress;
        dayDiv.onmouseup = cancelPress;
        dayDiv.onmouseleave = cancelPress;
        
        dayDiv.ontouchstart = startPress;
        dayDiv.ontouchend = cancelPress;
        dayDiv.ontouchmove = cancelPress;

        // ရက်စွဲတစ်ခုကို ရိုးရိုးနှိပ်လိုက်ပါက
        dayDiv.onclick = (e) => {
            if (isLongPress) return; // ဖိထားတာဆိုရင် ရိုးရိုးနှိပ်တာကို အလုပ်မလုပ်စေပါ
            
            // ရွေးထားသည့်ရက်ကို ထပ်နှိပ်ပါက Deselect ဖြစ်ပြီး ယနေ့ရက်စွဲသို့ ပြန်သွားရန်
            if (selectedDateKey === dateKey) {
                const todayObj = new Date();
                selectedDateKey = `${todayObj.getFullYear()}-${todayObj.getMonth() + 1}-${todayObj.getDate()}`;
                document.getElementById('currentDateStr').innerText = todayObj.toDateString();
            } else {
                selectedDateKey = dateKey;
                document.getElementById('currentDateStr').innerText = targetDateObj.toDateString();
            }
            
            renderCalendar();
            renderWorkers();
        };

        calendarGrid.appendChild(dayDiv);
    }
}

// Render Workers
function renderWorkers() {
    workerList.innerHTML = '';
    
    // selectedDateKey ကို အသုံးပြု၍ data ယူမည်
    if (!attendance[selectedDateKey]) attendance[selectedDateKey] = {};

    workers.forEach(worker => {
        const isMorning = attendance[selectedDateKey][worker.id]?.morning || false;
        const isEvening = attendance[selectedDateKey][worker.id]?.evening || false;

        const workerEl = document.createElement('div');
        workerEl.classList.add('worker-item');
        if (selectedWorkerId === worker.id) {
            workerEl.classList.add('active-select'); // ရွေးထားသူကို အရောင်ပြမည်
        }
        
        // Long Press to Edit Worker
        let wPressTimer;
        let wIsLongPress = false;
        
        const startWPress = (e) => { 
            // အရောင်အတုံးလေး (Pill) ကို နှိပ်ခြင်းဖြစ်ပါက Long Press စနစ်ကို လုံးဝ မလုပ်ဆောင်စေရန် တားမည်
            if (e && e.target && e.target.classList.contains('pill')) return;

            wIsLongPress = false; 
            wPressTimer = window.setTimeout(() => { 
                wIsLongPress = true; 
                editingWorkerId = worker.id;
                document.querySelector('#workerModal h3').innerText = 'အလုပ်သမားအချက်အလက် ပြင်ဆင်ရန်';
                document.getElementById('deleteBtn').style.display = 'block';
                document.getElementById('wName').value = worker.name;
                document.getElementById('wWage').value = worker.wage;
                document.getElementById('wMorningWage').value = worker.morningWage || '';
                document.getElementById('wEveningWage').value = worker.eveningWage || '';
                document.getElementById('wColor').value = worker.color;
                workerModal.style.display = 'flex';
            }, 600); 
        };
        const cancelWPress = () => { clearTimeout(wPressTimer); };

        workerEl.onmousedown = startWPress;
        workerEl.onmouseup = cancelWPress;
        workerEl.onmouseleave = cancelWPress;
        workerEl.ontouchstart = startWPress;
        workerEl.ontouchend = cancelWPress;
        workerEl.ontouchmove = cancelWPress;

        workerEl.onclick = (e) => {
            cancelWPress();
            
            // ၁။ ဖုန်း Touch စနစ်တွင် ပိုမိုတိကျစေရန် Button ခလုတ်ကို ဖမ်းယူခြင်း
            const pillBtn = e.target.closest('.pill');
            if (pillBtn) {
                const timeOfDay = pillBtn.getAttribute('data-time');
                toggleAttendance(worker.id, timeOfDay);
                return; // အောက်က Select လုပ်သည့်အဆင့်သို့ ဆက်မသွားရန် တားဆီးခြင်း
            }

            // ၂။ ပုံမှန်နှိပ်ပါက (အလုပ်သမားကို Select / Deselect လုပ်မည်)
            if(!wIsLongPress) {
                if (selectedWorkerId === worker.id) {
                    selectedWorkerId = null;
                } else {
                    selectedWorkerId = worker.id;
                }
                renderCalendar(); 
                renderWorkers(); 
            }
        };

        workerEl.innerHTML = `
            <div class="worker-info">
                <div class="color-bar" style="background-color: ${worker.color}"></div>
                <div class="w-name">${worker.name}</div>
            </div>
            <div class="attendance-toggles">
                <div class="w-wage">${worker.wage} ks</div>
                <div class="pills">
                    <button class="pill ${isMorning ? 'active' : ''}" style="--active-color: ${worker.color}" data-time="morning" type="button"></button>
                    <button class="pill ${isEvening ? 'active' : ''}" style="--active-color: ${worker.color}" data-time="evening" type="button"></button>
                </div>
            </div>
        `;
        workerList.appendChild(workerEl);
    });
}

// Toggle Attendance (Morning / Evening)
window.toggleAttendance = function(workerId, timeOfDay) {
    // အနာဂတ်ရက်စွဲများကို တားဆီးခြင်း
    const parts = selectedDateKey.split('-');
    const selectedDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0); // အချိန်များကို သုညသို့ ပြောင်း၍ ရက်စွဲသီးသန့် နှိုင်းယှဉ်ရန်

    if (selectedDateObj > todayObj) {
        alert("အနာဂတ် ရက်စွဲများအတွက် အလုပ်ဆင်းမှတ်တမ်း ကြိုတင်၍ ထည့်သွင်းခွင့် မပြုပါ။");
        return; // ဒီနေရာမှာတင် ရပ်လိုက်မည်
    }

    if (!attendance[selectedDateKey]) attendance[selectedDateKey] = {};
    
    attendance[selectedDateKey][workerId][timeOfDay] = !attendance[selectedDateKey][workerId][timeOfDay];
    
    // Save to Local Storage
    localStorage.setItem('amm_attendance', JSON.stringify(attendance));
    renderWorkers();
    
    // If currently selected, refresh calendar to show updates
    if(selectedWorkerId === workerId) renderCalendar(); 
}

// Modal Controls (Add Worker & Edit)
let editingWorkerId = null;

document.getElementById('addWorkerBtn').onclick = () => {
    editingWorkerId = null;
    document.querySelector('#workerModal h3').innerText = 'အလုပ်သမားအသစ် ထည့်ရန်';
    document.getElementById('deleteBtn').style.display = 'none';
    document.getElementById('wName').value = '';
    document.getElementById('wWage').value = '';
    document.getElementById('wMorningWage').value = '';
    document.getElementById('wEveningWage').value = '';
    document.getElementById('wColor').value = '#ff0044';
    workerModal.style.display = 'flex';
};

document.getElementById('cancelBtn').onclick = () => workerModal.style.display = 'none';

document.getElementById('deleteBtn').onclick = () => {
    if (confirm("ဤအလုပ်သမားကို ဖျက်ရန် သေချာပါသလား? အချက်အလက်များ ပြန်လည်ရယူနိုင်မည် မဟုတ်ပါ။")) {
        workers = workers.filter(w => w.id !== editingWorkerId);
        localStorage.setItem('amm_workers', JSON.stringify(workers));
        workerModal.style.display = 'none';
        
        // ဖျက်လိုက်တဲ့သူကို Calendar မှာ ရွေးထားမိရင် ပြန်ဖြုတ်ပေးရန်
        if (selectedWorkerId === editingWorkerId) { 
            selectedWorkerId = null; 
        }
        
        renderWorkers();
        renderCalendar();
    }
};

document.getElementById('saveBtn').onclick = () => {
    const name = document.getElementById('wName').value;
    const wage = document.getElementById('wWage').value;
    const morningWage = document.getElementById('wMorningWage').value;
    const eveningWage = document.getElementById('wEveningWage').value;
    const color = document.getElementById('wColor').value;

    if (name && wage) {
        if (editingWorkerId) {
            // အချက်အလက် ပြင်ဆင်ခြင်း (Edit)
            const wIndex = workers.findIndex(w => w.id === editingWorkerId);
            if (wIndex > -1) {
                workers[wIndex] = { ...workers[wIndex], name, wage, morningWage, eveningWage, color };
            }
        } else {
            // အသစ်ထည့်ခြင်း (Add New)
            workers.push({ id: Date.now(), name, wage, morningWage, eveningWage, color });
        }
        
        localStorage.setItem('amm_workers', JSON.stringify(workers));
        workerModal.style.display = 'none';
        renderWorkers();
    } else {
        alert("အမည်နှင့် တစ်ရက်လုပ်အားခ ထည့်ပါ။");
    }
}

// Month Navigation
document.getElementById('prevMonth').onclick = () => { currentMonth--; if(currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { currentMonth++; if(currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); };

// Toggle Worker Panel (Hide/Show)
handleBar.onclick = () => {
    workerPanel.classList.toggle('collapsed');
};

// ====== Payroll Calculation Logic ======
const payrollModal = document.getElementById('payrollModal');
const payrollTitle = document.getElementById('payrollTitle');
const payrollWorkerList = document.getElementById('payrollWorkerList');
const payrollDetail = document.getElementById('payrollDetail');

document.getElementById('closePayrollBtn').onclick = () => { payrollModal.style.display = 'none'; };

function showPayroll(targetDate) {
    payrollModal.style.display = 'flex';
    payrollDetail.style.display = 'none';
    payrollWorkerList.style.display = 'flex';
    
    // ခေါင်းစဉ်ကို မြန်မာလို ပြောင်းခြင်း
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    payrollTitle.innerText = `${targetDate.toLocaleDateString('en-US', options)} အထိ ရှင်းတမ်း`;
    
    payrollWorkerList.innerHTML = '';
    const targetTime = targetDate.getTime();

    workers.forEach(w => {
        let totalDays = 0;
        let totalKs = 0; // စုစုပေါင်းငွေ
        let historyHtml = '';
        let unpaidDates = []; // ငွေမရှင်းရသေးသော ရက်စွဲများကို မှတ်ထားရန်
        
        // လုပ်အားခ သတ်မှတ်ချက်များ (မထည့်ထားပါက တစ်ရက်လုပ်အားခ၏ တစ်ဝက်စီ ယူမည်)
        const baseWage = parseFloat(w.wage);
        const morningRate = w.morningWage ? parseFloat(w.morningWage) : baseWage / 2;
        const eveningRate = w.eveningWage ? parseFloat(w.eveningWage) : baseWage / 2;
        
        // ရက်စွဲများကို အစဉ်လိုက်စီခြင်း
        const sortedDates = Object.keys(attendance).sort((a, b) => new Date(a) - new Date(b));
        
        sortedDates.forEach(dateKey => {
            const d = new Date(dateKey);
            if (d.getTime() <= targetTime && attendance[dateKey][w.id]) {
                const att = attendance[dateKey][w.id];
                // ရှင်းပြီးသား (paid: true) မဟုတ်မှသာ တွက်ချက်မည်
                if (!att.paid && (att.morning || att.evening)) {
                    unpaidDates.push(dateKey); // မရှင်းရသေးသော ရက်စွဲအဖြစ် မှတ်သားမည်

                    let dayVal = 0;
                    let dayLabel = '';
                    let dayKs = 0;
                    
                    if (att.morning && att.evening) { 
                        dayVal = 1; 
                        dayLabel = 'တစ်နေ့လုံး'; 
                        dayKs = morningRate + eveningRate;
                    } else if (att.morning) { 
                        dayVal = 0.5; 
                        dayLabel = 'မနက်ပိုင်း'; 
                        dayKs = morningRate;
                    } else { 
                        dayVal = 0.5; 
                        dayLabel = 'ညနေပိုင်း'; 
                        dayKs = eveningRate;
                    }
                    
                    totalDays += dayVal;
                    totalKs += dayKs;

                    // ရက်စွဲကို နေ့ . လ . နှစ် ပုံစံပြောင်းခြင်း
                    const parts = dateKey.split('-');
                    const formattedDate = `${parts[2]} . ${parts[1]} . ${parts[0]}`;

                    historyHtml += `<div class="payroll-history-item"><span>${formattedDate}</span><span>${dayLabel}</span></div>`;
                }
            }
        });
        
        // အလုပ်သမားစာရင်းကတ် (Card) ဖန်တီးခြင်း
        const wCard = document.createElement('div');
        wCard.className = 'payroll-w-card';
        wCard.innerHTML = `
            <div>
                <strong style="color: ${w.color}; font-size: 16px;">${w.name}</strong><br>
                <small style="color: #888;">${totalDays} ရက် (မရှင်းရသေး)</small>
            </div>
            <strong style="font-size: 16px;">${totalKs.toLocaleString()} ks</strong>
        `;
        
        // ကတ်ကို နှိပ်လျှင် အသေးစိတ်ပြရန်
        wCard.onclick = () => {
            payrollWorkerList.style.display = 'none';
            payrollDetail.style.display = 'block';
            payrollDetail.innerHTML = `
                <button class="back-btn" onclick="document.getElementById('payrollDetail').style.display='none'; document.getElementById('payrollWorkerList').style.display='flex';">&#8592; နောက်သို့</button>
                <h4 style="color:${w.color}; margin: 10px 0;">${w.name} ၏ အသေးစိတ်မှတ်တမ်း</h4>
                <div style="background: #fff; padding: 15px; border-radius: 10px; border: 1px solid #eee;">
                    ${historyHtml || '<p style="text-align:center; color:#888;">ရှင်းရန် မှတ်တမ်းမရှိပါ</p>'}
                </div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:18px; margin-top: 20px; padding: 15px; background: #1a2b3c; color: white; border-radius: 10px;">
                    <span>စုစုပေါင်း (${totalDays} ရက်)</span>
                    <span>${totalKs.toLocaleString()} ks</span>
                </div>
                ${totalDays > 0 ? `<button id="markPaidBtn" style="width: 100%; padding: 15px; margin-top: 15px; border: none; border-radius: 10px; background-color: #28a745; color: white; font-size: 16px; font-weight: bold; cursor: pointer;">ငွေရှင်းပြီးပါပြီ</button>` : ''}
            `;

            // ငွေရှင်းခလုတ်ကို နှိပ်လိုက်ပါက
            if (totalDays > 0) {
                document.getElementById('markPaidBtn').onclick = () => {
                    if (confirm(`${w.name} အား ငွေ ${totalKs.toLocaleString()} ကျပ် ရှင်းပြီးကြောင်း သေချာပါသလား?`)) {
                        // မှတ်ထားသော ရက်စွဲများကို ရှင်းပြီး (paid) အဖြစ် ပြောင်းလဲမည်
                        unpaidDates.forEach(dateKey => {
                            attendance[dateKey][w.id].paid = true;
                        });
                        localStorage.setItem('amm_attendance', JSON.stringify(attendance));
                        
                        alert("ငွေရှင်းပြီးကြောင်း မှတ်တမ်းတင်ပြီးပါပြီ။");
                        
                        // စာမျက်နှာကို Refresh လုပ်ရန်
                        document.getElementById('payrollDetail').style.display = 'none';
                        document.getElementById('payrollWorkerList').style.display = 'flex';
                        showPayroll(targetDate); 
                    }
                };
            }
        };
        payrollWorkerList.appendChild(wCard);
    });
}

// ====== Alarm (ICS) Generation ======
const alarmModal = document.getElementById('alarmModal');

document.getElementById('setAlarmBtn').onclick = (e) => {
    e.stopPropagation(); 
    // Alarm ရှိပြီးသားဆိုလျှင် ပြန်လည်ဖော်ပြပေးမည်
    if (alarmsData[selectedDateKey]) {
        const isObj = typeof alarmsData[selectedDateKey] === 'object';
        document.getElementById('alarmTimeInput').value = isObj ? alarmsData[selectedDateKey].time : alarmsData[selectedDateKey];
        const savedNote = isObj ? alarmsData[selectedDateKey].note : '';
        document.getElementById('alarmNoteInput').value = savedNote === 'လုပ်အားခ ရှင်းရန်' ? '' : savedNote;
        document.getElementById('deleteAlarmBtn').style.display = 'block';
    } else {
        document.getElementById('alarmTimeInput').value = '09:00';
        document.getElementById('alarmNoteInput').value = '';
        document.getElementById('deleteAlarmBtn').style.display = 'none';
    }
    alarmModal.style.display = 'flex'; 
};

document.getElementById('cancelAlarmBtn').onclick = () => {
    alarmModal.style.display = 'none';
};

// Alarm ဖျက်ရန်
document.getElementById('deleteAlarmBtn').onclick = () => {
    if (confirm("ဤ Alarm မှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?")) {
        delete alarmsData[selectedDateKey];
        localStorage.setItem('amm_alarms', JSON.stringify(alarmsData));
        alarmModal.style.display = 'none';
        renderCalendar();
    }
};

document.getElementById('saveAlarmBtn').onclick = () => {
    const timeVal = document.getElementById('alarmTimeInput').value; 
    const noteVal = document.getElementById('alarmNoteInput').value.trim();
    // ဘာမှမရေးထားပါက Default စာသား အသုံးပြုမည်
    const finalNote = noteVal === '' ? 'လုပ်အားခ ရှင်းရန်' : noteVal;

    if (!timeVal) return alert("အချိန် သတ်မှတ်ပေးပါ။");

    // Local Storage တွင် အချိန်နှင့် စာသားကို တွဲ၍ မှတ်သားထားမည်
    alarmsData[selectedDateKey] = { time: timeVal, note: finalNote };
    localStorage.setItem('amm_alarms', JSON.stringify(alarmsData));
    renderCalendar(); 

    const parts = selectedDateKey.split('-');
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    const dateFormatted = `${year}${month}${day}`;
    
    const timeParts = timeVal.split(':');
    const hour = timeParts[0];
    const minute = timeParts[1];
    const timeFormatted = `${hour}${minute}00`;
    
    const endHour = (parseInt(hour) + 1).toString().padStart(2, '0');
    
    const startTime = `${dateFormatted}T${timeFormatted}`;
    const endTime = `${dateFormatted}T${endHour}${minute}00`;

    const icsMSG = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AMM HR App//EN
BEGIN:VEVENT
UID:${Date.now()}@ammhr.com
DTSTAMP:${startTime}Z
DTSTART;TZID=Asia/Yangon:${startTime}
DTEND;TZID=Asia/Yangon:${endTime}
SUMMARY:${finalNote}
DESCRIPTION:AMM HR App မှ သတိပေးချက် - ${finalNote}
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

    // ဖိုင်ဖန်တီး၍ နှိပ်ပေးခြင်း (ဖုန်း Calendar သို့ ပို့ရန်)
    const blob = new Blob([icsMSG], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Payroll_Alarm_${dateFormatted}.ics`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alarmModal.style.display = 'none'; 
};

// နေ့ကူးသွားသည့်အခါ (ဥပမာ - ဖုန်းတွင် အက်ပ်ကို မပိတ်ဘဲ နောက်တစ်နေ့ရောက်မှ ပြန်ကြည့်သည့်အခါ) ရက်စွဲအလိုအလျောက် ပြောင်းလဲစေရန်
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const realToday = new Date();
        const currentTodayStr = `${realToday.getFullYear()}-${realToday.getMonth() + 1}-${realToday.getDate()}`;
        
        // ယခင်ဖွင့်ထားသည့် ရက်စွဲနှင့် လက်ရှိရက်စွဲ မတူတော့ပါက (နေ့ကူးသွားပါက)
        const loadedTodayStr = `${currentYear}-${currentMonth + 1}-${currentDate.getDate()}`;
        if (currentTodayStr !== loadedTodayStr) {
            location.reload(); // အက်ပ်ကို အလိုအလျောက် Refresh လုပ်ပြီး ရက်စွဲအသစ်နှင့် ပြက္ခဒိန်ကို အသစ်ပြန်ခေါ်မည်
        }
    }
});
