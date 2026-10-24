import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';

const API_URL = '';

const FOUNDER_HOUSE = {
  id: 'founder_basim',
  username: 'مقر المؤسس: باسم',
  country: 'فلسطين',
  lat: 31.9522,
  lng: 35.2332,
  isFounder: true
};

export default function App() {
  const globeRef = useRef();
  const [places, setPlaces] = useState([]);
  const [allHouses, setAllHouses] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [founderModalOpen, setFounderModalOpen] = useState(false);

  // لوحة إدارة باسم
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newCountry, setNewCountry] = useState('فلسطين');
  const [adminLoading, setAdminLoading] = useState(false);

  // البحث والتعديل
  const [searchTerm, setSearchTerm] = useState('');
  const [editingHouseId, setEditingHouseId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editCountry, setEditCountry] = useState('');

  const fetchPlaces = async () => {
    try {
      const res = await fetch(`${API_URL}/api/places`);
      const data = await res.json();
      if (data.success) {
        setPlaces(data.places);
        setAllHouses(data.houses || []);
      }
    } catch (err) {
      console.error('خطأ في جلب البيانات:', err);
    }
  };

  useEffect(() => {
    fetchPlaces();

    if (globeRef.current) {
      // تمركز أولي مباشر فوق فلسطين والوطن العربي
      globeRef.current.pointOfView({ lat: 26.0, lng: 38.0, altitude: 2.1 }, 1000);
      globeRef.current.controls().autoRotate = false;
      globeRef.current.controls().enableDamping = true;
    }
  }, []);

  const totalHouses = allHouses.length;

  // الطيران التفاعلي لعمق الدولة
  const handleCountryClick = (place) => {
    setSelectedCountry(place);
    setSelectedHouse(null);

    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: place.lat, lng: place.lng, altitude: 0.42 }, 1400);
    }
  };

  // العودة للمشهد العام
  const handleResetView = () => {
    setSelectedCountry(null);
    setSelectedHouse(null);

    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 26.0, lng: 38.0, altitude: 2.1 }, 1200);
    }
  };

  // إعداد عناصر الخريطة
  const getDisplayMarkers = () => {
    if (!selectedCountry) {
      return [...places, FOUNDER_HOUSE];
    }

    const countryHouses = allHouses.filter(h => h.country === selectedCountry.name);

    const individualHouseMarkers = countryHouses.map((house, idx) => {
      const radius = 0.35 + (idx * 0.16);
      const angle = idx * 2.39996;
      const latOffset = Math.sin(angle) * radius;
      const lngOffset = Math.cos(angle) * (radius / Math.cos(selectedCountry.lat * (Math.PI / 180)));

      return {
        id: `house_${house.id}`,
        username: house.username,
        country: house.country,
        createdAt: house.createdAt,
        lat: selectedCountry.lat + latOffset,
        lng: selectedCountry.lng + lngOffset,
        isHouse: true
      };
    });

    const currentCountryLabel = {
      ...selectedCountry,
      isCenterLabel: true
    };

    if (selectedCountry.name === 'فلسطين') {
      return [currentCountryLabel, FOUNDER_HOUSE, ...individualHouseMarkers];
    }

    return [currentCountryLabel, ...individualHouseMarkers];
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminAuth(true);
        setAllHouses(data.houses);
        setPlaces(data.places);
      } else {
        alert('كلمة المرور غير صحيحة!');
      }
    } catch (err) {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setAdminLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/add-house`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, username: newUsername, country: newCountry })
      });
      const data = await res.json();
      if (data.success) {
        setPlaces(data.places);
        setAllHouses(data.houses);
        setNewUsername('');
        alert(`تم اعتماد وبناء بيت ${newUsername} في ${newCountry}!`);
      }
    } catch (err) {
      alert('فشل إضافة المشارك');
    } finally {
      setAdminLoading(false);
    }
  };

  const startEdit = (house) => {
    setEditingHouseId(house.id);
    setEditUsername(house.username);
    setEditCountry(house.country);
  };

  const handleSaveEdit = async (id) => {
    if (!editUsername.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/edit-house`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPass,
          id,
          newUsername: editUsername,
          newCountry: editCountry
        })
      });
      const data = await res.json();
      if (data.success) {
        setAllHouses(data.houses);
        setPlaces(data.places);
        setEditingHouseId(null);
      } else {
        alert('فشل تعديل البيانات');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handleDeleteHouse = async (house) => {
    if (!confirm(`هل أنت متأكد من حذف بيت ${house.username} في ${house.country}؟`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/delete-house`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass, id: house.id, country: house.country })
      });
      const data = await res.json();
      if (data.success) {
        setAllHouses(data.houses);
        setPlaces(data.places);
      }
    } catch (err) {
      alert('فشل الحذف');
    }
  };

  const handleJumpToHouse = (house) => {
    const targetCountry = places.find(p => p.name === house.country);
    if (targetCountry) {
      setAdminModalOpen(false);
      handleCountryClick(targetCountry);
    }
  };

  const filteredHouses = allHouses.filter(h =>
    h.username.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    h.country.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const activeCountryHouses = selectedCountry 
    ? allHouses.filter(h => h.country === selectedCountry.name) 
    : [];

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden', background: '#090d16' }}>
      
      {/* 1. العداد العلوي بتصميم زجاجي عصري */}
      <div style={{
        position: 'fixed', top: 14, left: 14, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '8px 18px', borderRadius: '30px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontWeight: 'bold', fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <span>🌍 عالمنا</span>
        <span style={{ color: '#38bdf8' }}>{totalHouses} بيوت مبنية</span>
      </div>

      {/* زر العودة للمشهد العام */}
      {selectedCountry && (
        <button
          onClick={handleResetView}
          style={{
            position: 'fixed', top: 14, right: 14, zIndex: 9999,
            background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '9px 18px', borderRadius: '30px', fontWeight: 'bold',
            fontSize: '12px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(2, 132, 199, 0.5)',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <span>⬅️</span>
          <span>الرجوع للمشهد العام</span>
        </button>
      )}

      {/* عنوان الدولة المفتوحة */}
      {selectedCountry && (
        <div style={{
          position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 9990,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)',
          color: '#ffffff', padding: '8px 20px', borderRadius: '25px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.5)', fontSize: '14px', fontWeight: 'bold',
          whiteSpace: 'nowrap', border: '1px solid #38bdf8'
        }}>
          {selectedCountry.flag} بيوت {selectedCountry.name} ({activeCountryHouses.length}) 🏡
        </div>
      )}

      {/* 2. شريط التصفح السريع للدول بالأسفل */}
      <div style={{
        position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 9990,
        display: 'flex', gap: '8px', overflowX: 'auto', padding: '6px 14px',
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none'
      }}>
        {places.map((p) => {
          const isSelected = selectedCountry?.name === p.name;
          return (
            <button
              key={p.id}
              onClick={() => handleCountryClick(p)}
              style={{
                flexShrink: 0,
                background: isSelected ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(10px)',
                color: '#ffffff',
                border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                padding: '8px 14px', borderRadius: '22px', fontSize: '12px',
                fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <span>{p.flag}</span>
              <span>{p.name}</span>
              <span style={{
                background: isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                padding: '2px 7px', borderRadius: '12px', fontSize: '11px', color: '#38bdf8'
              }}>
                {p.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. شريط باسم السفلي الثابت */}
      <div style={{
        position: 'fixed', bottom: 12, left: 14, right: 14, zIndex: 9999,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
      }}>
        <div 
          onClick={() => {
            globeRef.current?.pointOfView({ lat: 31.9522, lng: 35.2332, altitude: 0.6 }, 1000);
            setFounderModalOpen(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid #facc15', padding: '8px 16px', borderRadius: '25px',
            boxShadow: '0 4px 18px rgba(250, 204, 21, 0.3)', fontSize: '12px',
            color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          👑 المؤسس: <span style={{ color: '#facc15' }}>باسم | Basim</span>
        </div>

        <button
          onClick={() => setAdminModalOpen(true)}
          style={{
            background: '#0f172a', color: '#facc15', border: '1px solid #facc15',
            padding: '8px 16px', borderRadius: '25px', fontWeight: 'bold',
            fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap'
          }}
        >
          🛡️ لوحة إدارة باسم
        </button>
      </div>

      {/* بطاقة البيت الفردي */}
      {selectedHouse && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            padding: '24px', borderRadius: '24px', width: '100%', maxWidth: '340px',
            textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
            border: '2px solid #38bdf8', position: 'relative', color: '#ffffff'
          }}>
            <button
              onClick={() => setSelectedHouse(null)}
              style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
            >
              ✕
            </button>

            <div style={{ fontSize: '46px', marginBottom: '8px', filter: 'drop-shadow(0 0 12px #38bdf8)' }}>🏡</div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#38bdf8' }}>{selectedHouse.username}</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>
              مالك البيت المعتمد في <strong>{selectedHouse.country}</strong>
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px', padding: '14px', textAlign: 'right', fontSize: '12px', lineHeight: '1.8', color: '#e2e8f0', marginBottom: '16px'
            }}>
              <div>✓ <strong>حالة الاعتماد:</strong> <span style={{ color: '#34d399', fontWeight: 'bold' }}>موثق في المنصة</span></div>
              <div>📅 <strong>تاريخ الاعتماد:</strong> {new Date(selectedHouse.createdAt).toLocaleDateString('ar')}</div>
              <div>👑 <strong>إشراف المؤسس:</strong> باسم | Basim</div>
            </div>

            <button
              onClick={() => setSelectedHouse(null)}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white',
                border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold',
                cursor: 'pointer', width: '100%', fontSize: '14px', boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* تفاصيل المؤسس باسم */}
      {founderModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            padding: '26px', borderRadius: '24px', maxWidth: '340px', width: '100%',
            textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
            border: '2px solid #facc15', color: '#ffffff'
          }}>
            <div style={{ fontSize: '42px', marginBottom: '8px', filter: 'drop-shadow(0 0 15px #facc15)' }}>👑 🇵🇸</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#facc15' }}>مقر المؤسس: باسم</h3>
            <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.7', margin: '0 0 18px 0' }}>
              صاحب الفكرة ومطور منصة "عالمنا". منصة تجمع بيوت الأصدقاء والداعمين الحقيقيين على خريطة حية ثلاثية الأبعاد بإشرافه واعتماده الحصري.
            </p>
            <button
              onClick={() => setFounderModalOpen(false)}
              style={{
                background: '#0f172a', color: '#facc15', border: '1px solid #facc15',
                padding: '11px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%'
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* لوحة تحكم وإدارة باسم */}
      {adminModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)', zIndex: 10000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', padding: '22px', borderTopLeftRadius: '26px', borderTopRightRadius: '26px',
            width: '100%', maxWidth: '520px', maxHeight: '90dvh', overflowY: 'auto',
            boxShadow: '0 -15px 45px rgba(0,0,0,0.5)', position: 'relative'
          }}>
            <button
              onClick={() => { setAdminModalOpen(false); setEditingHouseId(null); setSearchTerm(''); }}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}
            >
              ✕
            </button>

            {!isAdminAuth ? (
              <form onSubmit={handleAdminLogin} style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '38px', marginBottom: '8px' }}>🛡️</div>
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>لوحة إدارة باسم</h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '14px' }}>أدخل كلمة السر الخاصة بك للإدارة</p>
                <input
                  type="password"
                  required
                  placeholder="كلمة السر..."
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '14px', fontSize: '16px' }}
                />
                <button
                  type="submit"
                  disabled={adminLoading}
                  style={{ width: '100%', background: '#0f172a', color: '#facc15', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
                >
                  {adminLoading ? 'جاري التحقق...' : 'دخول اللوحة 🔐'}
                </button>
              </form>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '17px' }}>إضافة بيت مشارك جديد ➕</h3>
                <form onSubmit={handleAddPerson} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>اسم الشخص أو حسابه:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: @ahmed"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>الدولة:</label>
                    <select
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    >
                      {places.map((p) => (
                        <option key={p.id} value={p.name}>{p.flag} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={adminLoading}
                    style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                  >
                    {adminLoading ? 'جاري البناء...' : 'اعتماد وبناء البيت 🏡'}
                  </button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#0f172a', fontSize: '15px' }}>البيوت المسجلة ({allHouses.length})</h4>
                  {searchTerm && (
                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 'bold' }}>
                      (المطابق: {filteredHouses.length})
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="🔍 بحث سريع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '14px'
                  }}
                />

                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredHouses.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '13px' }}>
                      لا توجد نتائج
                    </div>
                  ) : (
                    filteredHouses.map((h) => (
                      <div key={h.id} style={{
                        padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0'
                      }}>
                        {editingHouseId === h.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #0284c7', fontSize: '14px' }}
                            />
                            <select
                              value={editCountry}
                              onChange={(e) => setEditCountry(e.target.value)}
                              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #0284c7', fontSize: '14px' }}
                            >
                              {places.map((p) => (
                                <option key={p.id} value={p.name}>{p.flag} {p.name}</option>
                              ))}
                            </select>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleSaveEdit(h.id)}
                                style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                              >
                                حفظ ✓
                              </button>
                              <button
                                onClick={() => setEditingHouseId(null)}
                                style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <strong style={{ color: '#1e293b', fontSize: '13px' }}>🏡 {h.username}</strong>
                              <span style={{ color: '#64748b', fontSize: '11px', marginRight: '6px' }}>({h.country})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                onClick={() => handleJumpToHouse(h)}
                                style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                📍
                              </button>
                              <button
                                onClick={() => startEdit(h)}
                                style={{ background: '#f1f5f9', color: '#0284c7', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteHouse(h)}
                                style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* الكرة الأرضية بمحرك مربعات عالي الدقة (بدون أي بكسلة) */}
      <Globe
        ref={globeRef}
        backgroundColor="#090d16"
        globeTileEngineUrl={(x, y, l) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`}
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.15}
        htmlElementsData={getDisplayMarkers()}
        htmlElement={(d) => {
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'pointer';
          el.style.userSelect = 'none';

          // 1. بيت المؤسس باسم الذهبي
          if (d.isFounder) {
            el.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
                <div style="
                  background: linear-gradient(135deg, #f59e0b, #d97706);
                  color: #ffffff; padding: 6px 14px; border-radius: 20px;
                  font-weight: bold; font-size: 12px; border: 2px solid #ffffff;
                  box-shadow: 0 0 20px #f59e0b, 0 0 35px #fbbf24; white-space: nowrap;
                  display: flex; align-items: center; gap: 6px;
                ">
                  <span>👑</span> <span>${d.username}</span>
                </div>
                <div style="width: 2px; height: 12px; background: #fbbf24; box-shadow: 0 0 8px #fbbf24;"></div>
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 10px #fbbf24;"></div>
              </div>
            `;
            el.onclick = () => {
              globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.6 }, 1000);
              setFounderModalOpen(true);
            };
          } 
          // 2. بيوت المشاركين (شكل بيت مجسم مع نبض ضوئي)
          else if (d.isHouse) {
            el.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
                <div style="
                  background: linear-gradient(135deg, #0284c7, #0369a1);
                  color: #ffffff; padding: 6px 12px; border-radius: 18px;
                  font-weight: bold; font-size: 12px; border: 2px solid #38bdf8;
                  box-shadow: 0 0 18px rgba(56, 189, 248, 0.8); white-space: nowrap;
                  display: flex; align-items: center; gap: 5px;
                ">
                  <span>🏡</span> <span>${d.username}</span>
                </div>
                <div style="width: 2px; height: 10px; background: #38bdf8; box-shadow: 0 0 6px #38bdf8;"></div>
                <div style="width: 7px; height: 7px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 10px #38bdf8;"></div>
              </div>
            `;
            el.onclick = () => {
              setSelectedHouse(d);
              globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.3 }, 800);
            };
          } 
          // 3. شارة مركز الدولة عند فتحها
          else if (d.isCenterLabel) {
            el.innerHTML = `
              <div style="
                background: rgba(15, 23, 42, 0.9); color: #f8fafc;
                border: 2px solid #38bdf8; padding: 6px 14px; border-radius: 20px;
                font-weight: bold; font-size: 13px; transform: translate(-50%, -50%);
                box-shadow: 0 0 16px rgba(56, 189, 248, 0.5); white-space: nowrap;
              ">
                ${d.flag} ${d.name}
              </div>
            `;
          } 
          // 4. شارات الدول في المشهد العام
          else {
            el.innerHTML = `
              <div style="
                background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
                color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 6px 12px; border-radius: 20px; font-weight: bold;
                font-size: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);
                transform: translate(-50%, -50%); white-space: nowrap;
                display: flex; align-items: center; gap: 6px;
              ">
                <span>${d.flag}</span>
                <span>${d.name}</span>
                <span style="color: #38bdf8; font-weight: bold;">(${d.count})</span>
                <span>🏠</span>
              </div>
            `;
            el.onclick = () => handleCountryClick(d);
          }

          return el;
        }}
      />
    </div>
  );
}
