const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const DATA_FILE = path.join(__dirname, '../data/houses.json');

app.use(cors());
app.use(express.json());

// البيانات الافتراضية في حال تشغيل المشروع لأول مرة
const DEFAULT_DATA = {
  places: [
    { id: 'ps', name: 'فلسطين', flag: '🇵🇸', lat: 31.9522, lng: 35.2332, count: 1250 },
    { id: 'jo', name: 'الأردن', flag: '🇯🇴', lat: 31.9454, lng: 35.9284, count: 840 },
    { id: 'eg', name: 'مصر', flag: '🇪🇬', lat: 26.8206, lng: 30.8025, count: 2100 },
    { id: 'ma', name: 'المغرب', flag: '🇲🇦', lat: 31.7917, lng: -7.0926, count: 960 },
    { id: 'iq', name: 'العراق', flag: '🇮🇶', lat: 33.2232, lng: 43.6793, count: 540 },
    { id: 'sa', name: 'السعودية', flag: '🇸🇦', lat: 23.8859, lng: 45.0792, count: 720 },
    { id: 'dz', name: 'الجزائر', flag: '🇩🇿', lat: 28.0339, lng: 1.6596, count: 430 }
  ],
  logs: []
};

// دالة لقراءة البيانات المخزنة
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    return DEFAULT_DATA;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_DATA;
  }
}

// دالة لحفظ البيانات
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 1. رابط جلب قائمة الدول والبيوت
app.get('/api/places', (req, res) => {
  const data = loadData();
  res.json({ success: true, places: data.places });
});

// 2. رابط إضافة بيت جديد لشخص
app.post('/api/houses', (req, res) => {
  const { username, country } = req.body;
  if (!username || !country) {
    return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
  }

  const data = loadData();
  const targetPlace = data.places.find(p => p.name === country);

  if (targetPlace) {
    targetPlace.count += 1;
  } else {
    // إذا دولة مش موجودة بنضيفها مباشرة
    data.places.push({
      id: country.toLowerCase().slice(0, 3),
      name: country,
      flag: '📍',
      lat: 25.0,
      lng: 40.0,
      count: 1
    });
  }

  data.logs.push({
    username,
    country,
    createdAt: new Date().toISOString()
  });

  saveData(data);
  res.json({ success: true, message: 'تم بناء البيت بنجاح!', places: data.places });
});

app.listen(PORT, () => {
  console.log(`🚀 سرفر الباك إند شغال تمام على: http://localhost:${PORT}`);
});
