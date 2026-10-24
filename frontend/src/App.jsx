import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';

const API_URL = '';

const FOUNDER_HOUSE = {
  id: 'founder_basim',
  name: 'المؤسس: باسم',
  flag: '👑',
  lat: 32.2211,
  lng: 35.2544,
  isFounder: true
};

export default function App() {
  const globeRef = useRef();
  const [places, setPlaces] = useState([]);
  const [allHouses, setAllHouses] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [founderModalOpen, setFounderModalOpen] = useState(false);

  // لوحة تحكم باسم
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newCountry, setNewCountry] = useState('فلسطين');
  const [adminLoading, setAdminLoading] = useState(false);

  // حالة البحث والتعديل
  const [searchTerm, setSearchTerm] = useState('');
  const [editingHouseId, setEditingHouseId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editCountry, setEditCountry] = useState('');

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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
      // إحداثيات المشهد الابتدائي مخصصة للجوال والكمبيوتر
      const targetAltitude = isMobile ? 2.3 : 1.8;
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.8 });
      setTimeout(() => {
        globeRef.current.pointOfView({ lat: 26.5, lng: 35.0, altitude: targetAltitude }, 1800);
      }, 500);
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.35;
    }
  }, []);

  const totalHouses = allHouses.length;

  const handleCountryClick = (place) => {
    setSelectedCountry(place);
    setSelectedHouse(null);

    if (globeRef.current) {
      globeRef.current.controls().autoRotate = false;
      const zoomAltitude = isMobile ? 0.65 : 0.45;
      globeRef.current.pointOfView({ lat: place.lat, lng: place.lng, altitude: zoomAltitude }, 1400);
    }
  };

  const handleResetView = () => {
    setSelectedCountry(null);
    setSelectedHouse(null);

    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      const resetAltitude = isMobile ? 2.3 : 2.0;
      globeRef.current.pointOfView({ lat: 26.5, lng: 35.0, altitude: resetAltitude }, 1400);
    }
  };

  const getDisplayMarkers = () => {
    if (!selectedCountry) {
      return [...places, FOUNDER_HOUSE];
    }

    const countryHouses = allHouses.filter(h => h.country === selectedCountry.name);

    const individualHouseMarkers = countryHouses.map((house, idx) => {
      const radius = isMobile ? (0.4 + idx * 0.22) : (0.35 + idx * 0.18);
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
        alert(`تم اعتماد وإضافة بيت ${newUsername} في ${newCountry} بنجاح!`);
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

  const activeCountryHousesCount = selectedCountry 
    ? allHouses.filter(h => h.country === selectedCountry.name).length 
    : 0;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        /* تنسيقات الشاشات الصغيرة والتلفونات */
        .globe-marker {
          pointer-events: auto !important;
          cursor: pointer !important;
          user-select: none;
          touch-action: manipulation;
          transition: transform 0.15s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .marker-country {
          background: rgba(255, 255, 255, 0.95);
          color: #1e293b;
          border: 1px solid #cbd5e1;
          padding: 4px 10px;
          border-radius: 18px;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .marker-founder {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #ffffff;
          border: 1.5px solid #ffffff;
          padding: 5px 12px;
          border-radius: 18px;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.8);
        }
        .marker-house {
          background: linear-gradient(135deg, #0284c7, #0369a1);
          color: #ffffff;
          border: 1.5px solid #ffffff;
          padding: 5px 12px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: bold;
          box-shadow: 0 0 14px rgba(2, 132, 199, 0.8);
        }

        @media (max-width: 768px) {
          .marker-country {
            padding: 2.5px 7px !important;
            font-size: 10px !important;
            border-radius: 14px !important;
          }
          .marker-founder {
            padding: 3px 8px !important;
            font-size: 10px !important;
            border-radius: 14px !important;
          }
          .marker-house {
            padding: 3px 8px !important;
            font-size: 10px !important;
            border-radius: 14px !important;
          }
        }
      `}</style>

      {/* العداد العلوي المتجاوب */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', padding: isMobile ? '6px 14px' : '10px 20px',
        borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px', color: '#1e293b'
      }}>
        🌍 عالمنا | البيوت: <span style={{ color: '#0284c7' }}>{totalHouses}</span> 🏠
      </div>

      {/* زر العودة للمشهد العام */}
      {selectedCountry && (
        <button
          onClick={handleResetView}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 25,
            background: '#0f172a', color: '#f8fafc', border: '1px solid #38bdf8',
            padding: isMobile ? '6px 14px' : '10px 20px', borderRadius: '30px', fontWeight: 'bold',
            fontSize: isMobile ? '12px' : '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <span>⬅️</span>
          <span>الرجوع</span>
        </button>
      )}

      {/* شريط معلومات الدولة الحالية */}
      {selectedCountry && (
        <div style={{
          position: 'absolute', top: isMobile ? 55 : 75, left: '50%', transform: 'translateX(-50%)', zIndex: 15,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
          color: '#ffffff', padding: isMobile ? '6px 16px' : '8px 22px', borderRadius: '25px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.25)', fontSize: isMobile ? '12px' : '14px', fontWeight: 'bold',
          border: '1px solid #38bdf8', whiteSpace: 'nowrap'
        }}>
          {selectedCountry.flag} بيوت {selectedCountry.name} ({activeCountryHousesCount}) 🏡
        </div>
      )}

      {/* الشريط السفلي الموحد (المؤسس + لوحة الإدارة) متجاوب للجوال 100% */}
      <div style={{
        position: 'absolute', bottom: isMobile ? 12 : 20, left: 12, right: 12, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
        maxWidth: '1200px', margin: '0 auto'
      }}>
        {/* شريط المؤسس باسم */}
        <div 
          onClick={() => {
            globeRef.current?.pointOfView({ lat: 31.9522, lng: 35.2332, altitude: 1.5 }, 1200);
            setFounderModalOpen(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid #eab308',
            padding: isMobile ? '8px 14px' : '10px 18px', borderRadius: '25px',
            boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)', fontSize: isMobile ? '11px' : '13px',
            color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          👑 المؤسس: <span style={{ color: '#facc15' }}>باسم | Basim</span>
        </div>

        {/* زر لوحة إدارة باسم */}
        <button
          onClick={() => setAdminModalOpen(true)}
          style={{
            background: '#0f172a', color: '#facc15', border: '1px solid #facc15',
            padding: isMobile ? '8px 14px' : '10px 18px', borderRadius: '25px', fontWeight: 'bold',
            fontSize: isMobile ? '11px' : '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap'
          }}
        >
          🛡️ لوحة الإدارة
        </button>
      </div>

      {/* نافذة تفاصيل البيت الفردي */}
      {selectedHouse && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.65)', zIndex: 35, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '20px',
            maxWidth: '340px', width: '100%', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '2px solid #38bdf8', position: 'relative'
          }}>
            <button
              onClick={() => setSelectedHouse(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>

            <div style={{ fontSize: '42px', marginBottom: '6px' }}>🏡</div>
            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '18px' }}>{selectedHouse.username}</h3>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 14px 0' }}>
              مالك البيت في <strong>{selectedHouse.country}</strong>
            </p>

            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
              padding: '12px', textAlign: 'right', fontSize: '11px', lineHeight: '1.7', color: '#334155', marginBottom: '14px'
            }}>
              <div>✓ <strong>حالة الاعتماد:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>معتمد وموثق</span></div>
              <div>📅 <strong>تاريخ البناء:</strong> {new Date(selectedHouse.createdAt).toLocaleDateString('ar')}</div>
              <div>👑 <strong>إشراف المؤسس:</strong> باسم | Basim</div>
            </div>

            <button
              onClick={() => setSelectedHouse(null)}
              style={{
                background: '#0f172a', color: 'white', border: 'none',
                padding: '9px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px'
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* تفاصيل المؤسس */}
      {founderModalOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 30, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '20px',
            maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            border: '2px solid #facc15'
          }}>
            <div style={{ fontSize: '38px', marginBottom: '8px' }}>👑 🇵🇸</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '18px' }}>مقر المؤسس: باسم</h3>
            <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
              صاحب الفكرة ومطور منصة "عالمنا". منصة توثق بيوت المشاركين الحقيقيين على الكرة الأرضية ثلاثية الأبعاد بإشرافه واعتماده المباشر.
            </p>
            <button
              onClick={() => setFounderModalOpen(false)}
              style={{
                marginTop: '12px', background: '#0f172a', color: '#facc15',
                border: 'none', padding: '8px 20px', borderRadius: '10px',
                fontWeight: 'bold', cursor: 'pointer', fontSize: '12px'
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
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.8)', zIndex: 40, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '15px'
        }}>
          <div style={{
            background: 'white', padding: '20px', borderRadius: '16px',
            width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 15px 40px rgba(0,0,0,0.4)', position: 'relative'
          }}>
            <button
              onClick={() => { setAdminModalOpen(false); setEditingHouseId(null); setSearchTerm(''); }}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>

            {!isAdminAuth ? (
              <form onSubmit={handleAdminLogin} style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '34px', marginBottom: '6px' }}>🛡️</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '17px' }}>لوحة إدارة باسم</h3>
                <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '14px' }}>أدخل كلمة السر لإضافة وتعديل وحذف البيوت</p>
                <input
                  type="password"
                  required
                  placeholder="كلمة السر..."
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  style={{ width: '85%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px', fontSize: '14px' }}
                />
                <br />
                <button
                  type="submit"
                  disabled={adminLoading}
                  style={{ background: '#0f172a', color: '#facc15', border: 'none', padding: '9px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                >
                  {adminLoading ? 'جاري التحقق...' : 'دخول اللوحة 🔐'}
                </button>
              </form>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '16px' }}>إضافة بيت مشارك جديد ➕</h3>
                <form onSubmit={handleAddPerson} style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>اسم الشخص أو حسابه:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: @ahmed"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>الدولة:</label>
                    <select
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      {places.map((p) => (
                        <option key={p.id} value={p.name}>{p.flag} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={adminLoading}
                    style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                  >
                    {adminLoading ? 'جاري البناء...' : 'اعتماد وبناء البيت 🏡'}
                  </button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#0f172a', fontSize: '14px' }}>البيوت المسجلة ({allHouses.length})</h4>
                  {searchTerm && (
                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 'bold' }}>
                      (المطابق: {filteredHouses.length})
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="🔍 ابحث عن اسم أو دولة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: '6px',
                    border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '12px'
                  }}
                />

                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredHouses.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '12px' }}>
                      {allHouses.length === 0 ? 'لا يوجد بيوت مضافة بعد.' : 'لا توجد نتائج مطابقة.'}
                    </div>
                  ) : (
                    filteredHouses.map((h) => (
                      <div key={h.id} style={{
                        padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'
                      }}>
                        {editingHouseId === h.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #0284c7', fontSize: '12px' }}
                            />
                            <select
                              value={editCountry}
                              onChange={(e) => setEditCountry(e.target.value)}
                              style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #0284c7', fontSize: '12px' }}
                            >
                              {places.map((p) => (
                                <option key={p.id} value={p.name}>{p.flag} {p.name}</option>
                              ))}
                            </select>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleSaveEdit(h.id)}
                                style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '5px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}
                              >
                                حفظ ✓
                              </button>
                              <button
                                onClick={() => setEditingHouseId(null)}
                                style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <strong style={{ color: '#1e293b', fontSize: '12px' }}>🏡 {h.username}</strong>
                              <span style={{ color: '#64748b', fontSize: '11px', marginRight: '4px' }}>({h.country})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleJumpToHouse(h)}
                                title="عرض على الخريطة"
                                style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '3px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                📍
                              </button>
                              <button
                                onClick={() => startEdit(h)}
                                style={{ background: '#f1f5f9', color: '#0284c7', border: '1px solid #cbd5e1', padding: '3px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteHouse(h)}
                                style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '3px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
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

      {/* الكرة الأرضية ثلاثية الأبعاد */}
      <Globe
        ref={globeRef}
        backgroundColor="#d8edf7"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        htmlElementsData={getDisplayMarkers()}
        htmlElement={(d) => {
          const el = document.createElement('div');
          el.className = 'globe-marker';

          const triggerAction = (e) => {
            e.stopPropagation();
            if (d.isFounder) {
              globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: isMobile ? 1.0 : 0.8 }, 1200);
              setFounderModalOpen(true);
            } else if (d.isHouse) {
              setSelectedHouse(d);
              globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: isMobile ? 0.45 : 0.35 }, 800);
            } else if (!d.isCenterLabel) {
              handleCountryClick(d);
            }
          };

          el.onclick = triggerAction;
          el.ontouchend = triggerAction;

          // 1. بيت المؤسس باسم
          if (d.isFounder) {
            el.className += ' marker-founder';
            el.innerHTML = `<span>👑</span> <span>${d.name}</span>`;
          } 
          // 2. بيوت المشاركين الفردية
          else if (d.isHouse) {
            el.className += ' marker-house';
            el.innerHTML = `<span>🏡</span> <span>${d.username}</span>`;
          } 
          // 3. شارة مركز الدولة عند فتحها
          else if (d.isCenterLabel) {
            el.className += ' marker-country';
            el.style.background = '#0f172a';
            el.style.color = '#38bdf8';
            el.style.borderColor = '#38bdf8';
            el.innerHTML = `<span>${d.flag}</span> <span>${d.name}</span>`;
          } 
          // 4. الدول في المشهد العام
          else {
            el.className += ' marker-country';
            el.innerHTML = `<span>${d.flag}</span> <span>${d.name}</span> <span style="color: #0284c7; font-weight: bold;">(${d.count})</span> 🏠`;
          }
          return el;
        }}
      />
    </div>
  );
}
