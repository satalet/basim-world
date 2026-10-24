import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';

const API_URL = '';

const FOUNDER_HOUSE = {
  id: 'founder_basim',
  name: 'مقر المؤسس: باسم',
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

  // حالة التعديل
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
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
      setTimeout(() => {
        globeRef.current.pointOfView({ lat: 31.9522, lng: 35.2332, altitude: 1.8 }, 2000);
      }, 600);
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
      globeRef.current.pointOfView({ lat: place.lat, lng: place.lng, altitude: 0.55 }, 1600);
    }
  };

  const handleResetView = () => {
    setSelectedCountry(null);
    setSelectedHouse(null);

    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.pointOfView({ lat: 25, lng: 35, altitude: 2.0 }, 1500);
    }
  };

  const getDisplayMarkers = () => {
    if (!selectedCountry) {
      return [...places, FOUNDER_HOUSE];
    }

    const countryHouses = allHouses.filter(h => h.country === selectedCountry.name);

    const individualHouseMarkers = countryHouses.map((house, idx) => {
      const radius = 0.3 + (idx * 0.16);
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

  const activeCountryHousesCount = selectedCountry 
    ? allHouses.filter(h => h.country === selectedCountry.name).length 
    : 0;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* العداد العلوي */}
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', padding: '10px 20px',
        borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        fontWeight: 'bold', fontSize: '15px', color: '#1e293b'
      }}>
        🌍 عالمنا | إجمالي البيوت المعتمدة: <span style={{ color: '#0284c7' }}>{totalHouses}</span> 🏠
      </div>

      {/* زر العودة للمشهد العام */}
      {selectedCountry && (
        <button
          onClick={handleResetView}
          style={{
            position: 'absolute', top: 20, right: 20, zIndex: 15,
            background: '#0f172a', color: '#f8fafc', border: '1px solid #38bdf8',
            padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold',
            fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <span>⬅️</span>
          <span>العودة للمشهد العام</span>
        </button>
      )}

      {/* اسم الدولة الحالية */}
      {selectedCountry && (
        <div style={{
          position: 'absolute', top: 75, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          color: '#ffffff', padding: '8px 22px', borderRadius: '25px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: 'bold'
        }}>
          {selectedCountry.flag} بيوت {selectedCountry.name} ({activeCountryHousesCount}) 🏡
        </div>
      )}

      {/* شريط المؤسس باسم */}
      <div 
        onClick={() => {
          globeRef.current?.pointOfView({ lat: 31.9522, lng: 35.2332, altitude: 1.5 }, 1200);
          setFounderModalOpen(true);
        }}
        style={{
          position: 'absolute', bottom: 25, left: 25, zIndex: 10,
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid #eab308',
          padding: '10px 20px', borderRadius: '25px',
          boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)', fontSize: '13px',
          color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer'
        }}
      >
        👑 فكرة وتطوير المؤسس: <span style={{ color: '#facc15' }}>باسم | Basim</span>
      </div>

      {/* زر لوحة إدارة باسم */}
      <button
        onClick={() => setAdminModalOpen(true)}
        style={{
          position: 'absolute', bottom: 25, right: 25, zIndex: 10,
          background: '#0f172a', color: '#facc15', border: '1px solid #facc15',
          padding: '10px 18px', borderRadius: '30px', fontWeight: 'bold',
          fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}
      >
        🛡️ لوحة إدارة باسم
      </button>

      {/* نافذة تفاصيل البيت الفردي */}
      {selectedHouse && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.65)', zIndex: 35, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '26px', borderRadius: '22px',
            maxWidth: '360px', width: '100%', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '2px solid #38bdf8', position: 'relative'
          }}>
            <button
              onClick={() => setSelectedHouse(null)}
              style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>

            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏡</div>
            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '20px' }}>{selectedHouse.username}</h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>
              مالك البيت في <strong>{selectedHouse.country}</strong>
            </p>

            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px',
              padding: '14px', textAlign: 'right', fontSize: '12px', lineHeight: '1.7', color: '#334155', marginBottom: '16px'
            }}>
              <div>✓ <strong>حالة الاعتماد:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>معتمد وموثق</span></div>
              <div>📅 <strong>تاريخ البناء:</strong> {new Date(selectedHouse.createdAt).toLocaleDateString('ar')}</div>
              <div>👑 <strong>إشراف المؤسس:</strong> باسم | Basim</div>
            </div>

            <button
              onClick={() => setSelectedHouse(null)}
              style={{
                background: '#0f172a', color: 'white', border: 'none',
                padding: '10px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%'
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
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '28px', borderRadius: '20px',
            maxWidth: '350px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            border: '2px solid #facc15'
          }}>
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>👑 🇵🇸</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>مقر المؤسس: باسم</h3>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
              صاحب الفكرة ومطور منصة "عالمنا". منصة توثق بيوت المشاركين الحقيقيين على الكرة الأرضية ثلاثية الأبعاد بإشرافه واعتماده المباشر.
            </p>
            <button
              onClick={() => setFounderModalOpen(false)}
              style={{
                marginTop: '15px', background: '#0f172a', color: '#facc15',
                border: 'none', padding: '10px 24px', borderRadius: '12px',
                fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* لوحة تحكم وإدارة باسم مع ميزة التعديل والحذف */}
      {adminModalOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.8)', zIndex: 40, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '18px',
            width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 15px 40px rgba(0,0,0,0.4)', position: 'relative'
          }}>
            <button
              onClick={() => { setAdminModalOpen(false); setEditingHouseId(null); }}
              style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>

            {!isAdminAuth ? (
              <form onSubmit={handleAdminLogin} style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛡️</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>لوحة إدارة باسم</h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>أدخل كلمة السر لإضافة وتعديل وحذف البيوت</p>
                <input
                  type="password"
                  required
                  placeholder="كلمة السر..."
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  style={{ width: '80%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '14px', fontSize: '15px' }}
                />
                <br />
                <button
                  type="submit"
                  disabled={adminLoading}
                  style={{ background: '#0f172a', color: '#facc15', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {adminLoading ? 'جاري التحقق...' : 'دخول اللوحة 🔐'}
                </button>
              </form>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>إضافة بيت مشارك جديد ➕</h3>
                <form onSubmit={handleAddPerson} style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>اسم الشخص أو حسابه:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: @ahmed"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>الدولة:</label>
                    <select
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      {places.map((p) => (
                        <option key={p.id} value={p.name}>{p.flag} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={adminLoading}
                    style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {adminLoading ? 'جاري البناء...' : 'اعتماد وبناء البيت 🏡'}
                  </button>
                </form>

                <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>إدارة البيوت المسجلة ({allHouses.length})</h4>
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allHouses.map((h) => (
                    <div key={h.id} style={{
                      padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0'
                    }}>
                      {editingHouseId === h.id ? (
                        /* وضع التعديل المباشر */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #0284c7' }}
                          />
                          <select
                            value={editCountry}
                            onChange={(e) => setEditCountry(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #0284c7' }}
                          >
                            {places.map((p) => (
                              <option key={p.id} value={p.name}>{p.flag} {p.name}</option>
                            ))}
                          </select>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleSaveEdit(h.id)}
                              style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                            >
                              حفظ التعديل ✓
                            </button>
                            <button
                              onClick={() => setEditingHouseId(null)}
                              style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* وضع العرض العادي مع أزرار التعديل والحذف */
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <strong style={{ color: '#1e293b' }}>🏡 {h.username}</strong>
                            <span style={{ color: '#64748b', fontSize: '12px', marginRight: '6px' }}>({h.country})</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => startEdit(h)}
                              style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              تعديل ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteHouse(h)}
                              style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              حذف 🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* الكرة الأرضية */}
      <Globe
        ref={globeRef}
        backgroundColor="#d8edf7"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        htmlElementsData={getDisplayMarkers()}
        htmlElement={(d) => {
          const el = document.createElement('div');
          el.className = 'marker-label';
          el.style.cursor = 'pointer';

          if (d.isFounder) {
            el.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            el.style.color = '#ffffff';
            el.style.border = '2px solid #ffffff';
            el.style.boxShadow = '0 0 20px #f59e0b, 0 0 35px #fbbf24';
            el.style.padding = '6px 14px';
            el.style.borderRadius = '20px';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '13px';
            el.innerHTML = `<span>👑</span> <span>${d.name}</span>`;
            el.onclick = () => {
              globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.8 }, 1200);
              setFounderModalOpen(true);
            };
          } else if (d.isHouse) {
            el.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
            el.style.color = '#ffffff';
            el.style.border = '2px solid #bae6fd';
            el.style.boxShadow = '0 0 16px rgba(2, 132, 199, 0.8)';
            el.style.padding = '5px 12px';
            el.style.borderRadius = '16px';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '12px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.gap = '5px';
            el.style.whiteSpace = 'nowrap';
            el.innerHTML = `<span>🏡</span> <span>${d.username}</span>`;
            el.onclick = () => {
              setSelectedHouse(d);
              globeRef.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.38 }, 800);
            };
          } else if (d.isCenterLabel) {
            el.style.background = 'rgba(15, 23, 42, 0.85)';
            el.style.color = '#f8fafc';
            el.style.border = '1px solid #94a3b8';
            el.style.padding = '5px 12px';
            el.style.borderRadius = '20px';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '12px';
            el.innerHTML = `<span>${d.flag}</span> <span>${d.name}</span>`;
          } else {
            el.onclick = () => handleCountryClick(d);
            el.innerHTML = `<span>${d.flag}</span> <span>${d.name}</span> <span style="color: #0284c7; font-weight: bold;">(${d.count})</span> 🏠`;
          }
          return el;
        }}
      />
    </div>
  );
}
