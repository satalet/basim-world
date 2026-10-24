import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';

const API_URL = '';

const FOUNDER_HOUSE = {
  id: 'founder_basim',
  name: 'مقر المؤسس: باسم',
  flag: '👑',
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
      // توجيه الكاميرا فوراً وثابتة فوق فلسطين والوطن العربي
      globeRef.current.pointOfView({ lat: 26.0, lng: 38.0, altitude: 2.1 }, 1000);
      globeRef.current.controls().autoRotate = false;
      globeRef.current.controls().enableDamping = true;
    }
  }, []);

  const totalHouses = allHouses.length;

  const handleCountryClick = (place) => {
    setSelectedCountry(place);
    setSelectedHouse(null);

    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: place.lat, lng: place.lng, altitude: 0.48 }, 1200);
    }
  };

  const handleResetView = () => {
    setSelectedCountry(null);
    setSelectedHouse(null);

    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 26.0, lng: 38.0, altitude: 2.1 }, 1200);
    }
  };

  const getDisplayMarkers = () => {
    if (!selectedCountry) {
      return [...places, FOUNDER_HOUSE];
    }

    const countryHouses = allHouses.filter(h => h.country === selectedCountry.name);

    const individualHouseMarkers = countryHouses.map((house, idx) => {
      const radius = 0.35 + (idx * 0.18);
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
    <div style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden', background: '#e0f2fe' }}>
      
      {/* 1. العداد العلوي - ثابت بـ fixed */}
      <div style={{
        position: 'fixed', top: 12, left: 12, zIndex: 9999,
        background: 'rgba(255,255,255,0.96)', padding: '8px 16px',
        borderRadius: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        fontWeight: 'bold', fontSize: '13px', color: '#1e293b'
      }}>
        🌍 عالمنا: <span style={{ color: '#0284c7' }}>{totalHouses}</span> بيوت 🏠
      </div>

      {/* زر العودة للمشهد العام */}
      {selectedCountry && (
        <button
          onClick={handleResetView}
          style={{
            position: 'fixed', top: 12, right: 12, zIndex: 9999,
            background: '#0f172a', color: '#f8fafc', border: '1px solid #38bdf8',
            padding: '8px 16px', borderRadius: '25px', fontWeight: 'bold',
            fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
        >
          <span>⬅️</span>
          <span>العودة للعام</span>
        </button>
      )}

      {/* عنوان الدولة المفتوحة */}
      {selectedCountry && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 9990,
          background: 'rgba(15, 23, 42, 0.92)', color: '#ffffff',
          padding: '6px 18px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
          fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid #38bdf8'
        }}>
          {selectedCountry.flag} بيوت {selectedCountry.name} ({activeCountryHouses.length}) 🏡
        </div>
      )}

      {/* 2. شريط الدول السريع المخصص للموبايل - فوق الأزرار السفلية مباشرة */}
      <div style={{
        position: 'fixed', bottom: 62, left: 0, right: 0, zIndex: 9990,
        display: 'flex', gap: '8px', overflowX: 'auto', padding: '6px 12px',
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
                background: isSelected ? '#0284c7' : 'rgba(255, 255, 255, 0.96)',
                color: isSelected ? '#ffffff' : '#1e293b',
                border: isSelected ? '2px solid #ffffff' : '1px solid #cbd5e1',
                padding: '7px 13px', borderRadius: '20px', fontSize: '12px',
                fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <span>{p.flag}</span>
              <span>{p.name}</span>
              <span style={{
                background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                padding: '2px 6px', borderRadius: '10px', fontSize: '11px'
              }}>
                {p.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. شريط باسم ولوحة التحكم - ثابت في أسفل الشاشة تماماً */}
      <div style={{
        position: 'fixed', bottom: 12, left: 12, right: 12, zIndex: 9999,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
      }}>
        {/* شارة المؤسس باسم */}
        <div 
          onClick={() => {
            globeRef.current?.pointOfView({ lat: 31.9522, lng: 35.2332, altitude: 0.8 }, 1000);
            setFounderModalOpen(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid #eab308', padding: '8px 14px', borderRadius: '25px',
            boxShadow: '0 4px 15px rgba(234, 179, 8, 0.35)', fontSize: '12px',
            color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          👑 المؤسس: <span style={{ color: '#facc15' }}>باسم | Basim</span>
        </div>

        {/* زر لوحة تحكم باسم */}
        <button
          onClick={() => setAdminModalOpen(true)}
          style={{
            background: '#0f172a', color: '#facc15', border: '1px solid #facc15',
            padding: '8px 16px', borderRadius: '25px', fontWeight: 'bold',
            fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
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
          background: 'rgba(15, 23, 42, 0.75)', zIndex: 10000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'white', padding: '22px', borderRadius: '20px',
            width: '100%', maxWidth: '340px', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '2px solid #38bdf8', position: 'relative'
          }}>
            <button
              onClick={() => setSelectedHouse(null)}
              style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
            >
              ✕
            </button>

            <div style={{ fontSize: '42px', marginBottom: '6px' }}>🏡</div>
            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '19px' }}>{selectedHouse.username}</h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 14px 0' }}>
              مالك البيت في <strong>{selectedHouse.country}</strong>
            </p>

            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px',
              padding: '12px', textAlign: 'right', fontSize: '12px', lineHeight: '1.7', color: '#334155', marginBottom: '14px'
            }}>
              <div>✓ <strong>حالة الاعتماد:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>معتمد وموثق</span></div>
              <div>📅 <strong>تاريخ البناء:</strong> {new Date(selectedHouse.createdAt).toLocaleDateString('ar')}</div>
              <div>👑 <strong>إشراف المؤسس:</strong> باسم | Basim</div>
            </div>

            <button
              onClick={() => setSelectedHouse(null)}
              style={{
                background: '#0f172a', color: 'white', border: 'none',
                padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '14px'
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
          background: 'rgba(0,0,0,0.65)', zIndex: 10000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '20px',
            maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            border: '2px solid #facc15'
          }}>
            <div style={{ fontSize: '38px', marginBottom: '8px' }}>👑 🇵🇸</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '18px' }}>مقر المؤسس: باسم</h3>
            <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6', margin: '0 0 14px 0' }}>
              صاحب الفكرة ومطور منصة "عالمنا". منصة توثق بيوت المشاركين الحقيقيين على الكرة الأرضية ثلاثية الأبعاد بإشرافه واعتماده المباشر.
            </p>
            <button
              onClick={() => setFounderModalOpen(false)}
              style={{
                background: '#0f172a', color: '#facc15', border: 'none',
                padding: '10px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%'
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
          background: 'rgba(15, 23, 42, 0.85)', zIndex: 10000, display: 'flex',
          alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '20px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            width: '100%', maxWidth: '500px', maxHeight: '90dvh', overflowY: 'auto',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.3)', position: 'relative'
          }}>
            <button
              onClick={() => { setAdminModalOpen(false); setEditingHouseId(null); setSearchTerm(''); }}
              style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '6px' }}
            >
              ✕
            </button>

            {!isAdminAuth ? (
              <form onSubmit={handleAdminLogin} style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛡️</div>
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

      {/* مجسم الكرة الأرضية */}
      <Globe
        ref={globeRef}
        backgroundColor="#e0f2fe"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        htmlElementsData={getDisplayMarkers()}
        htmlElement={(d) => {
          const el = document.createElement('div');
          el.className = 'marker-label';
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'pointer';
          el.style.userSelect = 'none';

          if (d.isFounder) {
            el.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            el.style.color = '#ffffff';
            el.style.border = '2px solid #ffffff';
            el.style.boxShadow = '0 0 16px #f59e0b, 0 0 25px #fbbf24';
            el.style.padding = '6px 12px';
            el.style.borderRadius = '20px';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '12px';
            el.innerHTML = `<span>👑</span> <span>${d.name}</span>`;
            el.onclick = () => {
              globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.8 }, 1000);
              setFounderModalOpen(true);
            };
          } else if (d.isHouse) {
            el.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
            el.style.color = '#ffffff';
            el.style.border = '2px solid #ffffff';
            el.style.boxShadow = '0 0 16px rgba(2, 132, 199, 0.9), 0 0 25px rgba(56, 189, 248, 0.6)';
            el.style.padding = '6px 14px';
            el.style.borderRadius = '18px';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '12px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.gap = '5px';
            el.style.whiteSpace = 'nowrap';
            el.innerHTML = `<span>🏡</span> <span>${d.username}</span>`;
            el.onclick = () => {
              setSelectedHouse(d);
              globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.35 }, 800);
            };
          } else if (d.isCenterLabel) {
            el.style.background = 'rgba(15, 23, 42, 0.9)';
            el.style.color = '#f8fafc';
            el.style.border = '2px solid #38bdf8';
            el.style.padding = '5px 12px';
            el.style.borderRadius = '20px';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '12px';
            el.innerHTML = `<span>${d.flag}</span> <span>${d.name}</span>`;
          } else {
            el.style.background = 'rgba(255, 255, 255, 0.95)';
            el.style.color = '#1e293b';
            el.style.border = '1px solid #cbd5e1';
            el.style.padding = '6px 12px';
            el.style.borderRadius = '20px';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '12px';
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            el.innerHTML = `<span>${d.flag}</span> <span>${d.name}</span> <span style="color: #0284c7; font-weight: bold;">(${d.count})</span> 🏠`;
            el.onclick = () => handleCountryClick(d);
          }

          return el;
        }}
      />
    </div>
  );
}
