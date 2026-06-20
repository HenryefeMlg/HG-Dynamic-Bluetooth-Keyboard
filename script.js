let selectedKey = "";
let bluetoothDevice = null;
let bluetoothCharacteristic = null;
let isTouchpadding = false;
let lastX = 0, lastY = 0;
let hasMoved = false;

// Akıllı Hedef Renk Modu (Koyu/Açık algılama modu saklama)
let targetMode = ""; 

let config = {
    bgColor: "#121214",
    btnColor: "#00e676",
    textColor: "#121214",
    fontFamily: "sans-serif",
    touchpadAction: "MOUSE_LEFT",
    sensitivity: 1.5,
    elements: []
};

// DOM Elemanları
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const keyInput = document.getElementById('key-input');
const consoleKeySelect = document.getElementById('console-key-select');
const addButtonBtn = document.getElementById('add-button-btn');
const addNormalJoyBtn = document.getElementById('add-normal-joy-btn');
const addWasdJoyBtn = document.getElementById('add-wasd-joy-btn');
const gamepadArea = document.getElementById('gamepad-area');
const infoText = document.getElementById('info-text');
const connectBtBtn = document.getElementById('connect-bt-btn');
const btStatus = document.getElementById('bt-status');
const touchpadActionSelect = document.getElementById('touchpad-action');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const sensitivityValue = document.getElementById('sensitivity-value');

// Renk / Görünüm Elemanları
const bgColorPicker = document.getElementById('bg-color-picker');
const btnColorPicker = document.getElementById('btn-color-picker');
const textColorPicker = document.getElementById('text-color-picker');
const fontSelect = document.getElementById('font-select');
const saveLayoutBtn = document.getElementById('save-layout-btn');
const clearLayoutBtn = document.getElementById('clear-layout-btn');

// Popup Elemanları
const customConfirm = document.getElementById('custom-confirm');
const confirmMessage = document.getElementById('confirm-message');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

// SAYFA YÜKLENİRKEN HAFIZADAN OKUMA
window.addEventListener('DOMContentLoaded', () => {
    const savedConfig = localStorage.getItem('gamepad_smart_theme');
    if (savedConfig) {
        config = JSON.parse(savedConfig);
        
        document.body.style.backgroundColor = config.bgColor;
        bgColorPicker.value = config.bgColor;
        btnColorPicker.value = config.btnColor;
        textColorPicker.value = config.textColor;
        fontSelect.value = config.fontFamily;
        touchpadActionSelect.value = config.touchpadAction;
        sensitivitySlider.value = config.sensitivity;
        sensitivityValue.innerText = parseFloat(config.sensitivity).toFixed(1) + "x";

        if (config.elements.length > 0) {
            infoText.style.display = 'none';
            config.elements.forEach(el => {
                if (el.type === 'button') {
                    createButtonElement(el.key, el.left, el.top, el.width, el.height);
                } else if (el.type === 'joystick-normal' || el.type === 'joystick-wasd') {
                    createJoystickElement(el.type, el.left, el.top, el.width);
                }
            });
        }
    }
});

// ÇİFT YÖNLÜ AKILLI TEMA MOTORU
bgColorPicker.addEventListener('input', e => {
    config.bgColor = e.target.value;
    document.body.style.backgroundColor = config.bgColor;

    let brightness = getColorBrightness(config.bgColor);

    if (brightness < 50) { 
        // 1. Durum: Arka plan KOYU (Siyaha Yakın)
        targetMode = "DARK_BG";
        confirmMessage.innerText = "Arka plan rengi KOYU seçildi. Butonlar otomatik olarak BEYAZ, içindeki yazılar SİYAH yapılsın mı?";
        customConfirm.classList.remove('hidden');
    } else if (brightness > 200) { 
        // 2. Durum: Arka plan AÇIK (Beyaza Yakın)
        targetMode = "LIGHT_BG";
        confirmMessage.innerText = "Arka plan rengi AÇIK seçildi. Butonlar otomatik olarak SİYAH, içindeki yazılar BEYAZ yapılsın mı?";
        customConfirm.classList.remove('hidden');
    }
});

// Onay Modalı -> "Evet, Ayarla"
confirmYes.addEventListener('click', () => {
    if (targetMode === "DARK_BG") {
        config.btnColor = "#ffffff"; // Beyaz buton
        config.textColor = "#000000"; // Siyah yazı
    } else if (targetMode === "LIGHT_BG") {
        config.btnColor = "#000000"; // Siyah buton
        config.textColor = "#ffffff"; // Beyaz yazı
    }
    
    btnColorPicker.value = config.btnColor;
    textColorPicker.value = config.textColor;
    
    applyLiveGlobalStyles();
    customConfirm.classList.add('hidden');
});

// Onay Modalı -> "Hayır, Kalsın"
confirmNo.addEventListener('click', () => {
    customConfirm.classList.add('hidden');
});

// Kullanıcı renk seçicileri elle kurcalarsa
btnColorPicker.addEventListener('input', e => { config.btnColor = e.target.value; applyLiveGlobalStyles(); });
textColorPicker.addEventListener('input', e => { config.textColor = e.target.value; applyLiveGlobalStyles(); });

function applyLiveGlobalStyles() {
    document.querySelectorAll('.custom-btn').forEach(btn => {
        btn.style.backgroundColor = config.btnColor;
        btn.style.borderColor = config.btnColor;
        btn.style.color = config.textColor;
    });
}

// Parlaklık Yoğunluğu Ölçüm Fonksiyonu (0 - 255 arası değer döner)
function getColorBrightness(hex) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

fontSelect.addEventListener('change', e => { config.fontFamily = e.target.value; document.querySelectorAll('.custom-btn').forEach(b => b.style.fontFamily = config.fontFamily); });
sensitivitySlider.addEventListener('input', e => { config.sensitivity = parseFloat(e.target.value); sensitivityValue.innerText = config.sensitivity.toFixed(1) + "x"; });
touchpadActionSelect.addEventListener('change', e => config.touchpadAction = e.target.value);
consoleKeySelect.addEventListener('change', e => { if(e.target.value) { selectedKey = e.target.value; keyInput.value = "Konsol: " + selectedKey; } });

// GİRİŞ ALANLARI DİNLEMESİ
keyInput.addEventListener('mousedown', e => { e.preventDefault(); consoleKeySelect.value=""; if (e.button===0) selectedKey="Mouse Sol Tık"; if (e.button===1) selectedKey="Mouse Orta Tık"; if (e.button===2) selectedKey="Mouse Sağ Tık"; keyInput.value=selectedKey; });
keyInput.addEventListener('wheel', e => { e.preventDefault(); selectedKey = e.deltaY < 0 ? "Mouse Tekerlek Yukarı" : "Mouse Tekerlek Aşağı"; keyInput.value = selectedKey; });
window.addEventListener('keydown', e => { if (document.activeElement === keyInput || !settingsPanel.classList.contains('hidden')) { e.preventDefault(); consoleKeySelect.value=""; selectedKey = e.key.toUpperCase(); if (selectedKey === " ") selectedKey = "SPACE"; keyInput.value = selectedKey; } });
settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));

// TOUCHPAD FARE MOTORU
gamepadArea.addEventListener('pointerdown', e => { if (e.target === gamepadArea || e.target === infoText) { isTouchpadding = true; hasMoved = false; lastX = e.clientX; lastY = e.clientY; gamepadArea.setPointerCapture(e.pointerId); } });
gamepadArea.addEventListener('pointermove', e => { if (!isTouchpadding) return; let dx = Math.round((e.clientX - lastX) * config.sensitivity); let dy = Math.round((e.clientY - lastY) * config.sensitivity); if (Math.abs(dx) > 0 || Math.abs(dy) > 0) { hasMoved = true; sendBluetoothData("MOUSE_MOVE", `${dx},${dy}`); } lastX = e.clientX; lastY = e.clientY; });
gamepadArea.addEventListener('pointerup', e => { if (!isTouchpadding) return; isTouchpadding = false; gamepadArea.releasePointerCapture(e.pointerId); if (!hasMoved && config.touchpadAction !== "NONE") sendBluetoothData(config.touchpadAction, "TIKLANDI"); });

// EKLEME MOTORLARI
addButtonBtn.addEventListener('click', () => { if (!selectedKey) return alert("Tuş seçin!"); infoText.style.display = 'none'; createButtonElement(selectedKey, '150px', '150px', '80px', '80px'); settingsPanel.classList.add('hidden'); });
addNormalJoyBtn.addEventListener('click', () => { infoText.style.display = 'none'; createJoystickElement('joystick-normal', '50px', '200px', '120px'); settingsPanel.classList.add('hidden'); });
addWasdJoyBtn.addEventListener('click', () => { infoText.style.display = 'none'; createJoystickElement('joystick-wasd', '250px', '200px', '120px'); settingsPanel.classList.add('hidden'); });

// ELEMENT FABRİKALARI
function createButtonElement(keyName, left, top, width, height) {
    const btn = document.createElement('div');
    btn.className = 'custom-btn';
    btn.innerText = keyName;
    btn.style.left = left; btn.style.top = top; btn.style.width = width; btn.style.height = height;
    btn.style.fontFamily = config.fontFamily;
    btn.style.backgroundColor = config.btnColor;
    btn.style.borderColor = config.btnColor;
    btn.style.color = config.textColor;

    btn.dataset.key = keyName;
    btn.dataset.type = 'button';

    const handle = document.createElement('div'); handle.className = 'resize-handle'; btn.appendChild(handle);
    gamepadArea.appendChild(btn);
    makeElementInteractive(btn, handle);
}

function createJoystickElement(type, left, top, size) {
    const joy = document.createElement('div');
    joy.className = `custom-joystick ${type === 'joystick-wasd' ? 'wasd-type' : ''}`;
    joy.style.left = left; joy.style.top = top; joy.style.width = size; joy.style.height = size;
    joy.dataset.type = type;

    const knob = document.createElement('div'); knob.className = 'joystick-knob'; joy.appendChild(knob);
    const handle = document.createElement('div'); handle.className = 'resize-handle'; joy.appendChild(handle);
    gamepadArea.appendChild(joy);
    
    setupJoystickLogic(joy, knob, handle, type);
}

// JOYSTICK DİNAMİKLERİ
function setupJoystickLogic(joy, knob, handle, type) {
    let isDragging = false, isResizing = false; let startX, startSize; let activeKeys = { W: false, A: false, S: false, D: false };
    joy.addEventListener('pointerdown', e => { if (e.target === handle) { isResizing = true; startX = e.clientX; startSize = parseInt(joy.style.width); e.stopPropagation(); } else { isDragging = true; joy.setPointerCapture(e.pointerId); e.stopPropagation(); } });
    joy.addEventListener('pointermove', e => {
        if (isResizing) { let n = startSize + (e.clientX - startX); if (n > 80 && n < 250) { joy.style.width = n+'px'; joy.style.height = n+'px'; } return; }
        if (!isDragging) return;
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
    joy.addEventListener('pointerup', () => { isDragging = false; isResizing = false; knob.style.left = '50%'; knob.style.top = '50%'; if (type === 'joystick-normal') { sendBluetoothData("JOY1_MOVE", "0,0"); } else { ['W', 'A', 'S', 'D'].forEach(k => { if (activeKeys[k]) { sendBluetoothData(k, "BIRAKILDI"); activeKeys[k] = false; } }); } });
}

// SÜRÜKLE BIRAK SİSTEMİ
function makeElementInteractive(el, handle) {
    let isDragging = false, isResizing = false; let startX, startY, startWidth, startHeight;
    el.addEventListener('pointerdown', e => { if (e.target === handle) { isResizing = true; startX = e.clientX; startY = e.clientY; startWidth = parseInt(document.defaultView.getComputedStyle(el).width); startHeight = parseInt(document.defaultView.getComputedStyle(el).height); e.stopPropagation(); } else { isDragging = true; startX = e.clientX - el.offsetLeft; startY = e.clientY - el.offsetTop; sendBluetoothData(el.dataset.key, "BASILDI"); e.stopPropagation(); } el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (isDragging) { el.style.left = (e.clientX - startX) + 'px'; el.style.top = (e.clientY - startY) + 'px'; } else if (isResizing) { let n = startWidth + (e.clientX - startX); if (n > 50 && n < 300) { el.style.width = n+'px'; el.style.height = n+'px'; } } });
    el.addEventListener('pointerup', e => { if (isDragging) sendBluetoothData(el.dataset.key, "BIRAKILDI"); isDragging = false; isResizing = false; el.releasePointerCapture(e.pointerId); });
}

// HAFIZA SİSTEMLERİ (LOCALSTORAGE)
saveLayoutBtn.addEventListener('click', () => {
    config.elements = [];
    document.querySelectorAll('.custom-btn, .custom-joystick').forEach(el => {
        config.elements.push({
            type: el.dataset.type,
            key: el.dataset.key || '',
            left: el.style.left,
            top: el.style.top,
            width: el.style.width,
            height: el.style.height || el.style.width
        });
    });
    localStorage.setItem('gamepad_smart_theme', JSON.stringify(config));
    alert("Tüm yerleşim planı, akıllı tema renkleri ve fontlar başarıyla kaydedildi!");
});

clearLayoutBtn.addEventListener('click', () => { if (confirm("Hafıza temizlensin mi?")) { localStorage.removeItem('gamepad_smart_theme'); location.reload(); } });

// BLUETOOTH
connectBtBtn.addEventListener('click', async () => {
    try {
        btStatus.innerText = "Aranıyor...";
        bluetoothDevice = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['battery_service'] });
        await bluetoothDevice.gatt.connect();
        btStatus.innerText = "Bağlandı!"; btStatus.style.color = "#00e676";
    } catch (error) { btStatus.innerText = "Hata!"; btStatus.style.color = "#ef4444"; }
});

function sendBluetoothData(key, state) {
    console.log(`Paket -> ${key}:${state}`);
    if (bluetoothCharacteristic) {
        let encoder = new TextEncoder('utf-8');
        let data = encoder.encode(`${key}:${state}\n`);
        bluetoothCharacteristic.writeValue(data);
    }
}