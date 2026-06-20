let bluetoothDevice = null;
let bluetoothCharacteristic = null;
let isTouchpadding = false;
let lastX = 0, lastY = 0;
let hasMoved = false;
let targetMode = ""; 
let isEditMode = false;

let config = {
    bgColor: "#121214",
    btnColor: "#00e676",
    textColor: "#121214",
    fontFamily: "sans-serif",
    elements: []
};

// HC-05/06 gibi klasik cihazlar için BLE dönüştürücü ve evrensel servis UUID listesi
const UART_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb"; 
const UART_TX_CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

// ARADIĞIN TÜM ÖZEL KARAKTERLER, SAYILAR VE FARE AKSİYONLARINI İÇEREN DEV HAVUZ
const AVAILABLE_KEYS = [
    "0","1","2","3","4","5","6","7","8","9",
    "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
    "Mouse Left","Mouse Right","Scroll Click","Mouse 4","Mouse 5",
    "Scroll Up","Scroll Down","Ctrl","Alt","Shift","Delete","Backspace","Enter","Space","Escape","Tab",
    "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
    "@", "#", "₺", "_", "&", "-", "+", "(", ")", "/", "*", "\"", "'", ":", ";", "!", "?", "~", "`", "|", "•", "√", "π", "÷", "×", "§", "∆", "£", "€", "$", "¢", "^", "°", "=", "{", "}", "\\", "%", "©", "®", "™", "✓", "[", "]", "<", ">"
];

// DOM Elemanları
const lockBtn = document.getElementById('lock-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const keyInput = document.getElementById('key-input');
const autocompleteList = document.getElementById('autocomplete-list');
const gamepadArea = document.getElementById('gamepad-area');
const infoText = document.getElementById('info-text');
const connectBtBtn = document.getElementById('connect-bt-btn');
const btStatus = document.getElementById('bt-status');

// Özel Modül Form Elemanları
const macroStringInput = document.getElementById('macro-string-input');
const addMacroStringBtn = document.getElementById('add-macro-string-btn');
const comboBoxesContainer = document.getElementById('combo-boxes-container');
const addComboBoxField = document.getElementById('add-combo-box-field');
const removeComboBoxField = document.getElementById('remove-combo-box-field');
const addComboBtn = document.getElementById('add-combo-btn');

// Tema Renk Ayarları
const bgColorPicker = document.getElementById('bg-color-picker');
const btnColorPicker = document.getElementById('btn-color-picker');
const textColorPicker = document.getElementById('text-color-picker');
const saveLayoutBtn = document.getElementById('save-layout-btn');
const clearLayoutBtn = document.getElementById('clear-layout-btn');

// 1. DÜZENLEME MODU / KİLİT MOTORU
lockBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode-on', isEditMode);
    lockBtn.classList.toggle('edit-active', isEditMode);
    lockBtn.innerText = isEditMode ? "✏️ Düzenleme Açık" : "🔒 Düzenleme Modu";
});

// 2. SAYFA YÜKLENDİĞİNDE HAFIZADAKİ BUTONLARI GERİ GETİRME
window.addEventListener('DOMContentLoaded', () => {
    const savedConfig = localStorage.getItem('gamepad_smart_theme');
    if (savedConfig) {
        config = JSON.parse(savedConfig);
        document.body.style.backgroundColor = config.bgColor;
        bgColorPicker.value = config.bgColor;
        btnColorPicker.value = config.btnColor;
        textColorPicker.value = config.textColor;

        if (config.elements && config.elements.length > 0) {
            infoText.style.display = 'none';
            config.elements.forEach(el => {
                createButtonElement(el.subType, el.key, el.left, el.top, el.width, el.height);
            });
        }
    }
});

// 3. AKILLI OTOMATİK TUŞ TAMAMLAMA (AUTOCOMPLETE)
keyInput.addEventListener('input', () => {
    let val = keyInput.value.trim().toLowerCase();
    autocompleteList.innerHTML = '';
    if (!val) { autocompleteList.classList.add('hidden'); return; }
    
    let filtered = AVAILABLE_KEYS.filter(k => k.toLowerCase().includes(val));
    if (filtered.length > 0) {
        autocompleteList.classList.remove('hidden');
        filtered.forEach(key => {
            let item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerText = key;
            item.addEventListener('click', () => { 
                keyInput.value = key; 
                autocompleteList.classList.add('hidden'); 
            });
            autocompleteList.appendChild(item);
        });
    } else { autocompleteList.classList.add('hidden'); }
});

document.addEventListener('click', (e) => {
    if (e.target !== keyInput) autocompleteList.classList.add('hidden');
});

// 4. DİNAMİK KOMBİNASYON GİRİŞ SİSTEMİ (KUTU + KUTU)
addComboBoxField.addEventListener('click', () => {
    const wrapper = comboBoxesContainer.querySelector('.combo-row');
    
    const plusSpan = document.createElement('span');
    plusSpan.className = 'combo-plus';
    plusSpan.innerText = '+';
    
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.className = 'combo-box-input';
    newInput.placeholder = 'Tuş';
    newInput.setAttribute('autocomplete', 'off');

    wrapper.appendChild(plusSpan);
    wrapper.appendChild(newInput);
});

removeComboBoxField.addEventListener('click', () => {
    const wrapper = comboBoxesContainer.querySelector('.combo-row');
    const inputs = wrapper.querySelectorAll('.combo-box-input');
    const symbols = wrapper.querySelectorAll('.combo-plus');
    
    if (inputs.length > 2) {
        inputs[inputs.length - 1].remove();
        symbols[symbols.length - 1].remove();
    } else {
        alert("En az iki kutu olmak zorundadır! (Kutu + Kutu)");
    }
});

// 5. BUTON ÜRETİM TETİKLEYİCİLERİ
document.getElementById('add-button-btn').addEventListener('click', () => {
    let key = keyInput.value.trim();
    if(!key) return alert("Lütfen geçerli bir tuş seçin veya yazın!");
    infoText.style.display = 'none';
    createButtonElement('standard', key, '120px', '120px');
    settingsPanel.classList.add('hidden');
});

addMacroStringBtn.addEventListener('click', () => {
    let str = macroStringInput.value;
    if(!str) return alert("Lütfen gönderilecek metni yazın!");
    infoText.style.display = 'none';
    createButtonElement('macro', str, '120px', '120px');
    settingsPanel.classList.add('hidden');
});

addComboBtn.addEventListener('click', () => {
    const inputs = comboBoxesContainer.querySelectorAll('.combo-box-input');
    let keysArr = [];
    inputs.forEach(inp => { if(inp.value.trim()) keysArr.push(inp.value.trim()); });
    
    if(keysArr.length < 2) return alert("Lütfen kombinasyon kutularını doldurun!");
    infoText.style.display = 'none';
    createButtonElement('combo', keysArr.join('+'), '120px', '120px');
    settingsPanel.classList.add('hidden');
});

// 6. ESNEK SÜRÜKLENEBİLİR VE BOYUTLANABİLİR BUTON FABRİKASI
function createButtonElement(subType, coreValue, left, top, width="85px", height="85px") {
    const btn = document.createElement('div');
    btn.className = 'custom-btn';
    btn.style.left = left; btn.style.top = top; btn.style.width = width; btn.style.height = height;
    btn.style.backgroundColor = config.btnColor; btn.style.borderColor = config.btnColor; btn.style.color = config.textColor;

    btn.dataset.type = 'btn-element';
    btn.dataset.subtype = subType;
    btn.dataset.value = coreValue;

    if (subType === 'standard') {
        btn.innerText = coreValue;
    } else if (subType === 'macro') {
        btn.classList.add('macro-type');
        btn.innerHTML = `📝 Metin <span class="btn-subtext">"${coreValue.substring(0,8)}..."</span>`;
    } else if (subType === 'combo') {
        btn.classList.add('combo-type');
        btn.innerHTML = `🎛️ Kombo <span class="btn-subtext">${coreValue}</span>`;
    }

    gamepadArea.appendChild(btn);
    makeElementFlexible(btn);
}

function makeElementFlexible(el) {
    let evCache = []; let prevDiff = -1; let startX = 0, startY = 0; let isDragging = false;

    el.addEventListener('pointerdown', e => {
        if (!isEditMode) {
            executeButtonAction(el.dataset.subtype, el.dataset.value, "BASILDI");
            el.setPointerCapture(e.pointerId);
            return;
        }
        evCache.push(e);
        if (evCache.length === 1) { 
            isDragging = true; 
            startX = e.clientX - el.offsetLeft; 
            startY = e.clientY - el.offsetTop; 
        }
        el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', e => {
        if (!isEditMode) return;
        for (let i = 0; i < evCache.length; i++) { if (e.pointerId == evCache[i].pointerId) { evCache[i] = e; break; } }
        
        // Pinch to Zoom (Çift Parmak Boyutlandırma)
        if (evCache.length === 2) {
            isDragging = false;
            let curDiff = Math.sqrt(Math.pow(evCache[0].clientX - evCache[1].clientX, 2) + Math.pow(evCache[0].clientY - evCache[1].clientY, 2));
            if (prevDiff > 0) {
                let nSize = parseInt(el.style.width) + (curDiff - prevDiff) * 0.5;
                if (nSize > 65 && nSize < 280) { el.style.width = nSize + 'px'; el.style.height = nSize + 'px'; }
            }
            prevDiff = curDiff;
        } 
        // Taşıma (Tek Parmak Sürükleme)
        else if (evCache.length === 1 && isDragging) {
            el.style.left = (e.clientX - startX) + 'px'; 
            el.style.top = (e.clientY - startY) + 'px';
        }
    });

    const upH = e => {
        if (!isEditMode) executeButtonAction(el.dataset.subtype, el.dataset.value, "BIRAKILDI");
        for (let i = 0; i < evCache.length; i++) { if (evCache[i].pointerId == e.pointerId) { evCache.splice(i, 1); break; } }
        if (evCache.length < 2) prevDiff = -1;
        if (evCache.length === 0) isDragging = false;
        el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener('pointerup', upH); el.addEventListener('pointercancel', upH);
}

// 7. ÖZEL AKSİYON MOTORU VE SİNYAL PAKETLEYİCİ
function executeButtonAction(subType, value, status) {
    if (subType === 'standard') {
        sendBluetoothData(value, status);
    } 
    else if (subType === 'macro') {
        // İstediğin harf harf akış formatı (Örn: H,e,l,l,o,space,w,o,r,l,d,!)
        if (status === "BASILDI") {
            let letters = value.split('').map(char => char === ' ' ? 'space' : char).join(',');
            sendBluetoothData("STR_MACRO", letters);
        }
    } 
    else if (subType === 'combo') {
        // Çoklu kombinasyon (Örn: COMBO:Ctrl+C:BASILDI)
        sendBluetoothData(`COMBO:${value}`, status);
    }
}

// 8. JOYSTICK MODÜLLERİ FABRİKASI
document.getElementById('add-normal-joy-btn').addEventListener('click', () => { infoText.style.display = 'none'; createJoystickElement('joystick-normal', '50px', '200px', '120px'); settingsPanel.classList.add('hidden'); });
document.getElementById('add-wasd-joy-btn').addEventListener('click', () => { infoText.style.display = 'none'; createJoystickElement('joystick-wasd', '250px', '200px', '120px'); settingsPanel.classList.add('hidden'); });

function createJoystickElement(type, left, top, size) {
    const joy = document.createElement('div'); 
    joy.className = `custom-joystick ${type === 'joystick-wasd' ? 'wasd-type' : ''}`;
    joy.style.left = left; joy.style.top = top; joy.style.width = size; joy.style.height = size; 
    joy.dataset.type = type;
    
    const knob = document.createElement('div'); knob.className = 'joystick-knob'; joy.appendChild(knob);
    gamepadArea.appendChild(joy); 
    makeElementFlexible(joy); 
    setupJoystickLogic(joy, knob, type);
}

function setupJoystickLogic(joy, knob, type) {
    let isDragging = false; let activeKeys = { W: false, A: false, S: false, D: false };
    joy.addEventListener('pointerdown', e => { if (isEditMode) return; isDragging = true; });
    joy.addEventListener('pointermove', e => {
        if (!isDragging || isEditMode) return;
        let rect = joy.getBoundingClientRect(); let centerX = rect.left + rect.width / 2; let centerY = rect.top + rect.height / 2; let radius = rect.width / 2;
        let dx = e.clientX - centerX; let dy = e.clientY - centerY; let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radius) { dx = (dx / distance) * radius; dy = (dy / distance) * radius; distance = radius; }
        knob.style.left = `calc(50% + ${dx}px)`; knob.style.top = `calc(50% + ${dy}px)`;
        let normalX = Math.round((dx / radius) * 100); let normalY = Math.round((dy / radius) * -100);
        
        if (type === 'joystick-normal') { sendBluetoothData("JOY1_MOVE", `${normalX},${normalY}`); } 
        else if (type === 'joystick-wasd') {
            let newKeys = { W: false, A: false, S: false, D: false };
            if (distance > radius * 0.3) {
                let angle = Math.atan2(-dy, dx) * (180 / Math.PI); if (angle < 0) angle += 360;
                if (angle >= 67.5 && angle < 112.5)  newKeys.W = true;
                else if (angle >= 112.5 && angle < 157.5) { newKeys.W = true; newKeys.A = true; }
                else if (angle >= 157.5 && angle < 202.5) newKeys.A = true;
                else if (angle >= 202.5 && angle < 247.5) { newKeys.S = true; newKeys.A = true; }
                else if (angle >= 247.5 && angle < 292.5) newKeys.S = true;
                else if (angle >= 292.5 && angle < 337.5) { newKeys.S = true; newKeys.D = true; }
                else if (angle >= 337.5 || angle < 22.5)  newKeys.D = true;
                else if (angle >= 22.5 && angle < 67.5)   { newKeys.W = true; newKeys.D = true; }
            }
            ['W', 'A', 'S', 'D'].forEach(k => { if (newKeys[k] !== activeKeys[k]) { sendBluetoothData(k, newKeys[k] ? "BASILDI" : "BIRAKILDI"); activeKeys[k] = newKeys[k]; } });
        }
    });
    const stopJoy = () => { isDragging = false; knob.style.left = '50%'; knob.style.top = '50%'; if (type === 'joystick-normal') { sendBluetoothData("JOY1_MOVE", "0,0"); } else { ['W', 'A', 'S', 'D'].forEach(k => { if (activeKeys[k]) { sendBluetoothData(k, "BIRAKILDI"); activeKeys[k] = false; } }); } };
    joy.addEventListener('pointerup', stopJoy); joy.addEventListener('pointercancel', stopJoy);
}

// 9. SAF TOUCHPAD FARE SÜRÜCÜSÜ
gamepadArea.addEventListener('pointerdown', e => { if (isEditMode) return; if (e.target === gamepadArea || e.target === infoText) { isTouchpadding = true; hasMoved = false; lastX = e.clientX; lastY = e.clientY; gamepadArea.setPointerCapture(e.pointerId); } });
gamepadArea.addEventListener('pointermove', e => { if (!isTouchpadding || isEditMode) return; let dx = Math.round((e.clientX - lastX)*1.5); let dy = Math.round((e.clientY - lastY)*1.5); if (Math.abs(dx)>0 || Math.abs(dy)>0) { hasMoved = true; sendBluetoothData("MOUSE_MOVE", `${dx},${dy}`); } lastX = e.clientX; lastY = e.clientY; });
gamepadArea.addEventListener('pointerup', e => { if (!isTouchpadding) return; isTouchpadding = false; gamepadArea.releasePointerCapture(e.pointerId); if (!hasMoved && !isEditMode) sendBluetoothData("MOUSE_LEFT", "TIKLANDI"); });

// 10. LOCALSTORAGE HAFIZA KAYIT MOTORLARI
saveLayoutBtn.addEventListener('click', () => {
    config.elements = [];
    document.querySelectorAll('.custom-btn, .custom-joystick').forEach(el => {
        config.elements.push({
            type: el.dataset.type || 'joystick-element', 
            subType: el.dataset.subtype || '', 
            key: el.dataset.value || '',
            left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height
        });
    });
    localStorage.setItem('gamepad_smart_theme', JSON.stringify(config));
    alert("Tüm buton yerleşimleri ve kombinasyon makroları hafızaya kaydedildi!");
});

clearLayoutBtn.addEventListener('click', () => { if (confirm("Hafıza sıfırlansın mı?")) { localStorage.removeItem('gamepad_smart_theme'); location.reload(); } });

// 11. EVRENSEL VE FİLTERESİZ BLUETOOTH SÜRÜCÜSÜ (YÜKLENİYORDA TAKILMAZ)
connectBtBtn.addEventListener('click', async () => {
    try {
        btStatus.innerText = "Aranıyor..."; btStatus.style.color = "#ff9800";
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                "0000ffe0-0000-1000-8000-00805f9b34fb",
                "0000ffe1-0000-1000-8000-00805f9b34fb",
                "00001101-0000-1000-8000-00805f9b34fb"
            ]
        });

        btStatus.innerText = "Bağlanıyor...";
        const server = await bluetoothDevice.gatt.connect();
        const services = await server.getPrimaryServices();
        if (services.length === 0) throw new Error("GATT Servisi bulunamadı.");
        
        let targetService = services[0];
        const characteristics = await targetService.getCharacteristics();
        
        if (characteristics.length > 0) {
            bluetoothCharacteristic = characteristics[0];
            btStatus.innerText = "Bağlandı!"; btStatus.style.color = "#00e676";
        } else {
            throw new Error("Yazılabilir characteristic bulunamadı.");
        }

        bluetoothDevice.addEventListener('gattserverdisconnected', () => {
            btStatus.innerText = "Bağlantı Koptu"; btStatus.style.color = "#ef4444";
            bluetoothCharacteristic = null;
        });

    } catch (error) { 
        console.error(error); btStatus.innerText = "Hata!"; btStatus.style.color = "#ef4444"; 
        alert("Bağlantı Başarısız!\n\nTarayıcı üzerinden HC-05/06 gibi klasik Bluetooth modüllerini çalıştırmak işletim sistemi engeline takılır. Lütfen HM-10 veya ESP32 gibi bir BLE modülü kullandığınızdan emin olun.");
    }
});

function sendBluetoothData(key, state) {
    console.log(`Veri -> ${key}:${state}`);
    if (bluetoothCharacteristic) {
        try {
            let encoder = new TextEncoder('utf-8');
            let data = encoder.encode(`${key}:${state}\n`);
            bluetoothCharacteristic.writeValue(data);
        } catch (e) { console.error(e); }
    }
}

// 12. SMART TEMA ENGINE DİNAMİKLERİ
bgColorPicker.addEventListener('input', e => {
    config.bgColor = e.target.value; document.body.style.backgroundColor = config.bgColor;
    let b = bgColorPicker.value.replace('#','');
    let brightness = (parseInt(b.substring(0,2),16)*299 + parseInt(b.substring(2,4),16)*587 + parseInt(b.substring(4,6),16)*114)/1000;
    if(brightness < 50) { targetMode="DARK"; document.getElementById('confirm-message').innerText="Koyu arka plan algılandı. Butonlar optimize edilsin mi?"; document.getElementById('custom-confirm').classList.remove('hidden'); }
});
document.getElementById('confirm-yes').addEventListener('click', () => { if(targetMode==="DARK") { config.btnColor="#ffffff"; config.textColor="#000000"; btnColorPicker.value="#ffffff"; textColorPicker.value="#000000"; } document.querySelectorAll('.custom-btn').forEach(b => { b.style.backgroundColor=config.btnColor; b.style.color=config.textColor; }); document.getElementById('custom-confirm').classList.add('hidden'); });
document.getElementById('confirm-no').addEventListener('click', () => document.getElementById('custom-confirm').classList.add('hidden'));
settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));
