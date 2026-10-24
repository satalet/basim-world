import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';

const API_URL = '';

// علامة بيت المؤسس باسم زربا الدائمة
const FOUNDER_HOUSE = {
  id: 'founder_basim',
  name: 'بيت المؤسس: باسم زربا',
  flag: '👑',
  lat: 32.2211, // موقع مميز فوق فلسطين
  lng: 35.2544,
  isFounder: true
};

export default function App() {
  const globeRef = useRef();
  const [places, setPlaces] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [founderModalOpen, setFounderModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('فلسطين');
  const [loading, setLoading] = useState(false);

  const fetchPlaces = async () => {
    try {
      const res = await fetch(`${API_URL}/api/places`);
      const data = await res.json();
      if (data.success) {
        setPlaces(data.places);
      }
    } catch (err) {
      console.error('خطأ في جلب البيانات:', err);
    }
  };

  useEffect(() => {
    fetchPlaces();

    if (globeRef.current) {
      // دوران سينمائي ثم تركيز فوري على بيت المؤسس باسم زربا
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

  const handleAddHouse = async (e) => {
    e.preventDefault();
    if (!username.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/houses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, country: selectedCountry })
      });
      const data = await res.json();

      if (data.success) {
        setPlaces(data.places);
        const target = data.places.find((p) => p.name === selectedCountry);
        if (target && globeRef.current) {
          globeRef.current.pointOfView({ lat: target.lat, lng: target.lng, altitude: 1.5 }, 1200);
        }
        setUsername('');
        setModalOpen(false);
      }
    } catch (err) {
      alert('فشل الاتصال بالخادم!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* العداد العلوي */}
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', padding: '10px 20px',
        borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        fontWeight: 'bold', fontSize: '15px', color: '#1e293b'
      }}>
        🌍 عالمنا | إجمالي البيوت: <span style={{ color: '#0284c7' }}>{totalHouses}</span> 🏠
      </div>

      {/* توقيع وبصمة باسم زربا */}
      <div 
        onClick={() => {
          globeRef.current?.pointOfView({ lat: 31.9522, lng: 35.2332, altitude: 1.5 }, 1200);
          setFounderModalOpen(true);
        }}
        style={{
          position: 'absolute', bottom: 25, left: 25, zIndex: 10,
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid #eab308',
          padding: '10px 18px', borderRadius: '25px',
          boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)', fontSize: '13px',
          color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer'
        }}
      >
        👑 فكرة وتطوير المؤسس: <span style={{ color: '#facc15' }}>باسم زربا | Basim Zerba</span>
      </div>

      {/* زر إضافة بيت */}
      <button
        onClick={() => setModalOpen(true)}
        style={{
          position: 'absolute', bottom: 25, right: 25, zIndex: 10,
          background: '#ff4757', color: 'white', border: 'none',
          padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold',
          fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,71,87,0.4)'
        }}
      >
        ➕ ابنِ بيتك في دولتك
      </button>

      {/* نافذة تفاصيل المؤسس */}
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
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>مقر المؤسس: باسم زربا</h3>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
              صاحب الفكرة ومطور منصة "عالمنا" التفاعلية ثلاثية الأبعاد. انطلقت الفكرة لتوثيق وترابط بيوت الوطن العربي على خريطة حية واحدة.
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

      {/* نافذة إضافة بيت جديد */}
      {modalOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.4)', zIndex: 20, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <form onSubmit={handleAddHouse} style={{
            background: 'white', padding: '24px', borderRadius: '16px',
            width: '320px', display: 'flex', flexDirection: 'column', gap: '14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: 0, textAlign: 'center', color: '#333' }}>أضف بيتك على الخريطة 🏡</h3>
            <div>
              <label style={{ fontSize: '13px', color: '#666' }}>اسم المستخدم / الحساب:</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username"
                style={{ width: '100%', padding: '8px 12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#666' }}>اختر دولتك:</label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                {places.map((p) => (
                  <option key={p.id} value={p.name}>{p.flag} {p.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {loading ? 'جاري البناء...' : 'تأكيد وبناء 🚀'}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                إلغاء
              </button>
            </div>
          </form>
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
            // تصميم بيت المؤسس الذهبي المتوهج
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
            // تصميم بقية الدول العادية
            el.onclick = () => {
              globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1200);
            };
            el.innerHTML = `<span>${d.flag}</span> <span>${d.name}</span> <span style="color: #0284c7; font-weight: bold;">(${d.count})</span> 🏠`;
          }
          return el;
        }}
      />
    </div>
  );
}
