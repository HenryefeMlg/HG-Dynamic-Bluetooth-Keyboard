let bluetoothDevice = null;
let bluetoothCharacteristic = null;
let isTouchpadding = false;
let lastX = 0, lastY = 0;
let hasMoved = false;
let targetMode = ""; 

// DÜZENLEME MODU DURUMU
let isEditMode = false;

let config = {
    bgColor: "#121214",
    btnColor: "#00e676",
    textColor: "#121214",
    fontFamily: "sans-serif",
    touchpadAction: "MOUSE_LEFT",
    sensitivity: 1.5,
    elements: []
};

// Standart BLE UART Servis UUID'leri (HC-05/06 benzeri modüller ve genel BLE servisleri için)
const UART_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb"; 
const UART_TX_CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

// DOM Elemanları
const lockBtn = document.getElementById('lock-btn');
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

// Renk / Görünüm
const bgColorPicker = document.getElementById('bg-color-picker');
const btnColorPicker = document.getElementById('btn-color-picker');
const textColorPicker = document.getElementById('text-color-picker');
const fontSelect = document.getElementById('font-select');
const saveLayoutBtn = document.getElementById('save-layout-btn');
const clearLayoutBtn = document.getElementById('clear-layout-btn');

// Popup
const customConfirm = document.getElementById('custom-confirm');
const confirmMessage = document.getElementById('confirm-message');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

// DÜZENLEME MODU AÇMA / KAPATMA
lockBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    if (isEditMode) {
        document.body.classList.add('edit-mode-on');
        lockBtn.classList.add('edit-active');
        lockBtn.innerText = "✏️ Düzenleme Açık";
    } else {
        document.body.classList.remove('edit-mode-on');
        lockBtn.classList.remove('edit-active');
        lockBtn.innerText = "🔒 Düzenleme Kapalı";
    }
});

// CİHAZ HAFIZASINI YÜKLEME
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

// KLAVYE ALANI SEÇİM YARDIMCISI
consoleKeySelect.addEventListener('change', e => {
    if(e.target.value) {
        keyInput.value = e.target.value;
    }
});

// ÇİFT YÖNLÜ SMART TEMA MOTORU
bgColorPicker.addEventListener('input', e => {
    config.bgColor = e.target.value;
    document.body.style.backgroundColor = config.bgColor;
    let brightness = getColorBrightness(config.bgColor);
    
    if (brightness < 50) { 
        targetMode = "DARK_BG";
        confirmMessage.innerText = "Arka plan rengi KOYU seçildi. Butonlar otomatik olarak BEYAZ, içindeki yazılar SİYAH yapılsın mı?";
        customConfirm.classList.remove('hidden');
    } else if (brightness > 200) { 
        targetMode = "LIGHT_BG";
        confirmMessage.innerText = "Arka plan rengi AÇIK seçildi. Butonlar otomatik olarak SİYAH, içindeki yazılar BEYAZ yapılsın mı?";
        customConfirm.classList.remove('hidden');
    }
});

confirmYes.addEventListener('click', () => {
    if (targetMode === "DARK_BG") { config.btnColor = "#ffffff"; config.textColor = "#000000"; } 
    else if (targetMode === "LIGHT_BG") { config.btnColor = "#000000"; config.textColor = "#ffffff"; }
    btnColorPicker.value = config.btnColor; textColorPicker.value = config.textColor;
    applyLiveGlobalStyles(); customConfirm.classList.add('hidden');
});
confirmNo.addEventListener('click', () => customConfirm.classList.add('hidden'));
btnColorPicker.addEventListener('input', e => { config.btnColor = e.target.value; applyLiveGlobalStyles(); });
textColorPicker.addEventListener('input', e => { config.textColor = e.target.value; applyLiveGlobalStyles(); });

function applyLiveGlobalStyles() {
    document.querySelectorAll('.custom-btn').forEach(btn => {
        btn.style.backgroundColor = config.btnColor;
        btn.style.borderColor = config.btnColor;
        btn.style.color = config.textColor;
    });
}
function getColorBrightness(hex) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

fontSelect.addEventListener('change', e => { config.fontFamily = e.target.value; document.querySelectorAll('.custom-btn').forEach(b => b.style.fontFamily = config.fontFamily); });
sensitivitySlider.addEventListener('input', e => { config.sensitivity = parseFloat(e.target.value); sensitivityValue.innerText = config.sensitivity.toFixed(1) + "x"; });
touchpadActionSelect.addEventListener('change', e => config.touchpadAction = e.target.value);

settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));

// FARE TOUCHPAD MOUSE MOTORU
gamepadArea.addEventListener('pointerdown', e => {
    if (isEditMode) return; 
    if (e.target === gamepadArea || e.target === infoText) { isTouchpadding = true; hasMoved = false; lastX = e.clientX; lastY = e.clientY; gamepadArea.setPointerCapture(e.pointerId); } 
});
gamepadArea.addEventListener('pointermove', e => { 
    if (!isTouchpadding || isEditMode) return; 
    let dx = Math.round((e.clientX - lastX) * config.sensitivity); let dy = Math.round((e.clientY - lastY) * config.sensitivity); 
    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) { hasMoved = true; sendBluetoothData("MOUSE_MOVE", `${dx},${dy}`); } 
    lastX = e.clientX; lastY = e.clientY; 
});
gamepadArea.addEventListener('pointerup', e => { if (!isTouchpadding) return; isTouchpadding = false; gamepadArea.releasePointerCapture(e.pointerId); if (!hasMoved && config.touchpadAction !== "NONE" && !isEditMode) sendBluetoothData(config.touchpadAction, "TIKLANDI"); });

// MODÜL EKLEME AKSİYONLARI
addButtonBtn.addEventListener('click', () => { 
    let finalKey = keyInput.value.trim();
    if (!finalKey) return alert("Lütfen bir tuş ismi yazın veya seçin!"); 
    infoText.style.display = 'none'; 
    createButtonElement(finalKey, '150px', '150px', '80px', '80px'); 
    settingsPanel.classList.add('hidden'); 
});
addNormalJoyBtn.addEventListener('click', () => { infoText.style.display = 'none'; createJoystickElement('joystick-normal', '50px', '200px', '120px'); settingsPanel.classList.add('hidden'); });
addWasdJoyBtn.addEventListener('click', () => { infoText.style.display = 'none'; createJoystickElement('joystick-wasd', '250px', '200px', '120px'); settingsPanel.classList.add('hidden'); });

// PINCH TO ZOOM & ÇİFT PARMAK AKILLI BOYUTLANDIRMA MOTORU
function makeElementFlexible(el) {
    let evCache = [];
    let prevDiff = -1;
    let startX = 0, startY = 0;
    let isDragging = false;

    el.addEventListener('pointerdown', e => {
        if (!isEditMode) {
            sendBluetoothData(el.dataset.key || "JOY", "BASILDI");
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

        for (let i = 0; i < evCache.length; i++) {
            if (e.pointerId == evCache[i].pointerId) { evCache[i] = e; break; }
        }

        // İKİ PARMAK BÜYÜTME/KÜÇÜLTME
        if (evCache.length === 2) {
            isDragging = false;
            let curDiff = Math.sqrt(Math.pow(evCache[0].clientX - evCache[1].clientX, 2) + Math.pow(evCache[0].clientY - evCache[1].clientY, 2));

            if (prevDiff > 0) {
                let currentSize = parseInt(el.style.width);
                let sizeChange = (curDiff - prevDiff) * 0.5; 
                let newSize = currentSize + sizeChange;
                
                if (newSize > 60 && newSize < 300) {
                    el.style.width = newSize + 'px';
                    el.style.height = newSize + 'px';
                }
            }
            prevDiff = curDiff;
        } 
        // TEK PARMAK TAŞIMA
        else if (evCache.length === 1 && isDragging) {
            el.style.left = (e.clientX - startX) + 'px';
            el.style.top = (e.clientY - startY) + 'px';
        }
    });

    const pointerUpHandler = e => {
        if (!isEditMode && el.dataset.type === 'button') {
            sendBluetoothData(el.dataset.key, "BIRAKILDI");
        }
        
        for (let i = 0; i < evCache.length; i++) {
            if (evCache[i].pointerId == e.pointerId) { evCache.splice(i, 1); break; }
        }
        if (evCache.length < 2) { prevDiff = -1; }
        if (evCache.length === 0) { isDragging = false; }
        el.releasePointerCapture(e.pointerId);
    };

    el.addEventListener('pointerup', pointerUpHandler);
    el.addEventListener('pointercancel', pointerUpHandler);
}

// ELEMENT ÜRETİM FABRİKALARI
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

    gamepadArea.appendChild(btn);
    makeElementFlexible(btn);
}

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

// JOYSTICK SİNYAL SÜRÜCÜSÜ
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

// LOCALSTORAGE HAFIZA SİSTEMLERİ
saveLayoutBtn.addEventListener('click', () => {
    config.elements = [];
    document.querySelectorAll('.custom-btn, .custom-joystick').forEach(el => {
        config.elements.push({
            type: el.dataset.type,
            key: el.dataset.key || '',
            left: el.style.left,
            top: el.style.top,
            width: el.style.width,
            height: el.style.width
        });
    });
    localStorage.setItem('gamepad_smart_theme', JSON.stringify(config));
    alert("Tüm yerleşim planı ve modüller başarıyla kaydedildi!");
});

clearLayoutBtn.addEventListener('click', () => { if (confirm("Hafıza temizlensin mi?")) { localStorage.removeItem('gamepad_smart_theme'); location.reload(); } });

// TAM KORUMALI VE DOĞRULANMIŞ WEB BLUETOOTH MOTORU (GÜNCELLENDİ)
connectBtBtn.addEventListener('click', async () => {
    try {
        btStatus.innerText = "Aranıyor...";
        btStatus.style.color = "#ff9800";

        // Adım 1: Cihazı tara ve seçtir (Tüm cihazları kabul et veya UART servisine izin ver)
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [UART_SERVICE_UUID]
        });

        btStatus.innerText = "Bağlanıyor...";
        
        // Adım 2: GATT Sunucusuna bağlan
        const server = await bluetoothDevice.gatt.connect();

        // Adım 3: UART Servisini yakala
        const service = await server.getPrimaryService(UART_SERVICE_UUID);

        // Adım 4: Veri göndereceğimiz TX Karakteristiğini yakala
        bluetoothCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);

        // Başarılı!
        btStatus.innerText = "Bağlandı!"; 
        btStatus.style.color = "#00e676";
        
        // Cihaz bağlantısı koparsa dinle ve durumunu güncelle
        bluetoothDevice.addEventListener('gattserverdisconnected', () => {
            btStatus.innerText = "Bağlantı Koptu";
            btStatus.style.color = "#ef4444";
            bluetoothCharacteristic = null;
        });

    } catch (error) { 
        console.error("Bluetooth hatası:", error);
        btStatus.innerText = "Hata!"; 
        btStatus.style.color = "#ef4444"; 
        bluetoothCharacteristic = null;
    }
});

// GÜVENLİ VERİ GÖNDERME KANALI
function sendBluetoothData(key, state) {
    console.log(`Paket -> ${key}:${state}`);
    // Eğer bağlantı kurulmuşsa veriyi byte dizisine çevirip gönder
    if (bluetoothCharacteristic) {
        try {
            let encoder = new TextEncoder('utf-8');
            let data = encoder.encode(`${key}:${state}\n`);
            bluetoothCharacteristic.writeValue(data);
        } catch (e) {
            console.error("Veri gönderilemedi:", e);
        }
    }
            }
