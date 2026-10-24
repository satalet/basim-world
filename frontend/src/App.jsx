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
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [founderModalOpen, setFounderModalOpen] = useState(false);

  // حالات لوحة تحكم باسم
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newCountry, setNewCountry] = useState('فلسطين');
  const [adminLoading, setAdminLoading] = useState(false);

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
        globeRef.current.pointOfView({ lat: 31.9522, lng: 35.2332, altitude: 1.6 }, 2200);
      }, 800);
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.35;
    }
  }, []);

  const totalHouses = places.reduce((acc, p) => acc + (p.count || 0), 0);
  const allMarkers = [...places, FOUNDER_HOUSE];

  // فتح تفاصيل الدولة والمشاركين المعتمدين فيها
  const handleCountryClick = (place) => {
    setSelectedPlace(place);
    globeRef.current?.pointOfView({ lat: place.lat, lng: place.lng, altitude: 1.5 }, 1200);
  };

  // تسجيل دخول لوحة تحكم باسم
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

  // إضافة شخص جديد بواسطة باسم
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
        alert(`تم اعتماد وإضافة ${newUsername} في ${newCountry} بنجاح!`);
      }
    } catch (err) {
      alert('فشل إضافة المشارك');
    } finally {
      setAdminLoading(false);
    }
  };

  // حذف شخص بواسطة باسم
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

  // تصفية المشاركين للدولة المختارة
  const currentCountryHouses = selectedPlace ? allHouses.filter(h => h.country === selectedPlace.name) : [];

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* العداد العلوي */}
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', padding: '10px 20px',
        borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        fontWeight: 'bold', fontSize: '15px', color: '#1e293b'
      }}>
        🌍 عالمنا | إجمالي المشاركين: <span style={{ color: '#0284c7' }}>{totalHouses}</span> 🏠
      </div>

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

      {/* زر دخول الإدارة السريع لباسم */}
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

      {/* نافذة عرض بيوت ومشاركي الدولة المختارة */}
      {selectedPlace && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.65)', zIndex: 30, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '26px', borderRadius: '20px',
            maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 15px 35px rgba(0,0,0,0.3)', position: 'relative'
          }}>
            <button
              onClick={() => setSelectedPlace(null)}
              style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>

            <div style={{ fontSize: '42px', marginBottom: '8px' }}>{selectedPlace.flag}</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>بيوت {selectedPlace.name}</h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>
              المعتمدين رسمياً من قِبل <strong style={{ color: '#0284c7' }}>باسم</strong> ({currentCountryHouses.length})
            </p>

            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentCountryHouses.length === 0 ? (
                <div style={{ padding: '25px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8', fontSize: '13px' }}>
                  لا يوجد مشاركين مضافين بعد في هذه الدولة.<br />يتم الاعتماد والإضافة حصرياً عبر باسم.
                </div>
              ) : (
                currentCountryHouses.map((h) => (
                  <div key={h.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: '#f1f5f9', borderRadius: '10px'
                  }}>
                    <span style={{ fontWeight: 'bold', color: '#1e293b' }}>🏡 {h.username}</span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>معتمد ✓</span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedPlace(null)}
              style={{
                marginTop: '18px', background: '#0f172a', color: 'white',
                border: 'none', padding: '10px 24px', borderRadius: '10px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل المؤسس باسم */}
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
              صاحب الفكرة ومطور منصة "عالمنا". منصة خاصة توثق بيوت الداعمين والمشاركين الحقيقيين على خريطة حية ثلاثية الأبعاد بإشرافه المباشر.
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

      {/* لوحة تحكم المؤسس باسم الخاصة */}
      {adminModalOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.8)', zIndex: 40, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '18px',
            width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 15px 40px rgba(0,0,0,0.4)', position: 'relative'
          }}>
            <button
              onClick={() => setAdminModalOpen(false)}
              style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>

            {!isAdminAuth ? (
              <form onSubmit={handleAdminLogin} style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛡️</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>لوحة تحكم وإدارة باسم</h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>أدخل كلمة السر الخاصة بك لإضافة وإدارة المشاركين</p>
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
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>إضافة مشارك جديد ➕</h3>
                <form onSubmit={handleAddPerson} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
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
                    {adminLoading ? 'جاري الإضافة...' : 'اعتماد وإضافة البيت 🏡'}
                  </button>
                </form>

                <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>المشاركون المسجلون ({allHouses.length})</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allHouses.map((h) => (
                    <div key={h.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px'
                    }}>
                      <div>
                        <strong style={{ color: '#1e293b' }}>{h.username}</strong>
                        <span style={{ color: '#64748b', fontSize: '12px', marginRight: '6px' }}>({h.country})</span>
                      </div>
                      <button
                        onClick={() => handleDeleteHouse(h)}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        حذف
                      </button>
                    </div>
                  ))}
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
        htmlElementsData={allMarkers}
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
              globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.4 }, 1200);
              setFounderModalOpen(true);
            };
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
